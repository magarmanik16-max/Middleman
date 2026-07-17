import mongoose from 'mongoose';

const workspaceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Workspace name is required'],
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    trim: true,
    maxlength: 200
  },
  status: {
    type: String,
    enum: ['creating', 'running', 'stopped', 'error', 'deleting'],
    default: 'creating'
  },
  lastError: {
    type: String
  },
  proxmoxId: {
    type: Number,
    unique: true,
    sparse: true
  },
  ip: {
    type: String
  },
  sshUsername: {
    type: String
  },
  sshPassword: {
    type: String
  },
  rootPassword: {
    type: String
  },
  resources: {
    cpu: {
      type: Number,
      default: parseInt(process.env.DEFAULT_WORKSPACE_CPU) || 1
    },
    memory: {
      type: Number,
      default: parseInt(process.env.DEFAULT_WORKSPACE_MEMORY) || 512
    },
    disk: {
      type: Number,
      default: parseInt(process.env.DEFAULT_WORKSPACE_DISK) || 10
    }
  },
  template: {
    type: String,
    default: 'ubuntu-22.04'
  },
  lastAccessed: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
workspaceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to check if user has reached workspace limit
workspaceSchema.statics.canCreateWorkspace = async function(userId) {
  const maxWorkspaces = parseInt(process.env.MAX_WORKSPACES_PER_USER) || 1;
  const workspaceCount = await this.countDocuments({ userId });
  return workspaceCount < maxWorkspaces;
};

export default mongoose.model('Workspace', workspaceSchema);