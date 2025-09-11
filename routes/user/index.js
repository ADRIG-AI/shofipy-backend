import express from 'express';
import { getUser } from '../../controllers/user/userController.js';
import { authenticateToken } from '../../middleware/auth.js';
import { createSubUser, getSubUsers, deleteSubUser } from '../../controllers/user/subUserController.js';

const router = express.Router();

router.get('/get', authenticateToken, getUser);
router.post('/sub-users', authenticateToken, createSubUser);
router.get('/sub-users', authenticateToken, getSubUsers);
router.delete('/sub-users/:id', authenticateToken, deleteSubUser);

export default router;
