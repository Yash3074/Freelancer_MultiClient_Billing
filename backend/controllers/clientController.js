import { Client } from '../models/Client.js';
import { Invoice } from '../models/Invoice.js';

// @desc    Get all clients for logged in user
// @route   GET /api/v1/clients
// @access  Private
export const getClients = async (req, res, next) => {
  try {
    const clients = await Client.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: clients.length,
      clients,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single client
// @route   GET /api/v1/clients/:id
// @access  Private
export const getClientById = async (req, res, next) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    res.json({
      success: true,
      client,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new client
// @route   POST /api/v1/clients
// @access  Private
export const createClient = async (req, res, next) => {
  try {
    const { name, email, company, country, currency, gstin, address, phone, paymentTermsDays, notes } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Client name and email are required.',
      });
    }

    const client = await Client.create({
      user: req.user._id,
      name,
      email,
      company: company || '',
      country: country || 'India',
      currency: currency || 'INR',
      gstin: gstin || 'N/A',
      address: address || '',
      phone: phone || '',
      paymentTermsDays: Number(paymentTermsDays) || 15,
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      client,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update client
// @route   PUT /api/v1/clients/:id
// @access  Private
export const updateClient = async (req, res, next) => {
  try {
    let client = await Client.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    client = await Client.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      client,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete client
// @route   DELETE /api/v1/clients/:id
// @access  Private
export const deleteClient = async (req, res, next) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    // Check if client has associated invoices
    const invoiceCount = await Invoice.countDocuments({
      client: req.params.id,
      user: req.user._id,
    });

    if (invoiceCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete client with ${invoiceCount} existing invoice(s). Please delete or reassign those invoices first.`,
      });
    }

    await client.deleteOne();

    res.json({
      success: true,
      message: 'Client removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};
