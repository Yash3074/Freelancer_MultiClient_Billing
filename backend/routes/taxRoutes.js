import express from 'express';
import { getDashboardMetrics } from '../controllers/taxController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardMetrics);

export default router;
