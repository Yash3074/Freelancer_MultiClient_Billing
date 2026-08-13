export class TaxEngine {
  constructor(config) {
    this.config = config;
  }

  convertToINR(amount, currency) {
    const rate = this.config.exchange_rates[currency] || 1.0;
    return amount * rate;
  }

  calculateGST(subtotal, isInternational) {
    if (isInternational) {
      return { gstAmount: 0, rate: 0, label: 'Export Service (0% GST)' };
    }
    const rate = this.config.gst.standard_rate_percent;
    const gstAmount = (subtotal * rate) / 100;
    return { gstAmount, rate, label: `GST (${rate}%)` };
  }

  calculateAnnualIncomeTax(grossAnnualINR, isSalaried = false) {
    const regime = this.config.tax_regime;
    const standardDeduction = isSalaried ? regime.standard_deduction : 0;
    const taxableIncome = Math.max(0, grossAnnualINR - standardDeduction);

    let grossTax = 0;
    let breakdown = [];

    for (const slab of regime.slabs) {
      if (taxableIncome > slab.min - 1) {
        const minVal = slab.min === 0 ? 0 : slab.min - 1;
        const maxVal = slab.max === null ? taxableIncome : slab.max;
        const slabApplicableIncome = Math.min(taxableIncome, maxVal) - minVal;

        if (slabApplicableIncome > 0) {
          const slabTax = (slabApplicableIncome * slab.rate) / 100;
          grossTax += slabTax;
          breakdown.push({
            slab: slab.max ? `₹${slab.min.toLocaleString()} - ₹${slab.max.toLocaleString()}` : `Above ₹${slab.min.toLocaleString()}`,
            rate: slab.rate,
            taxableAmount: slabApplicableIncome,
            tax: slabTax
          });
        }
      }
    }

    let rebate87A = 0;
    if (taxableIncome <= regime.rebate_section_87a.max_taxable_income_threshold) {
      rebate87A = Math.min(grossTax, regime.rebate_section_87a.max_rebate_amount);
    }

    const taxAfterRebate = Math.max(0, grossTax - rebate87A);
    const cess = (taxAfterRebate * regime.cess_percent) / 100;
    const totalTaxLiability = taxAfterRebate + cess;

    return {
      grossAnnualINR,
      taxableIncome,
      grossTax,
      rebate87A,
      cess,
      totalTaxLiability,
      breakdown
    };
  }
}