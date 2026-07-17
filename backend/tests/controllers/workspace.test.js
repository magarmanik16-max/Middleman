import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { createWorkspace, getUserWorkspaces, deleteWorkspace } from '../../src/controllers/workspaceController.js';
import User from '../../src/models/User.js';
import Workspace from '../../src/models/Workspace.js';
import { generateTokens } from '../../src/middleware/auth.js';

const app = express();
app.use(express.json());

// Mock authentication middleware
const mockAuth = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const user = await User.findById(userId);
  if (!user) {
    return res.status(401).json({ message: 'User not found' });
  }
  
  req.user = user;
  next();
};

// Mock routes
app.post('/api/workspaces', mockAuth, createWorkspace);
app.get('/api/workspaces', mockAuth, getUserWorkspaces);
app.delete('/api/workspaces/:id', mockAuth, deleteWorkspace);

describe('Workspace Controller', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Create test user
    testUser = new User({
      email: 'test@timesglobal.com.np',
      password: 'password123',
      isVerified: true
    });
    await testUser.save();
    
    const tokens = generateTokens(testUser._id);
    authToken = tokens.accessToken;
  });

  describe('POST /api/workspaces', () => {
    it('should create a new workspace', async () => {
      const workspaceData = {
        name: 'Test Workspace',
        description: 'A test workspace'
      };

      const response = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser._id.toString())
        .send(workspaceData)
        .expect(201);

      expect(response.body.message).toContain('creation initiated');
      expect(response.body.workspace.name).toBe(workspaceData.name);
    });

    it('should reject workspace creation without authentication', async () => {
      const workspaceData = {
        name: 'Test Workspace',
        description: 'A test workspace'
      };

      await request(app)
        .post('/api/workspaces')
        .send(workspaceData)
        .expect(401);
    });
  });

  describe('GET /api/workspaces', () => {
    it('should get user workspaces', async () => {
      // Create test workspaces
      await Workspace.create([
        { userId: testUser._id, name: 'Workspace 1' },
        { userId: testUser._id, name: 'Workspace 2' }
      ]);

      const response = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser._id.toString())
        .expect(200);

      expect(response.body.workspaces).toHaveLength(2);
    });

    it('should not get other user workspaces', async () => {
      // Create another user's workspace
      const otherUser = new User({
        email: 'other@timesglobal.com.np',
        password: 'password123',
        isVerified: true
      });
      await otherUser.save();

      await Workspace.create({
        userId: otherUser._id,
        name: 'Other Workspace'
      });

      const response = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser._id.toString())
        .expect(200);

      expect(response.body.workspaces).toHaveLength(0);
    });
  });

  describe('DELETE /api/workspaces/:id', () => {
    it('should delete user workspace', async () => {
      const workspace = await Workspace.create({
        userId: testUser._id,
        name: 'Test Workspace'
      });

      await request(app)
        .delete(`/api/workspaces/${workspace._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser._id.toString())
        .expect(200);

      const deletedWorkspace = await Workspace.findById(workspace._id);
      expect(deletedWorkspace).toBeNull();
    });

    it('should not delete other user workspace', async () => {
      const otherUser = new User({
        email: 'other@timesglobal.com.np',
        password: 'password123',
        isVerified: true
      });
      await otherUser.save();

      const workspace = await Workspace.create({
        userId: otherUser._id,
        name: 'Other Workspace'
      });

      await request(app)
        .delete(`/api/workspaces/${workspace._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-user-id', testUser._id.toString())
        .expect(403);
    });
  });
});