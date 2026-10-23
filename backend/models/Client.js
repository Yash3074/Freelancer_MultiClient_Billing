import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide client name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide client email'],
      lowercase: true,
      trim: true,
    },
    company: {
      type: String,
      default: '',
      trim: true,
    },
    country: {
      type: String,
      default: 'India',
      trim: true,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    gstin: {
      type: String,
      default: 'N/A',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    paymentTermsDays: {
      type: Number,
      default: 15,
      min: 0,
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

export const Client = mongoose.model('Client', clientSchema);
