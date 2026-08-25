export class DashboardView {
  constructor(taxEngine, invoiceController, expenseController, freelancerTaxBenefits) {
    this.taxEngine = taxEngine;
    this.invoiceController = invoiceController;
    this.expenseController = expenseController;
    this.freelancerTaxBenefits = freelancerTaxBenefits;
  }

  update() {
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

    const tbody = document.getElementById('taxBreakdownBody');
    if (tbody) {
      tbody.innerHTML = '';
      taxProjection.breakdown.forEach(row => {
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

    const rebateEl = document.getElementById('rebateNotice');
    if (rebateEl) {
      rebateEl.style.display = taxProjection.rebate87A > 0 ? 'block' : 'none';
    }

    const invoices = this.invoiceController.getAllInvoices();
    const professionEligible = document.getElementById('freelancerProfession')?.value === 'yes';
    const cashPct = Number(document.getElementById('freelancerCashReceipts')?.value || 0);

    const ftResult = this.freelancerTaxBenefits.calculate(invoices, {
      isResident: true,
      isSpecifiedProfession: professionEligible,
      cashReceiptPercentage: cashPct
    });

    this._updateFreelancerTaxUI(ftResult);
  }

  _updateFreelancerTaxUI(result) {
    const emptyState = document.getElementById('freelancerTaxEmpty');
    const results    = document.getElementById('freelancerTaxResults');
    if (!emptyState || !results) return;

    if (!result.hasInvoices || result.invoiceCount === 0) {
      emptyState.style.display = 'block';
      results.style.display    = 'none';
      return;
    }

    emptyState.style.display = 'none';
    results.style.display    = 'block';

    this._setText('freelancerInvoiceCount', result.invoiceCount);
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
        statusEl.textContent = 'Potentially Eligible';
        statusEl.className   = 'badge badge-paid';
      } else {
        statusEl.textContent = 'Not Eligible';
        statusEl.className   = 'badge badge-unpaid';
      }
    }
  }

  _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  _fmt(n) {
    return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
}
