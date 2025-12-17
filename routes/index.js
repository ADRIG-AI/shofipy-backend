import express from 'express';
import authRoutes from './auth/index.js';
import shopifyRoutes from './shopify/index.js';
import stripeRoutes from './stripe/index.js';
import userRoutes from './user/index.js';
import dutifyRoutes from './dutify/index.js';
import { handleShopifyCallback } from '../controllers/user/userController.js';


const router = express.Router();

// Mount auth routes
router.use('/auth', authRoutes);

// Mount shopify routes
router.use('/shopify', shopifyRoutes);

// Mount stripe routes
router.use('/stripe', stripeRoutes);

// Mount user routes
router.use('/user', userRoutes);

router.use('/dutify', dutifyRoutes);



export default router;
