import express from 'express';
import { tokenController } from '../../controllers/auth/tokenController.js';
import { callbackController } from '../../controllers/auth/callbackController.js';

const router = express.Router();

// POST /api/auth/token
router.post('/token', tokenController);

// GET /api/auth/callback
router.get('/callback', callbackController);

export default router;
