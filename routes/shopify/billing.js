import express from 'express';
import { createSubscription, getSubscriptionStatus, cancelSubscription, activateSubscription } from '../../controllers/shopify/billingController.js';
import { handleSubscriptionUpdate, handleSubscriptionCallback } from '../../controllers/webhook/shopifyController.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

router.post('/create-subscription', authenticateToken, createSubscription);
router.get('/subscription-status', authenticateToken, getSubscriptionStatus);
router.post('/cancel-subscription', authenticateToken, cancelSubscription);
router.post('/activate-subscription', authenticateToken, activateSubscription);
router.post('/webhook/subscription-update', handleSubscriptionUpdate);
router.get('/callback', handleSubscriptionCallback);

export default router;