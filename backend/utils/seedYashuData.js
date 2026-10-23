import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Client } from '../models/Client.js';
import { Invoice } from '../models/Invoice.js';
import { Expense } from '../models/Expense.js';

dotenv.config();

const EXCHANGE_RATES = {
  INR: 1.0,
  USD: 95.20,
  EUR: 103.50,
  GBP: 121.80,
  AED: 25.92,
  SGD: 71.40,
};

async function seedAccount() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected successfully.');

    // 1. Find User
    let user = await User.findOne({ email: 'yashusingla@chitkara.edu.in' });
    if (!user) {
      console.log('User not found. Creating user...');
      user = new User({
        name: 'Yashu Singla',
        email: 'yashusingla@chitkara.edu.in',
        password: 'Yashu@2006',
      });
    }

    // Update Profile with full details
    user.name = 'Yashu Singla';
    user.password = 'Yashu@2006';
    user.businessName = 'Singla Digital & AI Consulting';
    user.profession = 'Software Developer / IT Consultant';
    user.isSpecifiedProfession = true;
    user.phone = '+91 98765 43210';
    user.country = 'India';
    user.currency = 'INR';
    user.address = 'Tower 4, Cyber City, Chandigarh, India';
    user.gstin = '07AAAAA0000A1Z5';
    user.pan = 'AYKPS1024F';
    user.upiId = 'yashu@okhdfcbank';
    user.bankDetails = {
      bankName: 'HDFC Bank',
      accountNumber: '50100452391024',
      ifscCode: 'HDFC0001234',
      swiftBic: 'HDFCINBB',
    };

    await user.save();
    console.log('User profile and password Yashu@2006 saved.');

    // 2. Clean old records for this user
    await Promise.all([
      Client.deleteMany({ user: user._id }),
      Invoice.deleteMany({ user: user._id }),
      Expense.deleteMany({ user: user._id }),
    ]);
    console.log('Cleared old test records.');

    // 3. Create 6 Diverse Clients
    const clientData = [
      {
        name: 'Adverb Consultancy Ltd',
        email: 'billing@adverb.co.uk',
        company: 'Adverb Private Limited',
        country: 'United Kingdom',
        currency: 'GBP',
        gstin: 'N/A',
        address: '10 Finsbury Square, London, EC2A 1AF, United Kingdom',
        phone: '+44 20 7946 0912',
        paymentTermsDays: 15,
      },
      {
        name: 'Nexis Cloud Technologies Inc',
        email: 'accounts@nexiscloud.io',
        company: 'Nexis Cloud Inc.',
        country: 'United States',
        currency: 'USD',
        gstin: 'N/A',
        address: '500 Howard Street, Suite 400, San Francisco, CA 94105, USA',
        phone: '+1 415 555 0198',
        paymentTermsDays: 30,
      },
      {
        name: 'Starlight Digital Interactive GmbH',
        email: 'finance@starlight-digital.de',
        company: 'Starlight Digital GmbH',
        country: 'Germany',
        currency: 'EUR',
        gstin: 'N/A',
        address: 'Friedrichstraße 45, 10117 Berlin, Germany',
        phone: '+49 30 12345678',
        paymentTermsDays: 14,
      },
      {
        name: 'Vertex AI Solutions Pte Ltd',
        email: 'payments@vertexai.sg',
        company: 'Vertex AI Solutions',
        country: 'Singapore',
        currency: 'SGD',
        gstin: 'N/A',
        address: '1 Raffles Place, #20-01, One Raffles Place, Singapore 048616',
        phone: '+65 6789 0123',
        paymentTermsDays: 15,
      },
      {
        name: 'Falcon FinTech FZ-LLC',
        email: 'invoices@falconfintech.ae',
        company: 'Falcon FinTech Group',
        country: 'United Arab Emirates',
        currency: 'AED',
        gstin: 'N/A',
        address: 'Dubai Internet City, Building 3, Dubai, UAE',
        phone: '+971 4 391 0000',
        paymentTermsDays: 15,
      },
      {
        name: 'Bharat Cloud Solutions LLP',
        email: 'vendor-desk@bharatcloud.in',
        company: 'Bharat Cloud Solutions LLP',
        country: 'India',
        currency: 'INR',
        gstin: '06AABCB1234A1Z1',
        address: 'DLF Cyber City, Tower B, Phase 2, Gurugram, Haryana 122002',
        phone: '+91 124 456 7890',
        paymentTermsDays: 15,
      },
    ];

    const createdClients = await Client.insertMany(
      clientData.map(c => ({ ...c, user: user._id }))
    );
    console.log(`Created ${createdClients.length} clients.`);

    const clientMap = {};
    createdClients.forEach(c => {
      clientMap[c.name] = c;
    });

    // 4. Create 16 Invoices Spanning November 2025 to October 2026
    const invoicesRaw = [
      {
        clientName: 'Nexis Cloud Technologies Inc',
        invoiceNumber: 'INV-2025-001',
        date: '2025-11-10',
        dueDate: '2025-11-25',
        currency: 'USD',
        status: 'Fully Paid',
        items: [
          { description: 'Cloud Architecture & Kubernetes Microservices (80 hrs)', quantity: 80, rate: 40, amount: 3200 },
        ],
        amountPaid: 3200,
        notes: 'Monthly engineering retainer for AWS EKS deployment. Wire transfer settled.',
      },
      {
        clientName: 'Adverb Consultancy Ltd',
        invoiceNumber: 'INV-2025-002',
        date: '2025-12-05',
        dueDate: '2025-12-20',
        currency: 'GBP',
        status: 'Fully Paid',
        items: [
          { description: 'Fintech Backend Integration & Stripe Webhooks', quantity: 60, rate: 40, amount: 2400 },
        ],
        amountPaid: 2400,
        notes: 'Deliverable complete. Settled via international wire transfer.',
      },
      {
        clientName: 'Starlight Digital Interactive GmbH',
        invoiceNumber: 'INV-2026-003',
        date: '2026-01-12',
        dueDate: '2026-01-26',
        currency: 'EUR',
        status: 'Fully Paid',
        items: [
          { description: 'React Frontend Performance Optimization & Core Web Vitals', quantity: 70, rate: 40, amount: 2800 },
        ],
        amountPaid: 2800,
        notes: 'Zero-rated export of services under LUT.',
      },
      {
        clientName: 'Bharat Cloud Solutions LLP',
        invoiceNumber: 'INV-2026-004',
        date: '2026-01-22',
        dueDate: '2026-02-06',
        currency: 'INR',
        status: 'Fully Paid',
        items: [
          { description: 'Node.js Enterprise API Architecture & High-Concurrency Caching', quantity: 1, rate: 150000, amount: 150000 },
        ],
        amountPaid: 177000,
        notes: 'Domestic invoice with 18% GST. Paid via UPI QR / IMPS.',
      },
      {
        clientName: 'Nexis Cloud Technologies Inc',
        invoiceNumber: 'INV-2026-005',
        date: '2026-02-14',
        dueDate: '2026-03-01',
        currency: 'USD',
        status: 'Fully Paid',
        items: [
          { description: 'AI Agent Pipelines & Vector Database Architecture', quantity: 70, rate: 50, amount: 3500 },
        ],
        amountPaid: 3500,
        notes: 'Sprint milestone 2 completed.',
      },
      {
        clientName: 'Vertex AI Solutions Pte Ltd',
        invoiceNumber: 'INV-2026-006',
        date: '2026-03-05',
        dueDate: '2026-03-20',
        currency: 'SGD',
        status: 'Fully Paid',
        items: [
          { description: 'LangChain & RAG Context Engine Integration', quantity: 70, rate: 60, amount: 4200 },
        ],
        amountPaid: 4200,
        notes: 'Singapore export of tech services.',
      },
      {
        clientName: 'Falcon FinTech FZ-LLC',
        invoiceNumber: 'INV-2026-007',
        date: '2026-03-24',
        dueDate: '2026-04-08',
        currency: 'AED',
        status: 'Fully Paid',
        items: [
          { description: 'Payment Gateway Security Hardening & Audit', quantity: 1, rate: 11500, amount: 11500 },
        ],
        amountPaid: 11500,
        notes: 'Dubai project delivery.',
      },
      {
        clientName: 'Adverb Consultancy Ltd',
        invoiceNumber: 'INV-2026-008',
        date: '2026-04-10',
        dueDate: '2026-04-25',
        currency: 'GBP',
        status: 'Fully Paid',
        items: [
          { description: 'Full-Stack Developer Retainer (April 2026)', quantity: 65, rate: 40, amount: 2600 },
        ],
        amountPaid: 2600,
        notes: 'FY 2026-27 Kickoff milestone.',
      },
      {
        clientName: 'Starlight Digital Interactive GmbH',
        invoiceNumber: 'INV-2026-009',
        date: '2026-05-08',
        dueDate: '2026-05-22',
        currency: 'EUR',
        status: 'Fully Paid',
        items: [
          { description: 'Next.js 15 Migration & Edge SSR Deployments', quantity: 75, rate: 40, amount: 3000 },
        ],
        amountPaid: 3000,
        notes: 'Sprint successfully concluded.',
      },
      {
        clientName: 'Nexis Cloud Technologies Inc',
        invoiceNumber: 'INV-2026-010',
        date: '2026-06-15',
        dueDate: '2026-06-30',
        currency: 'USD',
        status: 'Fully Paid',
        items: [
          { description: 'AI Evaluation & Benchmarking Infrastructure', quantity: 76, rate: 50, amount: 3800 },
        ],
        amountPaid: 3800,
        notes: 'Settled via ACH/Wire transfer.',
      },
      {
        clientName: 'Bharat Cloud Solutions LLP',
        invoiceNumber: 'INV-2026-011',
        date: '2026-07-06',
        dueDate: '2026-07-21',
        currency: 'INR',
        status: 'Fully Paid',
        items: [
          { description: 'Distributed Database Sharding & Read Replicas Setup', quantity: 1, rate: 220000, amount: 220000 },
        ],
        amountPaid: 259600,
        notes: 'Settled via instant UPI QR payment.',
      },
      {
        clientName: 'Vertex AI Solutions Pte Ltd',
        invoiceNumber: 'INV-2026-012',
        date: '2026-08-11',
        dueDate: '2026-08-26',
        currency: 'SGD',
        status: 'Fully Paid',
        items: [
          { description: 'FastAPI Backend & Autonomous Worker Queue', quantity: 75, rate: 60, amount: 4500 },
        ],
        amountPaid: 4500,
        notes: 'August sprint deliverables.',
      },
      {
        clientName: 'Adverb Consultancy Ltd',
        invoiceNumber: 'INV-2026-013',
        date: '2026-09-04',
        dueDate: '2026-09-19',
        currency: 'GBP',
        status: 'Fully Paid',
        items: [
          { description: 'Scalable Micro-Frontend Architecture', quantity: 70, rate: 40, amount: 2800 },
        ],
        amountPaid: 2800,
        notes: 'Quarter 3 retainer settled.',
      },
      {
        clientName: 'Falcon FinTech FZ-LLC',
        invoiceNumber: 'INV-2026-014',
        date: '2026-09-22',
        dueDate: '2026-10-07',
        currency: 'AED',
        status: 'Fully Paid',
        items: [
          { description: 'Real-time WebSocket Notification Gateway', quantity: 1, rate: 12000, amount: 12000 },
        ],
        amountPaid: 12000,
        notes: 'September delivery settled.',
      },
      {
        clientName: 'Nexis Cloud Technologies Inc',
        invoiceNumber: 'INV-2026-015',
        date: '2026-10-02',
        dueDate: '2026-10-20',
        currency: 'USD',
        status: 'Partially Paid',
        items: [
          { description: 'Autonomous Agent Orchestration Framework (Phase 1 & 2)', quantity: 80, rate: 50, amount: 4000 },
        ],
        amountPaid: 2000,
        notes: '50% milestone advance payment received. Balance due upon Phase 2 sign-off.',
      },
      {
        clientName: 'Starlight Digital Interactive GmbH',
        invoiceNumber: 'INV-2026-016',
        date: '2026-10-14',
        dueDate: '2026-11-04',
        currency: 'EUR',
        status: 'Unpaid',
        items: [
          { description: 'Design System & Tailwind Component Library Modernization', quantity: 80, rate: 40, amount: 3200 },
        ],
        amountPaid: 0,
        notes: 'Invoice in payment grace period. Due by Nov 04, 2026.',
      },
    ];

    const invoicesToInsert = invoicesRaw.map(inv => {
      const client = clientMap[inv.clientName];
      const isInternational = client.currency !== 'INR';
      const fxRate = EXCHANGE_RATES[client.currency] || 1.0;

      const subtotal = inv.items.reduce((sum, item) => sum + item.amount, 0);
      const gstRate = isInternational ? 0 : 18;
      const gstAmount = isInternational ? 0 : (subtotal * gstRate) / 100;
      const totalAmount = subtotal + gstAmount;
      const totalINR = totalAmount * fxRate;
      const amountPaidINR = inv.amountPaid * fxRate;

      return {
        user: user._id,
        client: client._id,
        invoiceNumber: inv.invoiceNumber,
        items: inv.items,
        currency: client.currency,
        exchangeRateToINR: fxRate,
        subtotal,
        gstRate,
        gstAmount,
        totalAmount,
        totalINR,
        status: inv.status,
        amountPaid: inv.amountPaid,
        amountPaidINR,
        isInternational,
        invoiceDate: new Date(inv.date),
        dueDate: new Date(inv.dueDate),
        notes: inv.notes,
        publicShareToken: crypto.randomBytes(16).toString('hex'),
      };
    });

    const createdInvoices = await Invoice.insertMany(invoicesToInsert);
    console.log(`Created ${createdInvoices.length} invoices spanning 1 full year.`);

    // 5. Create 24 Business Expenses Across 1 Year
    const expensesRaw = [
      // Software & Subscriptions
      { desc: 'AWS Cloud EC2 & RDS Cluster Hosting (Nov 2025)', category: 'Software & Subscriptions', amount: 16500, date: '2025-11-05' },
      { desc: 'GitHub Enterprise & Copilot Subscription', category: 'Software & Subscriptions', amount: 3400, date: '2025-11-18' },
      { desc: 'AWS Cloud Hosting & S3 Storage (Dec 2025)', category: 'Software & Subscriptions', amount: 17200, date: '2025-12-05' },
      { desc: 'ChatGPT Plus & Anthropic API Credits', category: 'Software & Subscriptions', amount: 7500, date: '2025-12-15' },
      { desc: 'AWS Cloud Infrastructure (Jan 2026)', category: 'Software & Subscriptions', amount: 18400, date: '2026-01-05' },
      { desc: 'JetBrains All Products Pack License (Annual)', category: 'Software & Subscriptions', amount: 19800, date: '2026-01-20' },
      { desc: 'AWS Cloud Hosting (Feb 2026)', category: 'Software & Subscriptions', amount: 16800, date: '2026-02-05' },
      { desc: 'Figma Organization Annual Design License', category: 'Software & Subscriptions', amount: 14400, date: '2026-02-18' },
      { desc: 'AWS Cloud Hosting & Cloudflare Enterprise (Mar 2026)', category: 'Software & Subscriptions', amount: 19200, date: '2026-03-05' },
      { desc: 'OpenAI API Token Usage for Client RAG Pipelines', category: 'Software & Subscriptions', amount: 8900, date: '2026-03-22' },
      { desc: 'AWS Cloud Infrastructure (Apr 2026)', category: 'Software & Subscriptions', amount: 17800, date: '2026-04-05' },
      { desc: 'MongoDB Atlas Dedicated Cluster Hosting', category: 'Software & Subscriptions', amount: 8200, date: '2026-05-02' },
      { desc: 'AWS Cloud Hosting (Jun 2026)', category: 'Software & Subscriptions', amount: 18500, date: '2026-06-05' },
      { desc: 'AWS Cloud Hosting (Jul 2026)', category: 'Software & Subscriptions', amount: 19100, date: '2026-07-05' },
      { desc: 'AWS Cloud Hosting (Aug 2026)', category: 'Software & Subscriptions', amount: 17600, date: '2026-08-05' },
      { desc: 'Google Workspace Business Email (Annual)', category: 'Software & Subscriptions', amount: 12600, date: '2026-09-01' },
      { desc: 'AWS Cloud Infrastructure (Sep 2026)', category: 'Software & Subscriptions', amount: 18900, date: '2026-09-05' },
      { desc: 'AWS Cloud Infrastructure (Oct 2026)', category: 'Software & Subscriptions', amount: 19400, date: '2026-10-05' },

      // Equipment & Hardware
      { desc: 'Apple MacBook Pro M3 Max 36GB Development Rig', category: 'Equipment', amount: 249900, date: '2026-01-15' },
      { desc: 'Dell UltraSharp 32-inch 4K USB-C Monitor', category: 'Equipment', amount: 54000, date: '2026-04-18' },

      // Office & Rent / Internet
      { desc: 'WeWork Coworking Desk (Quarter 1)', category: 'Office & Rent', amount: 48000, date: '2026-01-08' },
      { desc: 'WeWork Coworking Desk (Quarter 2)', category: 'Office & Rent', amount: 48000, date: '2026-04-08' },
      { desc: 'WeWork Coworking Desk (Quarter 3)', category: 'Office & Rent', amount: 48000, date: '2026-07-08' },

      // Professional Fees & Legal
      { desc: 'Chartered Accountant Tax Advisory & Retainer Fee', category: 'Professional Fees', amount: 25000, date: '2026-03-28' },

      // Travel & Client Visits
      { desc: 'Flights & Hotel for Bangalore Tech Leadership Summit', category: 'Travel', amount: 28600, date: '2026-07-18' },
    ];

    const expensesToInsert = expensesRaw.map(exp => ({
      user: user._id,
      description: exp.desc,
      category: exp.category,
      amount: exp.amount,
      date: new Date(exp.date),
      receiptUrl: '/uploads/receipts/sample_receipt.png',
      receiptOriginalName: 'tax_invoice_receipt.png',
      notes: 'Logged for business tax deduction',
    }));

    const createdExpenses = await Expense.insertMany(expensesToInsert);
    console.log(`Created ${createdExpenses.length} business expenses.`);

    console.log('\n=========================================');
    console.log('✅ TEST ACCOUNT SEEDING COMPLETE');
    console.log('Email:', user.email);
    console.log('Password: Yashu@2006');
    console.log('Clients:', createdClients.length);
    console.log('Invoices:', createdInvoices.length);
    console.log('Expenses:', createdExpenses.length);
    console.log('=========================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding account:', err);
    process.exit(1);
  }
}

seedAccount();
