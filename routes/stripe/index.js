import express from 'express';
import { createCheckoutSession } from '../../controllers/stripe/checkoutController.js';

const router = express.Router();

router.post('/checkout', createCheckoutSession);

export default router;
