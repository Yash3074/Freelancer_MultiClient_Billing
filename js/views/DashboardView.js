import { taxApi } from '../services/api.js';

export class DashboardView {
  constructor(taxEngine, invoiceController, expenseController, freelancerTaxBenefits) {
    this.taxEngine = taxEngine;
    this.invoiceController = invoiceController;
    this.expenseController = expenseController;
    this.freelancerTaxBenefits = freelancerTaxBenefits;
    this._bindExportButton();
  }

  async update() {
    const cashPct = Number(document.getElementById('freelancerCashReceipts')?.value || 0);

    try {
      // Fetch comprehensive calculated financials from backend
      const data = await taxApi.getDashboard(cashPct);
      const { metrics, regularTax, freelancerBenefits } = data;

      this._setText('dashGrossIncome', `₹${this._fmt(metrics.grossRealizedINR)}`);
      this._setText('dashTaxLiability', `₹${this._fmt(regularTax.totalTaxLiability)}`);
      this._setText('dashNetIncome', `₹${this._fmt(metrics.netBeforeTax - regularTax.totalTaxLiability)}`);
      this._setText('dashTotalExpenses', `₹${this._fmt(metrics.totalExpenses)}`);
      this._setText('dashRealNetIncome', `₹${this._fmt(metrics.realNetTakeHome)}`);

      // Tax breakdown table
      const tbody = document.getElementById('taxBreakdownBody');
      if (tbody && regularTax.breakdown) {
        tbody.innerHTML = '';
        regularTax.breakdown.forEach(row => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${row.slab}</td>
            <td>${row.rate}%</td>
            <td>₹${row.taxableAmount.toLocaleString('en-IN')}</td>
            <td>₹${row.tax.toLocaleString('en-IN')}</td>
          `;
          tbody.appendChild(tr);
        });
      }

      // Rebate notice
      const rebateEl = document.getElementById('rebateNotice');
      if (rebateEl) {
        rebateEl.style.display = regularTax.rebate87A > 0 ? 'block' : 'none';
      }

      // 44ADA Presumptive Tax UI
      this._updateFreelancerTaxUI(freelancerBenefits);
    } catch (err) {
      console.warn('Backend tax dashboard calculation fallback to local calculation:', err.message);
      this._fallbackLocalUpdate();
    }
  }

  _fallbackLocalUpdate() {
    const grossRealizedINR = this.invoiceController.getRealizedGrossAnnualINR();
    const taxProjection = this.taxEngine.calculateAnnualIncomeTax(grossRealizedINR);
    const totalExpenses = this.expenseController.getTotalExpenses();
    const netAfterTax = grossRealizedINR - taxProjection.totalTaxLiability;
    const realNet = netAfterTax - totalExpenses;

    this._setText('dashGrossIncome', `₹${this._fmt(grossRealizedINR)}`);
    this._setText('dashTaxLiability', `₹${this._fmt(taxProjection.totalTaxLiability)}`);
    this._setText('dashNetIncome', `₹${this._fmt(netAfterTax)}`);
    this._setText('dashTotalExpenses', `₹${this._fmt(totalExpenses)}`);
    this._setText('dashRealNetIncome', `₹${this._fmt(realNet)}`);
  }

  _updateFreelancerTaxUI(result) {
    const emptyState = document.getElementById('freelancerTaxEmpty');
    const results = document.getElementById('freelancerTaxResults');
    if (!emptyState || !results) return;

    if (!result || result.grossReceipts === 0) {
      emptyState.style.display = 'block';
      results.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    results.style.display = 'block';

    const invCount = this.invoiceController.getAllInvoices().length;
    this._setText('freelancerInvoiceCount', invCount);
    this._setText('freelancerGrossReceipts', `₹${this._fmt(result.grossReceipts)}`);
    this._setText('freelancer44ADALimit', `₹${result.receiptLimit.toLocaleString('en-IN')}`);
    this._setText('freelancerPresumptiveIncome', `₹${this._fmt(result.presumptiveIncome)}`);
    this._setText('freelancerTaxWithout', `₹${this._fmt(result.taxWithout44ADA)}`);
    this._setText('freelancerTaxWith', `₹${this._fmt(result.taxWith44ADA)}`);
    this._setText('freelancerTaxSaving', `₹${this._fmt(result.estimatedTaxSaving)}`);
    this._setText('freelancerTaxMessage', result.message);

    const statusEl = document.getElementById('freelancer44ADAStatus');
    if (statusEl) {
      if (result.eligible44ADA) {
        statusEl.textContent = 'Eligible under Sec 44ADA';
        statusEl.className = 'badge badge-paid';
      } else {
        statusEl.textContent = 'Standard Tax Regime';
        statusEl.className = 'badge badge-unpaid';
      }
    }
  }

  _bindExportButton() {
    const btn = document.getElementById('btnExportFinancials');
    if (!btn) return;

    btn.onclick = () => {
      const invoices = this.invoiceController.getAllInvoices();
      const expenses = this.expenseController.getAllExpenses();

      let csv = 'Type,ID/Number,Entity,Date,Amount,Currency,INR Value,Status\n';

      invoices.forEach(inv => {
        csv += `Invoice,"${inv.invoiceNumber || inv.id}","${inv.client?.name || 'N/A'}",${inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split('T')[0] : ''},${inv.totalAmount},${inv.currency},${inv.totalINR || 0},"${inv.status}"\n`;
      });

      expenses.forEach(exp => {
        csv += `Expense,"${exp._id || exp.id}","${exp.category}",${exp.date ? new Date(exp.date).toISOString().split('T')[0] : ''},${exp.amount},INR,${exp.amount},Paid\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TaxPulse_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      window.dispatchEvent(new CustomEvent('toast:success', { detail: 'Financial Report CSV downloaded!' }));
    };
  }

  _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  _fmt(n) {
    return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
}
