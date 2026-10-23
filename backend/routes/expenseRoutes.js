import express from 'express';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
} from '../controllers/expenseController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadReceipt } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect); // All expense routes require authentication

router.get('/summary', getExpenseSummary);

router.route('/')
  .get(getExpenses)
  .post(uploadReceipt.single('receipt'), createExpense);

router.route('/:id')
  .put(uploadReceipt.single('receipt'), updateExpense)
  .delete(deleteExpense);

export default router;
