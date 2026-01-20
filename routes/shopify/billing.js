import express from 'express';
import { createSubscription, getSubscriptionStatus, cancelSubscription, activateSubscription } from '../../controllers/shopify/billingController.js';
import { handleSubscriptionUpdate, handleSubscriptionCallback } from '../../controllers/webhook/shopifyController.js';
import { verifyBillingSetup, testWebhookEndpoint } from '../../controllers/shopify/verificationController.js';
import { syncSubscriptionStatus } from '../../controllers/shopify/syncController.js';
import { authenticateToken } from '../../middleware/auth.js';

const router = express.Router();

router.post('/create-subscription', authenticateToken, createSubscription);
router.get('/subscription-status', authenticateToken, getSubscriptionStatus);
router.post('/cancel-subscription', authenticateToken, cancelSubscription);
router.post('/activate-subscription', authenticateToken, activateSubscription);
router.get('/sync-status', authenticateToken, syncSubscriptionStatus);
router.get('/verify-setup', authenticateToken, verifyBillingSetup);
router.get('/test-webhook', testWebhookEndpoint);
router.post('/webhook/subscription-update', handleSubscriptionUpdate);
router.get('/callback', handleSubscriptionCallback);
router.get('/test', (req, res) => res.json({ message: 'Billing routes working' }));

export default router;