import express from 'express';
import { getUser } from '../../controllers/user/userController.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

router.get('/get', authenticateToken, getUser);

export default router;
