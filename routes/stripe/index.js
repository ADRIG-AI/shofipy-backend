import express from 'express';
import { createCheckoutSession } from '../../controllers/stripe/checkoutController.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

router.post('/checkout', authenticateToken, createCheckoutSession);

export default router;
