import express from 'express';
import { login, signup } from '../../controllers/auth/authController.js';
import { tokenController } from '../../controllers/auth/tokenController.js';
import { callbackController } from '../../controllers/auth/callbackController.js';

const router = express.Router();

router.post('/login', login);
router.post('/signup', signup);
router.post('/token', tokenController);
router.get('/callback', callbackController);

export default router;
