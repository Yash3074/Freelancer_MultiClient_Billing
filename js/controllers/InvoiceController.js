import { invoiceApi } from '../services/api.js';

export class InvoiceController {
  constructor(taxEngine) {
    this.taxEngine = taxEngine;
    this.invoices = [];
  }

  async loadInvoices() {
    try {
      this.invoices = await invoiceApi.getAll();
      return this.invoices;
    } catch (err) {
      console.error('Failed to load invoices from API:', err);
      return [];
    }
  }

  async createInvoice(clientId, items, invoiceDate, dueDate, notes, status = 'Unpaid', amountPaid = 0) {
    const payload = {
      clientId,
      items,
      invoiceDate,
      dueDate,
      notes,
      status,
      amountPaid: Number(amountPaid) || 0,
    };

    const newInvoice = await invoiceApi.create(payload);
    this.invoices.unshift(newInvoice);
    return newInvoice;
  }

  async updatePaymentStatus(id, newStatus, amountPaid = 0) {
    const updated = await invoiceApi.updateStatus(id, newStatus, amountPaid);
    const index = this.invoices.findIndex(inv => (inv._id || inv.id) === id);
    if (index >= 0) {
      this.invoices[index] = updated;
    }
    return updated;
  }

  async deleteInvoice(id) {
    await invoiceApi.delete(id);
    this.invoices = this.invoices.filter(inv => (inv._id || inv.id) !== id);
  }

  getAllInvoices() {
    return this.invoices;
  }

  getInvoiceById(id) {
    return this.invoices.find(inv => (inv._id || inv.id) === id);
  }

  getRealizedGrossAnnualINR() {
    return this.invoices.reduce((sum, inv) => sum + (inv.amountPaidINR || 0), 0);
  }
}
