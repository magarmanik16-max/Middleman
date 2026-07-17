import { workspaceService } from '../services/workspaceService.js';
import { proxmoxService } from '../services/proxmoxService.js';
import { logger } from '../utils/logger.js';

export const createWorkspace = async (req, res) => {
  try {
    const { name, description, resources, sshPassword } = req.body;
    
    const workspace = await workspaceService.createWorkspace(req.user._id, {
      name,
      description,
      resources,
      sshPassword,
      email: req.user.email
    });

    res.status(201).json({
      message: 'Workspace creation initiated',
      workspace
    });
  } catch (error) {
    logger.error('Create workspace error:', error);
    
    if (error.message === 'Workspace limit reached') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Failed to create workspace' });
  }
};

export const getUserWorkspaces = async (req, res) => {
  try {
    const workspaces = await workspaceService.getUserWorkspaces(req.user._id);
    res.json({ workspaces });
  } catch (error) {
    logger.error('Get workspaces error:', error);
    res.status(500).json({ message: 'Failed to get workspaces' });
  }
};

export const getWorkspace = async (req, res) => {
  try {
    const workspace = await workspaceService.getWorkspaceById(
      req.params.id,
      req.user._id
    );
    res.json({ workspace });
  } catch (error) {
    logger.error('Get workspace error:', error);
    
    if (error.message === 'Workspace not found') {
      return res.status(404).json({ message: error.message });
    }
    
    if (error.message === 'Not authorized to access this workspace') {
      return res.status(403).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Failed to get workspace' });
  }
};

export const updateWorkspace = async (req, res) => {
  try {
    const workspace = await workspaceService.updateWorkspace(
      req.params.id,
      req.user._id,
      req.body
    );
    
    res.json({
      message: 'Workspace updated successfully',
      workspace
    });
  } catch (error) {
    logger.error('Update workspace error:', error);
    
    if (error.message === 'Workspace not found') {
      return res.status(404).json({ message: error.message });
    }
    
    if (error.message === 'Not authorized to access this workspace') {
      return res.status(403).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Failed to update workspace' });
  }
};

export const deleteWorkspace = async (req, res) => {
  try {
    await workspaceService.deleteWorkspace(req.params.id, req.user._id);
    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    logger.error('Delete workspace error:', error);
    
    if (error.message === 'Workspace not found') {
      return res.status(404).json({ message: error.message });
    }
    
    if (error.message === 'Not authorized to access this workspace') {
      return res.status(403).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Failed to delete workspace' });
  }
};

export const startWorkspace = async (req, res) => {
  try {
    const workspace = await workspaceService.startWorkspace(
      req.params.id,
      req.user._id
    );
    
    res.json({
      message: 'Workspace started successfully',
      workspace
    });
  } catch (error) {
    logger.error('Start workspace error:', error);
    
    if (error.message === 'Workspace not found') {
      return res.status(404).json({ message: error.message });
    }
    
    if (error.message === 'Not authorized to access this workspace') {
      return res.status(403).json({ message: error.message });
    }
    
    if (error.message === 'Container not provisioned yet') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Failed to start workspace' });
  }
};

export const stopWorkspace = async (req, res) => {
  try {
    const workspace = await workspaceService.stopWorkspace(
      req.params.id,
      req.user._id
    );
    
    res.json({
      message: 'Workspace stopped successfully',
      workspace
    });
  } catch (error) {
    logger.error('Stop workspace error:', error);
    
    if (error.message === 'Workspace not found') {
      return res.status(404).json({ message: error.message });
    }
    
    if (error.message === 'Not authorized to access this workspace') {
      return res.status(403).json({ message: error.message });
    }
    
    if (error.message === 'Container not provisioned yet') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Failed to stop workspace' });
  }
};

export const retryProvisioning = async (req, res) => {
  try {
    const workspace = await workspaceService.retryProvisioning(
      req.params.id,
      req.user._id
    );
    res.json({
      message: 'Provisioning retry initiated',
      workspace
    });
  } catch (error) {
    logger.error('Retry provisioning error:', error);

    if (error.message === 'Workspace not found') {
      return res.status(404).json({ message: error.message });
    }

    if (error.message === 'Not authorized to access this workspace') {
      return res.status(403).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to retry provisioning' });
  }
};

export const restartWorkspace = async (req, res) => {
  try {
    const workspace = await workspaceService.restartWorkspace(
      req.params.id,
      req.user._id
    );

    res.json({
      message: 'Workspace restarted successfully',
      workspace
    });
  } catch (error) {
    logger.error('Restart workspace error:', error);

    if (error.message === 'Workspace not found') {
      return res.status(404).json({ message: error.message });
    }

    if (error.message === 'Not authorized to access this workspace') {
      return res.status(403).json({ message: error.message });
    }

    if (error.message === 'Container not provisioned yet') {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to restart workspace' });
  }
};

export const resizeWorkspace = async (req, res) => {
  try {
    const { cpu, memory, disk } = req.body;
    const workspace = await workspaceService.resizeWorkspace(
      req.params.id,
      req.user._id,
      { cpu, memory, disk }
    );

    res.json({
      message: 'Workspace resized successfully',
      workspace
    });
  } catch (error) {
    logger.error('Resize workspace error:', error);

    if (error.message === 'Workspace not found') {
      return res.status(404).json({ message: error.message });
    }

    if (error.message === 'Not authorized to access this workspace') {
      return res.status(403).json({ message: error.message });
    }

    if (error.message === 'Container not provisioned yet') {
      return res.status(400).json({ message: error.message });
    }

    if (/must be between/.test(error.message)) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to resize workspace' });
  }
};

export const getWorkspaceRRDData = async (req, res) => {
  try {
    const workspace = await workspaceService.getWorkspaceById(
      req.params.id,
      req.user._id
    );

    if (!workspace.proxmoxId) {
      return res.status(400).json({ message: 'Container not provisioned yet' });
    }

    const timeframe = req.query.timeframe || 'hour';
    const data = await proxmoxService.getContainerRRDData(workspace.proxmoxId, timeframe);
    res.json({ data });
  } catch (error) {
    logger.error('Get RRD data error:', error);

    if (error.message === 'Workspace not found') {
      return res.status(404).json({ message: error.message });
    }

    if (error.message === 'Not authorized to access this workspace') {
      return res.status(403).json({ message: error.message });
    }

    res.status(500).json({ message: 'Failed to get monitoring history' });
  }
};