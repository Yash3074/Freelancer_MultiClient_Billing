import fs from 'fs';
import path from 'path';
import { Expense } from '../models/Expense.js';

// @desc    Get all expenses for logged-in user
// @route   GET /api/v1/expenses
// @access  Private
export const getExpenses = async (req, res, next) => {
  try {
    const { category } = req.query;
    const query = { user: req.user._id };

    if (category) query.category = category;

    const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 });

    res.json({
      success: true,
      count: expenses.length,
      expenses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new expense (with optional receipt file upload via Multer)
// @route   POST /api/v1/expenses
// @access  Private
export const createExpense = async (req, res, next) => {
  try {
    const { description, category, amount, date, notes } = req.body;

    if (!description || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Description and amount are required.',
      });
    }

    let receiptUrl = '';
    let receiptOriginalName = '';
    if (req.file) {
      receiptUrl = `/uploads/receipts/${req.file.filename}`;
      receiptOriginalName = req.file.originalname;
    }

    const expense = await Expense.create({
      user: req.user._id,
      description,
      category: category || 'Other',
      amount: Number(amount),
      date: date || new Date(),
      receiptUrl,
      receiptOriginalName,
      notes: notes || '',
    });

    if (req.io) {
      req.io.to(`user_${req.user._id}`).emit('expense:created', expense);
    }

    res.status(201).json({
      success: true,
      expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update expense
// @route   PUT /api/v1/expenses/:id
// @access  Private
export const updateExpense = async (req, res, next) => {
  try {
    let expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    const { description, category, amount, date, notes } = req.body;

    if (description !== undefined) expense.description = description;
    if (category !== undefined) expense.category = category;
    if (amount !== undefined) expense.amount = Number(amount);
    if (date !== undefined) expense.date = date;
    if (notes !== undefined) expense.notes = notes;

    if (req.file) {
      // Remove old receipt if exists
      if (expense.receiptUrl) {
        const oldPath = path.join(process.cwd(), expense.receiptUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      expense.receiptUrl = `/uploads/receipts/${req.file.filename}`;
      expense.receiptOriginalName = req.file.originalname;
    }

    await expense.save();

    if (req.io) {
      req.io.to(`user_${req.user._id}`).emit('expense:updated', expense);
    }

    res.json({
      success: true,
      expense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete expense
// @route   DELETE /api/v1/expenses/:id
// @access  Private
export const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    if (expense.receiptUrl) {
      const receiptPath = path.join(process.cwd(), expense.receiptUrl);
      if (fs.existsSync(receiptPath)) fs.unlinkSync(receiptPath);
    }

    await expense.deleteOne();

    if (req.io) {
      req.io.to(`user_${req.user._id}`).emit('expense:deleted', req.params.id);
    }

    res.json({
      success: true,
      message: 'Expense removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get expense summary analytics
// @route   GET /api/v1/expenses/summary
// @access  Private
export const getExpenseSummary = async (req, res, next) => {
  try {
    const expenses = await Expense.find({ user: req.user._id });
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryMap = {};
    expenses.forEach((e) => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });

    res.json({
      success: true,
      totalAmount,
      byCategory: categoryMap,
    });
  } catch (error) {
    next(error);
  }
};
