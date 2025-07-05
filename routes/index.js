import express from 'express';
import authRoutes from './auth/index.js';
import shopifyRoutes from './shopify/index.js';
import stripeRoutes from './stripe/index.js';
import userRoutes from './user/index.js';

const router = express.Router();

// Mount auth routes
router.use('/auth', authRoutes);

// Mount shopify routes
router.use('/shopify', shopifyRoutes);

// Mount stripe routes
router.use('/stripe', stripeRoutes);

// Mount user routes
router.use('/user', userRoutes);

export default router;
