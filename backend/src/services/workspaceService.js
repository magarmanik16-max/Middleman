import crypto from 'crypto';
import Workspace from '../models/Workspace.js';
import ActivityLog from '../models/ActivityLog.js';
import { proxmoxService } from './proxmoxService.js';
import { sshService } from './sshService.js';
import { logger } from '../utils/logger.js';

// Simple mutex — only one container creation at a time to prevent
// VMID / IP collisions under concurrent requests.
let creationLock = Promise.resolve();

// Pool refill mutex — prevent concurrent refill operations
let refillLock = Promise.resolve();
let poolRefillInterval = null;

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

      // Start Proxmox container creation in background (serialized via mutex)
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
    // Serialize container creation to prevent VMID / IP collisions
    const doProvision = async () => {
      try {
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) throw new Error('Workspace not found');

        // Try to grab from pool first
        const poolContainer = await this.claimFromPool(workspace, resources);
        if (poolContainer) {
          return poolContainer;
        }

        // Fallback: clone directly if pool is empty
        logger.info(`Pool empty, falling back to direct clone for workspace ${workspaceId}`);
        return await this.provisionDirect(workspace, resources);
      } catch (error) {
        logger.error('Error provisioning container:', error);

        // Record the failure on the workspace so the UI can surface it
        await Workspace.findByIdAndUpdate(workspaceId, {
          status: 'error',
          lastError: error.message
        });
        throw error;
      }
    };

    // Chain onto the creation lock so only one runs at a time
    const prev = creationLock;
    let release;
    creationLock = new Promise((r) => { release = r; });
    try {
      await prev;
      return await doProvision();
    } finally {
      release();
    }
  }

  /** Claim a pre-provisioned container from the pool. */
  async claimFromPool(workspace, resources) {
    try {
      const poolContainers = await proxmoxService.getPoolContainers();
      if (!poolContainers.length) {
        logger.info('No pool containers available');
        return null;
      }

      // Grab the oldest pool container
      const poolCt = poolContainers[0];
      const vmid = poolCt.vmid;

      logger.info(`Claiming pool container ${vmid} for workspace ${workspace._id}`);

      // Clear any stale proxmoxId from previous failed attempts
      workspace.proxmoxId = undefined;

      // Allocate IP
      const allocated = await proxmoxService.findAvailableIP();
      const hostname = `ws-${workspace.userId}-${Date.now()}`.slice(0, 64);

      // Configure for this workspace
      await proxmoxService.configurePoolContainer(vmid, {
        ip: allocated.ip,
        gateway: allocated.gateway,
        cidr: allocated.cidr,
        cpu: resources.cpu,
        memory: resources.memory,
        disk: resources.disk,
        hostname,
      });

      // Start the container
      await proxmoxService.startContainer(vmid);

      // Wait for it to be running
      const ready = await proxmoxService.waitForContainerRunning(vmid, 60000);
      if (!ready) {
        throw new Error('Container did not start in time');
      }

      // Give SSH daemon a moment
      await new Promise(r => setTimeout(r, 3000));

      // Provision user
      if (sshService.isConfigured) {
        await sshService.provisionClonedContainerUser(
          vmid, workspace.sshUsername, workspace.sshPassword, hostname, allocated.ip
        );
        logger.info(`Pool container ${vmid} provisioned with user ${workspace.sshUsername}`);
      } else {
        logger.warn('SSH not configured — container will only have root access');
      }

      // Update workspace record
      workspace.proxmoxId = vmid;
      workspace.status = 'running';
      workspace.ip = allocated.ip;
      workspace.lastError = undefined;
      await workspace.save();

      logger.info(`Pool container ${vmid} assigned to workspace ${workspace._id}, IP=${allocated.ip}`);
      return workspace;
    } catch (error) {
      logger.warn(`Pool claim failed: ${error.message}`);
      return null;
    }
  }

  /** Provision a container directly via clone (fallback when pool empty). */
  async provisionDirect(workspace, resources) {
    // Allocate a static IP before cloning
    const allocated = await proxmoxService.findAvailableIP();
    const hostname = `ws-${workspace.userId}-${Date.now()}`.slice(0, 64);

    // Clone the template container
    const vmid = await proxmoxService.cloneContainer(
      proxmoxService.templateVmid, hostname
    );

    // Configure hostname, IP, resources
    await proxmoxService.configureContainer(vmid, {
      ip: allocated.ip,
      gateway: allocated.gateway,
      cidr: allocated.cidr,
      cpu: resources.cpu,
      memory: resources.memory,
      disk: resources.disk,
    });

    // Start the container
    await proxmoxService.startContainer(vmid);

    // Wait for it to be running (up to 60s)
    const ready = await proxmoxService.waitForContainerRunning(vmid, 60000);
    if (!ready) {
      throw new Error('Container did not start in time');
    }

    // Give the container a moment for SSH daemon to come up
    await new Promise(r => setTimeout(r, 5000));

    // Provision user inside the cloned container
    if (sshService.isConfigured) {
      await sshService.provisionClonedContainerUser(
        vmid, workspace.sshUsername, workspace.sshPassword, hostname, allocated.ip
      );
      logger.info(`Cloned container ${vmid} provisioned with user ${workspace.sshUsername}`);
    } else {
      logger.warn('SSH not configured — container will only have root access');
    }

    // Update workspace record
    workspace.proxmoxId = vmid;
    workspace.status = 'running';
    workspace.ip = allocated.ip;
    workspace.lastError = undefined;
    await workspace.save();

    logger.info(`Container ${vmid} provisioned for workspace ${workspace._id}, IP=${allocated.ip}`);
    return workspace;
  }

  // ── Container Pool Refill ──────────────────────────────────────────────────

  /** Refill pool to target size. Runs in background, non-blocking. */
  async refillPool() {
    const doRefill = async () => {
      try {
        const poolContainers = await proxmoxService.getPoolContainers();
        const currentSize = poolContainers.length;
        const targetSize = proxmoxService.poolSize;

        if (currentSize >= targetSize) {
          return; // Pool is full
        }

        const toCreate = targetSize - currentSize;
        logger.info(`Pool refill: ${currentSize}/${targetSize} containers, creating ${toCreate}`);

        for (let i = 0; i < toCreate; i++) {
          try {
            await proxmoxService.cloneToPool(proxmoxService.templateVmid);
            logger.info(`Pool container created (${currentSize + i + 1}/${targetSize})`);
          } catch (e) {
            logger.error(`Pool clone failed: ${e.message}`);
            // Continue with next container
          }
        }
      } catch (e) {
        logger.error(`Pool refill error: ${e.message}`);
      }
    };

    // Serialize with creation lock so refill and creation don't fight for template
    const prev = creationLock;
    let release;
    creationLock = new Promise((r) => { release = r; });
    try {
      await prev;
      return await doRefill();
    } finally {
      release();
    }
  }

  /** Start the background pool refill interval. */
  startPoolRefill() {
    if (poolRefillInterval) return; // Already running

    const intervalMs = 60000; // Check every 60 seconds
    logger.info(`Starting pool refill (every ${intervalMs / 1000}s, target: ${proxmoxService.poolSize})`);

    // Initial refill
    this.refillPool().catch(e => logger.error('Initial pool refill failed:', e));

    // Recurring refill
    poolRefillInterval = setInterval(() => {
      this.refillPool().catch(e => logger.error('Pool refill failed:', e));
    }, intervalMs);
  }

  /** Stop the background pool refill interval. */
  stopPoolRefill() {
    if (poolRefillInterval) {
      clearInterval(poolRefillInterval);
      poolRefillInterval = null;
      logger.info('Pool refill stopped');
    }
  }

  async retryProvisioning(workspaceId, userId) {
    const workspace = await this.getWorkspaceById(workspaceId, userId);
    if (workspace.proxmoxId) {
      // A container already exists; just sync status/IP
      const stats = await proxmoxService.getContainerStatus(workspace.proxmoxId);
      const ip = await proxmoxService.getContainerIP(workspace.proxmoxId);
      workspace.status = stats.status === 'running' ? 'running' : (stats.status || 'stopped');
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

      // Fetch real-time monitoring stats from Proxmox for each running workspace.
      // This is done in parallel and the results are attached directly to the response.
      const statsPromises = workspaces.map(async (ws) => {
        if (ws.proxmoxId && !['creating', 'deleting'].includes(ws.status)) {
          try {
            const stats = await proxmoxService.getContainerStatus(ws.proxmoxId);
            const normalized = stats.status === 'running' ? 'running' : 'stopped';
            if (normalized !== ws.status) {
              ws.status = normalized;
              ws.save().catch(() => {});
            }
            ws._doc.stats = stats;
          } catch {
            ws._doc.stats = null;
          }
        } else {
          ws._doc.stats = null;
        }
      });

      await Promise.allSettled(statsPromises);

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

      // Real-time status sync + monitoring stats from Proxmox
      if (workspace.proxmoxId && !['creating', 'deleting'].includes(workspace.status)) {
        try {
          const stats = await proxmoxService.getContainerStatus(workspace.proxmoxId);
          const normalizedStatus = stats.status === 'running' ? 'running' : 'stopped';
          if (normalizedStatus !== workspace.status) {
            workspace.status = normalizedStatus;
            await workspace.save();
            logger.info(`Workspace ${workspaceId}: synced status to ${normalizedStatus}`);
          }
          workspace._doc.stats = stats;
        } catch (e) {
          workspace._doc.stats = null;
          logger.warn(`Status sync failed for workspace ${workspaceId}: ${e.message.slice(0, 100)}`);
        }
      } else {
        workspace._doc.stats = null;
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

  async resizeWorkspace(workspaceId, userId, resources) {
    try {
      const workspace = await this.getWorkspaceById(workspaceId, userId);

      if (!workspace.proxmoxId) {
        throw new Error('Container not provisioned yet');
      }

      const allowed = { cpu: [1, 8], memory: [256, 16384], disk: [5, 200] };
      for (const [key, [min, max]] of Object.entries(allowed)) {
        if (resources[key] != null && (resources[key] < min || resources[key] > max)) {
          throw new Error(`${key} must be between ${min} and ${max}`);
        }
      }

      await proxmoxService.resizeContainer(workspace.proxmoxId, {
        cpu: resources.cpu ?? workspace.resources.cpu,
        memory: resources.memory ?? workspace.resources.memory,
        disk: resources.disk ?? workspace.resources.disk,
      });

      // Update stored resource values
      if (resources.cpu != null) workspace.resources.cpu = resources.cpu;
      if (resources.memory != null) workspace.resources.memory = resources.memory;
      if (resources.disk != null) workspace.resources.disk = resources.disk;
      await workspace.save();

      await this.logActivity(userId, 'WORKSPACE_RESIZE', 'workspace', workspaceId, { resources });

      return workspace;
    } catch (error) {
      logger.error('Error resizing workspace:', error);
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