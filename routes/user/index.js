import express from 'express';
import { getUser, initiateShopifyAuth, handleShopifyCallback } from '../../controllers/user/userController.js';
import { authenticateToken } from '../../middleware/auth.js';
import { createSubUser, getSubUsers, deleteSubUser } from '../../controllers/user/subUserController.js';
import { getUserShops, selectShop } from '../../controllers/user/shopController.js';

const router = express.Router();

router.get('/get', authenticateToken, getUser);
router.get('/shops', authenticateToken, getUserShops);
router.post('/shop/select', authenticateToken, selectShop);
router.post('/sub-users', authenticateToken, createSubUser);
router.get('/sub-users', authenticateToken, getSubUsers);
router.delete('/sub-users/:id', authenticateToken, deleteSubUser);

// Shopify OAuth routes
router.post('/shopify/auth', authenticateToken, initiateShopifyAuth);
router.get('/shopify/callback', handleShopifyCallback);

export default router;
