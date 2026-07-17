import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import ActivityLog from '../models/ActivityLog.js';
import { proxmoxService } from '../services/proxmoxService.js';
import { logger } from '../utils/logger.js';

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({ message: 'Failed to get users' });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { role, isVerified } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, isVerified },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'ADMIN_USER_UPDATE',
      resource: 'user',
      resourceId: user._id,
      details: { role, isVerified },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user's workspaces
    const workspaces = await Workspace.find({ userId: user._id });
    for (const workspace of workspaces) {
      if (workspace.proxmoxId) {
        await proxmoxService.deleteContainer(workspace.proxmoxId);
      }
      await Workspace.findByIdAndDelete(workspace._id);
    }

    // Delete user
    await User.findByIdAndDelete(user._id);

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'ADMIN_USER_DELETE',
      resource: 'user',
      resourceId: user._id,
      details: { email: user.email },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
};

export const getAllWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find()
      .populate('userId', 'email')
      .sort({ createdAt: -1 });
    
    res.json({ workspaces });
  } catch (error) {
    logger.error('Get all workspaces error:', error);
    res.status(500).json({ message: 'Failed to get workspaces' });
  }
};

export const deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Delete from Proxmox (best-effort: don't block DB cleanup)
    if (workspace.proxmoxId) {
      try {
        await proxmoxService.deleteContainer(workspace.proxmoxId);
      } catch (e) {
        logger.error(`Proxmox delete failed for ${workspace.proxmoxId}, proceeding with DB cleanup: ${e.message}`);
      }
    }

    // Delete from database
    await Workspace.findByIdAndDelete(workspace._id);

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'ADMIN_WORKSPACE_DELETE',
      resource: 'workspace',
      resourceId: workspace._id,
      details: { name: workspace.name, userId: workspace.userId },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    logger.error('Delete workspace error:', error);
    res.status(500).json({ message: 'Failed to delete workspace' });
  }
};

export const getMetrics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
    const totalWorkspaces = await Workspace.countDocuments();
    const runningWorkspaces = await Workspace.countDocuments({ status: 'running' });
    const stoppedWorkspaces = await Workspace.countDocuments({ status: 'stopped' });

    res.json({
      metrics: {
        totalUsers,
        activeUsers,
        totalWorkspaces,
        runningWorkspaces,
        stoppedWorkspaces,
        systemHealth: 'good'
      }
    });
  } catch (error) {
    logger.error('Get metrics error:', error);
    res.status(500).json({ message: 'Failed to get metrics' });
  }
};

export const getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, userId } = req.query;
    
    const query = {};
    if (action) query.action = action;
    if (userId) query.userId = userId;

    const logs = await ActivityLog.find(query)
      .populate('userId', 'email')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ActivityLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get activity logs error:', error);
    res.status(500).json({ message: 'Failed to get activity logs' });
  }
};