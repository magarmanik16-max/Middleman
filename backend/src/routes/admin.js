import express from 'express';
import { body, validationResult } from 'express-validator';
import {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  getAllWorkspaces,
  deleteWorkspace,
  getMetrics,
  getActivityLogs
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

// Validation middleware
const validateUserUpdate = [
  body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user'),
  body('isVerified').optional().isBoolean().withMessage('isVerified must be a boolean')
];

// Check validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// User management routes
router.get('/users', getAllUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', validateUserUpdate, handleValidationErrors, updateUser);
router.delete('/users/:id', deleteUser);

// Workspace management routes
router.get('/workspaces', getAllWorkspaces);
router.delete('/workspaces/:id', deleteWorkspace);

// System metrics and logs
router.get('/metrics', getMetrics);
router.get('/activity-logs', getActivityLogs);

export default router;