import { Storage } from '../models/Storage.js';

export class InvoiceController {
  constructor(taxEngine, userId) {
    this.taxEngine = taxEngine;
    this.userId = userId;
    this.invoices = Storage.getInvoices(this.userId);
  }

  createInvoice(client, items, invoiceDate, dueDate, notes, status = 'Unpaid', amountPaid = 0) {
    let subtotal = 0;
    items.forEach(item => {
      subtotal += Number(item.quantity) * Number(item.rate);
    });

    const isInternational = client.currency !== 'INR' || client.country !== 'India';
    const gstInfo = this.taxEngine.calculateGST(subtotal, isInternational);
    const totalAmount = subtotal + gstInfo.gstAmount;
    const totalINR = this.taxEngine.convertToINR(totalAmount, client.currency);

    let actualPaid = Number(amountPaid);
    if (status === 'Fully Paid') actualPaid = totalAmount;
    if (status === 'Unpaid') actualPaid = 0;

    const actualPaidINR = this.taxEngine.convertToINR(actualPaid, client.currency);

    const invoice = {
      id: 'INV-' + Math.floor(100000 + Math.random() * 900000),
      userId: this.userId,
      client,
      items,
      currency: client.currency,
      subtotal,
      gstRate: gstInfo.rate,
      gstAmount: gstInfo.gstAmount,
      totalAmount,
      totalINR,
      status, // 'Fully Paid', 'Partially Paid', 'Unpaid'
      amountPaid: actualPaid,
      amountPaidINR: actualPaidINR,
      isInternational,
      invoiceDate,
      dueDate,
      notes,
      createdAt: new Date().toISOString()
    };

    this.invoices.push(invoice);
    Storage.saveInvoices(this.invoices, this.userId);
    return invoice;
  }

  updatePaymentStatus(id, newStatus, amountPaid = 0) {
    const invoice = this.invoices.find(inv => inv.id === id);
    if (!invoice) return;

    invoice.status = newStatus;
    if (newStatus === 'Fully Paid') {
      invoice.amountPaid = invoice.totalAmount;
    } else if (newStatus === 'Unpaid') {
      invoice.amountPaid = 0;
    } else {
      invoice.amountPaid = Math.min(Number(amountPaid), invoice.totalAmount);
    }

    invoice.amountPaidINR = this.taxEngine.convertToINR(invoice.amountPaid, invoice.currency);
    Storage.saveInvoices(this.invoices, this.userId);
  }

  deleteInvoice(id) {
    this.invoices = this.invoices.filter(inv => inv.id !== id);
    Storage.saveInvoices(this.invoices, this.userId);
  }

  getAllInvoices() {
    return this.invoices;
  }

  getRealizedGrossAnnualINR() {
    return this.invoices.reduce((sum, inv) => sum + (inv.amountPaidINR || 0), 0);
  }
}