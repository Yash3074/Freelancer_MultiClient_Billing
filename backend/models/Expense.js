import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide an expense description'],
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Software & Subscriptions',
        'Equipment',
        'Office & Rent',
        'Travel',
        'Marketing',
        'Professional Fees',
        'Internet & Phone',
        'Other',
      ],
      default: 'Other',
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please enter an expense amount'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    receiptUrl: {
      type: String,
      default: '',
    },
    receiptOriginalName: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Expense = mongoose.model('Expense', expenseSchema);
