import express from 'express';
import { body, validationResult } from 'express-validator';
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  startWorkspace,
  stopWorkspace,
  restartWorkspace,
  retryProvisioning
} from '../controllers/workspaceController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const validateWorkspace = [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Name is required and must be less than 50 characters'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description must be less than 200 characters'),
  body('sshPassword').optional().isString().isLength({ min: 6, max: 128 }).withMessage('SSH password must be between 6 and 128 characters'),
  body('resources.cpu').optional().isInt({ min: 1, max: 4 }).withMessage('CPU must be between 1 and 4'),
  body('resources.memory').optional().isInt({ min: 256, max: 2048 }).withMessage('Memory must be between 256MB and 2GB'),
  body('resources.disk').optional().isInt({ min: 5, max: 50 }).withMessage('Disk must be between 5GB and 50GB')
];

const validateUpdate = [
  body('name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Name must be less than 50 characters'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description must be less than 200 characters')
];

// Check validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// All routes require authentication
router.use(authenticate);

// CRUD routes
router.post('/', validateWorkspace, handleValidationErrors, createWorkspace);
router.get('/', getUserWorkspaces);
router.get('/:id', getWorkspace);
router.put('/:id', validateUpdate, handleValidationErrors, updateWorkspace);
router.delete('/:id', deleteWorkspace);

// Workspace control routes
router.post('/:id/start', startWorkspace);
router.post('/:id/stop', stopWorkspace);
router.post('/:id/restart', restartWorkspace);
router.post('/:id/retry', retryProvisioning);

export default router;