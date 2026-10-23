import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0.01, 'Quantity must be greater than 0'],
      default: 1,
    },
    rate: {
      type: Number,
      required: true,
      min: [0, 'Rate cannot be negative'],
    },
    amount: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Please select a client'],
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    items: {
      type: [lineItemSchema],
      validate: [
        (arr) => Array.isArray(arr) && arr.length > 0,
        'Invoice must contain at least one line item',
      ],
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    exchangeRateToINR: {
      type: Number,
      default: 1.0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    gstRate: {
      type: Number,
      default: 18,
      min: 0,
    },
    gstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalINR: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Unpaid', 'Partially Paid', 'Fully Paid', 'Overdue'],
      default: 'Unpaid',
      index: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountPaidINR: {
      type: Number,
      default: 0,
      min: 0,
    },
    isInternational: {
      type: Boolean,
      default: false,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
    publicShareToken: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Invoice = mongoose.model('Invoice', invoiceSchema);
