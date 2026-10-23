import { Client } from '../models/Client.js';
import { Invoice } from '../models/Invoice.js';
import { Expense } from '../models/Expense.js';

// Knowledge base dictionaries for NLP keyword matching & category classification
const CATEGORY_KEYWORDS = {
  'Software & Subscriptions': [
    'aws', 'azure', 'google cloud', 'gcp', 'digitalocean', 'vercel', 'heroku',
    'github', 'gitlab', 'jetbrains', 'docker', 'openai', 'chatgpt', 'copilot',
    'figma', 'adobe', 'canva', 'slack', 'notion', 'zoom', 'jira', 'trello',
    'domain', 'godaddy', 'namecheap', 'hosting', 'saas', 'subscription', 'license'
  ],
  'Equipment': [
    'macbook', 'laptop', 'monitor', 'keyboard', 'mouse', 'headphones',
    'ipad', 'tablet', 'charger', 'usb', 'hard drive', 'ssd', 'ram',
    'desk', 'chair', 'webcam', 'microphone', 'hardware', 'equipment'
  ],
  'Office & Rent': [
    'wework', 'coworking', 'office', 'rent', 'desk space', 'electricity',
    'maintenance', 'water', 'tea', 'coffee', 'cleaning', 'stationery'
  ],
  'Travel': [
    'uber', 'ola', 'flight', 'indigo', 'air india', 'train', 'irctc',
    'taxi', 'hotel', 'airbnb', 'fuel', 'petrol', 'diesel', 'toll', 'metro', 'fare'
  ],
  'Marketing': [
    'ads', 'google ads', 'facebook ads', 'meta', 'instagram', 'linkedin',
    'sponsorship', 'branding', 'flyer', 'business card', 'seo', 'campaign', 'pr'
  ],
  'Professional Fees': [
    'ca', 'chartered accountant', 'lawyer', 'legal', 'audit', 'trademark',
    'consultant', 'advisory', 'notary', 'contract', 'gst filing', 'tax filing'
  ],
  'Internet & Phone': [
    'wifi', 'broadband', 'internet', 'airtel', 'jio', 'vi', 'vodafone',
    'sim', 'recharge', 'data pack', 'fiber', 'mobile bill', 'phone bill'
  ],
};

// @desc    Smart AI Expense Categorizer (NLP heuristic classifier)
// @route   POST /api/v1/ai/categorize-expense
// @access  Private
export const categorizeExpense = async (req, res, next) => {
  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide an expense description string.',
      });
    }

    const tokens = description.toLowerCase().split(/[\s,._-]+/);
    let bestMatchCategory = 'Other';
    let highestScore = 0;
    const scores = {};

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      let score = 0;
      keywords.forEach((kw) => {
        if (description.toLowerCase().includes(kw)) {
          score += 3;
        } else if (tokens.includes(kw)) {
          score += 2;
        }
      });

      scores[category] = score;
      if (score > highestScore) {
        highestScore = score;
        bestMatchCategory = category;
      }
    }

    const confidence = highestScore > 0 ? Math.min(98, 60 + highestScore * 10) : 30;

    res.json({
      success: true,
      suggestedCategory: bestMatchCategory,
      confidenceScore: `${confidence}%`,
      explanation:
        highestScore > 0
          ? `Identified key industry terms in "${description}" matching standard ${bestMatchCategory} tax deductible allowances.`
          : 'No specific keywords detected; categorized under general business expenses.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Client Late Payment Risk & Health Predictor
// @route   GET /api/v1/ai/client-risk/:clientId
// @access  Private
export const predictClientRisk = async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.clientId, user: req.user._id });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    const invoices = await Invoice.find({ client: client._id, user: req.user._id });

    if (invoices.length === 0) {
      return res.json({
        success: true,
        clientName: client.name,
        riskLevel: 'Low (New Client)',
        reliabilityScore: 85,
        recommendation: 'New client relationship. We recommend asking for 30–50% upfront advance milestone payment.',
      });
    }

    let overdueCount = 0;
    let unpaidCount = 0;
    let paidCount = 0;
    let totalOutstanding = 0;
    const now = new Date();

    invoices.forEach((inv) => {
      if (inv.status === 'Fully Paid') {
        paidCount++;
      } else {
        unpaidCount++;
        totalOutstanding += (inv.totalINR || 0) - (inv.amountPaidINR || 0);
        if (new Date(inv.dueDate) < now) {
          overdueCount++;
        }
      }
    });

    let score = 100;
    score -= overdueCount * 25;
    score -= (unpaidCount - overdueCount) * 10;
    if (paidCount > 2) score += 10;
    score = Math.max(15, Math.min(100, score));

    let riskLevel = 'Low';
    let recommendation = 'Client has a stellar payment track record. Standard net-15 / net-30 terms apply.';

    if (score < 50) {
      riskLevel = 'High Risk';
      recommendation = 'Warning: Client has multiple overdue invoices. Require 100% upfront payment before delivering work or releasing code.';
    } else if (score < 75) {
      riskLevel = 'Moderate Risk';
      recommendation = 'Send polite payment reminders 3 days before due date. Consider tightening payment terms to Net-7.';
    }

    res.json({
      success: true,
      clientName: client.name,
      totalInvoices: invoices.length,
      paidCount,
      unpaidCount,
      overdueCount,
      totalOutstandingINR: totalOutstanding,
      reliabilityScore: score,
      riskLevel,
      recommendation,
    });
  } catch (error) {
    next(error);
  }
};
