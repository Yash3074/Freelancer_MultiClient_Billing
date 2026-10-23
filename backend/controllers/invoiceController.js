import crypto from 'crypto';
import { Invoice } from '../models/Invoice.js';
import { Client } from '../models/Client.js';
import { User } from '../models/User.js';
import { calculateGST, convertToINR, EXCHANGE_RATES } from '../utils/taxCalculator.js';
import { generateUpiQrCode, generateUrlQrCode } from '../utils/qrcode.js';

// @desc    Get all invoices for logged-in user
// @route   GET /api/v1/invoices
// @access  Private
export const getInvoices = async (req, res, next) => {
  try {
    const { status, clientId } = req.query;
    const query = { user: req.user._id };

    if (status) query.status = status;
    if (clientId) query.client = clientId;

    const invoices = await Invoice.find(query)
      .populate('client', 'name email company country currency gstin address')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single invoice by ID
// @route   GET /api/v1/invoices/:id
// @access  Private
export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate('client');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    // Generate QR Code for invoice (UPI or Official Verification Portal)
    const userObj = req.user || {};
    const upiId = (userObj.upiId || '').trim();
    const payeeName = (userObj.businessName || userObj.name || 'Freelance Pro').trim();

    const balanceDueINR = Math.max(0, (invoice.totalINR || 0) - (invoice.amountPaidINR || 0));
    const inrAmount = balanceDueINR > 0 ? balanceDueINR : (invoice.totalINR || (invoice.totalAmount * (invoice.exchangeRateToINR || 1)));

    let upiQrCode = null;
    let qrType = 'upi';
    let qrCaption = 'Scan with GPay / PhonePe / Paytm to pay directly';

    if (upiId) {
      upiQrCode = await generateUpiQrCode({
        upiId,
        payeeName,
        amount: Math.round(inrAmount),
        invoiceNumber: invoice.invoiceNumber,
      });

      if (invoice.currency !== 'INR') {
        qrCaption = `Scan to pay via UPI (Converted: ₹${Math.round(inrAmount).toLocaleString('en-IN')})`;
      } else if (invoice.status === 'Fully Paid') {
        qrCaption = 'Payment Verified · Scan to view settlement';
      }
    }

    // If no UPI ID or if generation failed, generate official verification QR code
    if (!upiQrCode) {
      qrType = 'verification';
      qrCaption = 'Scan with phone camera to verify official invoice';
      const baseUrl = process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 5000}`;
      const verifyUrl = `${baseUrl}/api/v1/invoices/public/${invoice.publicShareToken}`;
      upiQrCode = await generateUrlQrCode(verifyUrl);
    }

    res.json({
      success: true,
      invoice,
      upiQrCode,
      qrType,
      qrCaption,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new invoice
// @route   POST /api/v1/invoices
// @access  Private
export const createInvoice = async (req, res, next) => {
  try {
    const { clientId, items, invoiceDate, dueDate, notes, status, amountPaid } = req.body;

    if (!clientId) {
      return res.status(400).json({ success: false, message: 'Please select a client.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one line item is required.' });
    }

    const client = await Client.findOne({ _id: clientId, user: req.user._id });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Selected client not found.' });
    }

    // Calculate line items and subtotal
    let subtotal = 0;
    const processedItems = items.map((item) => {
      const qty = Number(item.quantity) || 1;
      const rate = Number(item.rate) || 0;
      const amount = Number((qty * rate).toFixed(2));
      subtotal += amount;
      return {
        description: item.description,
        quantity: qty,
        rate,
        amount,
      };
    });

    const isInternational = client.currency !== 'INR' || client.country !== 'India';
    const gstInfo = calculateGST(subtotal, isInternational);
    const totalAmount = Number((subtotal + gstInfo.gstAmount).toFixed(2));
    const totalINR = convertToINR(totalAmount, client.currency);

    let initialPaid = Number(amountPaid) || 0;
    let initialStatus = status || 'Unpaid';
    if (initialStatus === 'Fully Paid') {
      initialPaid = totalAmount;
    } else if (initialStatus === 'Unpaid') {
      initialPaid = 0;
    }

    const amountPaidINR = convertToINR(initialPaid, client.currency);
    const publicShareToken = crypto.randomBytes(16).toString('hex');
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const invoice = await Invoice.create({
      user: req.user._id,
      client: client._id,
      invoiceNumber,
      items: processedItems,
      currency: client.currency,
      exchangeRateToINR: EXCHANGE_RATES[client.currency] || 1.0,
      subtotal,
      gstRate: gstInfo.rate,
      gstAmount: gstInfo.gstAmount,
      totalAmount,
      totalINR,
      status: initialStatus,
      amountPaid: initialPaid,
      amountPaidINR,
      isInternational,
      invoiceDate: invoiceDate || new Date(),
      dueDate: dueDate || new Date(Date.now() + (client.paymentTermsDays || 15) * 86400000),
      notes: notes || '',
      publicShareToken,
    });

    const populatedInvoice = await invoice.populate('client');

    // Emit real-time WebSocket event if Socket.IO attached
    if (req.io) {
      req.io.to(`user_${req.user._id}`).emit('invoice:created', populatedInvoice);
    }

    res.status(201).json({
      success: true,
      invoice: populatedInvoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice payment status
// @route   PATCH /api/v1/invoices/:id/payment
// @access  Private
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { status, amountPaid } = req.body;

    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate('client');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    invoice.status = status || invoice.status;

    if (invoice.status === 'Fully Paid') {
      invoice.amountPaid = invoice.totalAmount;
    } else if (invoice.status === 'Unpaid') {
      invoice.amountPaid = 0;
    } else if (amountPaid !== undefined) {
      invoice.amountPaid = Math.min(Number(amountPaid), invoice.totalAmount);
    }

    invoice.amountPaidINR = convertToINR(invoice.amountPaid, invoice.currency);
    await invoice.save();

    if (req.io) {
      req.io.to(`user_${req.user._id}`).emit('invoice:updated', invoice);
    }

    res.json({
      success: true,
      invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete invoice
// @route   DELETE /api/v1/invoices/:id
// @access  Private
export const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    await invoice.deleteOne();

    if (req.io) {
      req.io.to(`user_${req.user._id}`).emit('invoice:deleted', req.params.id);
    }

    res.json({
      success: true,
      message: 'Invoice removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public invoice by share token (Client portal view)
// @route   GET /api/v1/invoices/public/:token
// @access  Public
export const getPublicInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ publicShareToken: req.params.token })
      .populate('client')
      .populate('user', 'name businessName email phone logoUrl address upiId bankDetails currency');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invoice link or invoice has been removed.',
      });
    }

    const userObj = invoice.user || {};
    const upiId = (userObj.upiId || '').trim();
    const payeeName = (userObj.businessName || userObj.name || 'Freelance Pro').trim();

    const balanceDueINR = Math.max(0, (invoice.totalINR || 0) - (invoice.amountPaidINR || 0));
    const inrAmount = balanceDueINR > 0 ? balanceDueINR : (invoice.totalINR || (invoice.totalAmount * (invoice.exchangeRateToINR || 1)));

    let upiQrCode = null;
    let qrType = 'upi';
    let qrCaption = 'Scan with GPay / PhonePe / Paytm to pay directly';

    if (upiId) {
      upiQrCode = await generateUpiQrCode({
        upiId,
        payeeName,
        amount: Math.round(inrAmount),
        invoiceNumber: invoice.invoiceNumber,
      });

      if (invoice.currency !== 'INR') {
        qrCaption = `Scan to pay via UPI (Converted: ₹${Math.round(inrAmount).toLocaleString('en-IN')})`;
      } else if (invoice.status === 'Fully Paid') {
        qrCaption = 'Payment Verified · Scan to view settlement';
      }
    }

    if (!upiQrCode) {
      qrType = 'verification';
      qrCaption = 'Scan with phone camera to verify official invoice';
      const baseUrl = process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 5000}`;
      const verifyUrl = `${baseUrl}/api/v1/invoices/public/${invoice.publicShareToken}`;
      upiQrCode = await generateUrlQrCode(verifyUrl);
    }

    res.json({
      success: true,
      invoice,
      upiQrCode,
      qrType,
      qrCaption,
    });
  } catch (error) {
    next(error);
  }
};
