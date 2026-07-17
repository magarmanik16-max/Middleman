import crypto from 'crypto';
import Workspace from '../models/Workspace.js';
import ActivityLog from '../models/ActivityLog.js';
import { proxmoxService } from './proxmoxService.js';
import { logger } from '../utils/logger.js';

class WorkspaceService {
  /** Derive the SSH username from the user's email.
   *  e.g. "manik.magar@timesglobal.com.np" -> "manik" */
  deriveUsername(email) {
    if (!email) return 'devuser';
    const localPart = email.split('@')[0];
    // Take the first segment before any dot
    return localPart.split('.')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || 'devuser';
  }

  async createWorkspace(userId, workspaceData) {
    try {
      // Check if user can create more workspaces
      const canCreate = await Workspace.canCreateWorkspace(userId);
      if (!canCreate) {
        throw new Error('Workspace limit reached');
      }

      // Derive SSH username from user email
      const sshUsername = this.deriveUsername(workspaceData.email || 'devuser');

      // Auto-generate a default SSH password if none provided
      const sshPassword = workspaceData.sshPassword || this.generatePassword();

      // Create workspace record
      const workspace = new Workspace({
        userId,
        name: workspaceData.name,
        description: workspaceData.description,
        resources: workspaceData.resources || {},
        sshUsername,
        sshPassword
      });

      await workspace.save();

      // Log activity
      await this.logActivity(userId, 'WORKSPACE_CREATE', 'workspace', workspace._id, {
        name: workspace.name,
        resources: workspace.resources
      });

      // Start Proxmox container creation in background
      this.provisionContainer(workspace._id, workspace.resources).catch(error => {
        logger.error('Background container provisioning failed:', error);
      });

      return workspace;
    } catch (error) {
      logger.error('Error creating workspace:', error);
      throw error;
    }
  }

  async provisionContainer(workspaceId, resources) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) throw new Error('Workspace not found');

      // Create container in Proxmox (createContainer assigns a static IP,
      // uploads a hook script + creds file to create the sudo user on start)
      const container = await proxmoxService.createContainer(
        workspace.userId, resources, workspace.sshUsername, workspace.sshPassword
      );

      // Update workspace with Proxmox details, static IP, and root password
      workspace.proxmoxId = container.vmid;
      workspace.status = 'running';
      workspace.ip = container.ip;
      workspace.rootPassword = container.rootPassword;
      workspace.lastError = undefined;
      await workspace.save();

      logger.info(`Container ${container.vmid} provisioned for workspace ${workspaceId}, IP=${container.ip}`);
    } catch (error) {
      logger.error('Error provisioning container:', error);

      // Record the failure on the workspace so the UI can surface it
      await Workspace.findByIdAndUpdate(workspaceId, {
        status: 'error',
        lastError: error.message
      });
      throw error;
    }
  }

  async retryProvisioning(workspaceId, userId) {
    const workspace = await this.getWorkspaceById(workspaceId, userId);
    if (workspace.proxmoxId) {
      // A container already exists; just sync status/IP
      const status = await proxmoxService.getContainerStatus(workspace.proxmoxId);
      const ip = await proxmoxService.getContainerIP(workspace.proxmoxId);
      workspace.status = status === 'running' ? 'running' : (status || 'stopped');
      if (ip) workspace.ip = ip;
      workspace.lastError = undefined;
      await workspace.save();
      return workspace;
    }
    workspace.status = 'creating';
    workspace.lastError = undefined;
    await workspace.save();
    this.provisionContainer(workspace._id, workspace.resources).catch(() => {});
    return workspace;
  }

  async getUserWorkspaces(userId) {
    try {
      const workspaces = await Workspace.find({ userId }).sort({ createdAt: -1 });

      // Fire-and-forget status sync: check actual container status from Proxmox
      // for each workspace that has a container. The list returns immediately;
      // updates happen asynchronously so the next poll picks them up.
      for (const ws of workspaces) {
        if (ws.proxmoxId && !['creating', 'deleting'].includes(ws.status)) {
          proxmoxService.getContainerStatus(ws.proxmoxId)
            .then(realStatus => {
              const normalized = realStatus === 'running' ? 'running' : 'stopped';
              if (normalized !== ws.status) {
                ws.status = normalized;
                ws.save().catch(() => {});
                logger.info(`Workspace ${ws._id}: list sync changed status to ${normalized}`);
              }
            })
            .catch(() => {
              // Proxmox unreachable — skip silently
            });
        }
      }

      return workspaces;
    } catch (error) {
      logger.error('Error getting user workspaces:', error);
      throw error;
    }
  }

  async getWorkspaceById(workspaceId, userId) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Check ownership or admin role
      if (workspace.userId.toString() !== userId.toString()) {
        throw new Error('Not authorized to access this workspace');
      }

      // Real-time status sync: check the actual container status from Proxmox
      // and update the DB if it changed externally (e.g. shutdown now from inside).
      if (workspace.proxmoxId && !['creating', 'deleting'].includes(workspace.status)) {
        try {
          const realStatus = await proxmoxService.getContainerStatus(workspace.proxmoxId);
          const normalizedStatus = realStatus === 'running' ? 'running' : 'stopped';
          if (normalizedStatus !== workspace.status) {
            workspace.status = normalizedStatus;
            await workspace.save();
            logger.info(`Workspace ${workspaceId}: synced status to ${normalizedStatus} (was ${workspace.status})`);
          }
        } catch (e) {
          // Proxmox might be unreachable — just log and return DB state
          logger.warn(`Status sync failed for workspace ${workspaceId}: ${e.message.slice(0, 100)}`);
        }
      }

      return workspace;
    } catch (error) {
      logger.error('Error getting workspace:', error);
      throw error;
    }
  }

  async updateWorkspace(workspaceId, userId, updateData) {
    try {
      await this.getWorkspaceById(workspaceId, userId);
      
      // Only allow updating name and description
      const allowedUpdates = ['name', 'description'];
      const updates = {};
      
      for (const field of allowedUpdates) {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      }

      const updatedWorkspace = await Workspace.findByIdAndUpdate(
        workspaceId,
        updates,
        { new: true, runValidators: true }
      );

      // Log activity
      await this.logActivity(userId, 'WORKSPACE_UPDATE', 'workspace', workspaceId, updates);

      return updatedWorkspace;
    } catch (error) {
      logger.error('Error updating workspace:', error);
      throw error;
    }
  }

  async deleteWorkspace(workspaceId, userId) {
    try {
      const workspace = await this.getWorkspaceById(workspaceId, userId);
      
      // Update status to deleting
      workspace.status = 'deleting';
      await workspace.save();

      // Delete from Proxmox if exists (best-effort: don't block DB cleanup)
      if (workspace.proxmoxId) {
        try {
          await proxmoxService.deleteContainer(workspace.proxmoxId);
        } catch (e) {
          logger.error(`Proxmox delete failed for ${workspace.proxmoxId}, proceeding with DB cleanup: ${e.message}`);
        }
      }

      // Delete from database
      await Workspace.findByIdAndDelete(workspaceId);

      // Log activity
      await this.logActivity(userId, 'WORKSPACE_DELETE', 'workspace', workspaceId, {
        name: workspace.name
      });

      return true;
    } catch (error) {
      logger.error('Error deleting workspace:', error);
      throw error;
    }
  }

  async startWorkspace(workspaceId, userId) {
    try {
      const workspace = await this.getWorkspaceById(workspaceId, userId);
      
      if (!workspace.proxmoxId) {
        throw new Error('Container not provisioned yet');
      }

      await proxmoxService.startContainer(workspace.proxmoxId);

      workspace.status = 'running';
      workspace.lastAccessed = new Date();
      // IP is static — no need to refetch; it's already stored in the DB
      await workspace.save();

      // Log activity
      await this.logActivity(userId, 'WORKSPACE_START', 'workspace', workspaceId);

      return workspace;
    } catch (error) {
      logger.error('Error starting workspace:', error);
      throw error;
    }
  }

  async stopWorkspace(workspaceId, userId) {
    try {
      const workspace = await this.getWorkspaceById(workspaceId, userId);
      
      if (!workspace.proxmoxId) {
        throw new Error('Container not provisioned yet');
      }

      await proxmoxService.stopContainer(workspace.proxmoxId);
      
      workspace.status = 'stopped';
      await workspace.save();

      // Log activity
      await this.logActivity(userId, 'WORKSPACE_STOP', 'workspace', workspaceId);

      return workspace;
    } catch (error) {
      logger.error('Error stopping workspace:', error);
      throw error;
    }
  }

  async restartWorkspace(workspaceId, userId) {
    try {
      const workspace = await this.getWorkspaceById(workspaceId, userId);
      
      if (!workspace.proxmoxId) {
        throw new Error('Container not provisioned yet');
      }

      await proxmoxService.restartContainer(workspace.proxmoxId);

      workspace.status = 'running';
      workspace.lastAccessed = new Date();
      // IP is static — no need to refetch; it's already stored in the DB
      await workspace.save();

      // Log activity
      await this.logActivity(userId, 'WORKSPACE_RESTART', 'workspace', workspaceId);

      return workspace;
    } catch (error) {
      logger.error('Error restarting workspace:', error);
      throw error;
    }
  }

  generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const bytes = crypto.randomBytes(16);
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(bytes[i] % chars.length);
    }
    return password;
  }

  async logActivity(userId, action, resource, resourceId, details = {}) {
    try {
      await ActivityLog.create({
        userId,
        action,
        resource,
        resourceId,
        details,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error logging activity:', error);
    }
  }
}

export const workspaceService = new WorkspaceService();