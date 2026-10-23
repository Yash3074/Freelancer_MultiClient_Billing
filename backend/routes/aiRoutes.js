import express from 'express';
import { categorizeExpense, predictClientRisk } from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/categorize-expense', categorizeExpense);
router.get('/client-risk/:clientId', predictClientRisk);

export default router;
