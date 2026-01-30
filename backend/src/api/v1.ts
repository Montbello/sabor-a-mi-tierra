import { Router } from 'express';
import { authRoutes } from '../modules/identity/index.js';
import { organizationRoutes } from '../modules/organization/index.js';
import { profileRoutes } from '../modules/profile/index.js';
import { locationRoutes } from '../modules/location/index.js';
import { productRoutes } from '../modules/product/index.js';

const router = Router();

// Mount module routes
router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/profile', profileRoutes);
router.use('/locations', locationRoutes);
router.use('/products', productRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ 
    success: true, 
    data: { 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    } 
  });
});

export const apiV1Router = router;
