import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'USER_REGISTER',
      'USER_LOGIN',
      'USER_LOGOUT',
      'USER_VERIFY_EMAIL',
      'WORKSPACE_CREATE',
      'WORKSPACE_START',
      'WORKSPACE_STOP',
      'WORKSPACE_RESTART',
      'WORKSPACE_DELETE',
      'ADMIN_USER_UPDATE',
      'ADMIN_USER_DELETE',
      'ADMIN_WORKSPACE_DELETE'
    ]
  },
  resource: {
    type: String,
    enum: ['user', 'workspace', 'system']
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });

export default mongoose.model('ActivityLog', activityLogSchema);