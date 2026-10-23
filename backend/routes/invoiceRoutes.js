import express from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updatePaymentStatus,
  deleteInvoice,
  getPublicInvoice,
} from '../controllers/invoiceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for shareable invoice view
router.get('/public/:token', getPublicInvoice);

// Protected routes
router.use(protect);

router.route('/')
  .get(getInvoices)
  .post(createInvoice);

router.route('/:id')
  .get(getInvoiceById)
  .delete(deleteInvoice);

router.patch('/:id/payment', updatePaymentStatus);

export default router;
