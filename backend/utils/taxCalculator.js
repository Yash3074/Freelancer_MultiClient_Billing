// Exchange rates against INR (Can be updated or overridden)
export const EXCHANGE_RATES = {
  INR: 1.0,
  USD: 83.5,
  EUR: 90.2,
  GBP: 105.8,
  CAD: 61.2,
  AUD: 55.4,
  AED: 22.7,
  SGD: 62.0,
  JPY: 0.54,
};

export const convertToINR = (amount, currency = 'INR') => {
  const rate = EXCHANGE_RATES[currency.toUpperCase()] || 1.0;
  return Number((amount * rate).toFixed(2));
};

export const calculateGST = (subtotal, isInternational = false) => {
  if (isInternational) {
    return {
      gstAmount: 0,
      rate: 0,
      label: 'Zero-Rated / Export Service (0% GST)',
    };
  }
  const standardRate = 18;
  const gstAmount = Number(((subtotal * standardRate) / 100).toFixed(2));
  return {
    gstAmount,
    rate: standardRate,
    label: `GST (${standardRate}%)`,
  };
};

export const calculateAnnualIncomeTax = (grossAnnualINR) => {
  const taxableIncome = Math.max(0, grossAnnualINR);

  // New Tax Regime Slabs (FY 2026-27 / FY 2025-26 updated)
  const slabs = [
    { min: 0, max: 300000, rate: 0 },
    { min: 300000, max: 700000, rate: 5 },
    { min: 700000, max: 1000000, rate: 10 },
    { min: 1000000, max: 1200000, rate: 15 },
    { min: 1200000, max: 1500000, rate: 20 },
    { min: 1500000, max: null, rate: 30 },
  ];

  let grossTax = 0;
  const breakdown = [];

  for (const slab of slabs) {
    if (taxableIncome > slab.min) {
      const slabMax = slab.max === null ? taxableIncome : slab.max;
      const applicableAmount = Math.min(taxableIncome, slabMax) - slab.min;

      if (applicableAmount > 0) {
        const slabTax = (applicableAmount * slab.rate) / 100;
        grossTax += slabTax;
        breakdown.push({
          slab: slab.max
            ? `₹${slab.min.toLocaleString('en-IN')} - ₹${slab.max.toLocaleString('en-IN')}`
            : `Above ₹${slab.min.toLocaleString('en-IN')}`,
          rate: slab.rate,
          taxableAmount: applicableAmount,
          tax: Number(slabTax.toFixed(2)),
        });
      }
    }
  }

  // Section 87A Rebate (up to ₹12 Lakhs under revised budget)
  let rebate87A = 0;
  if (taxableIncome <= 1200000) {
    rebate87A = grossTax;
  }

  const taxAfterRebate = Math.max(0, grossTax - rebate87A);
  const cess = Number(((taxAfterRebate * 4) / 100).toFixed(2));
  const totalTaxLiability = Number((taxAfterRebate + cess).toFixed(2));

  return {
    grossAnnualINR,
    taxableIncome,
    grossTax: Number(grossTax.toFixed(2)),
    rebate87A: Number(rebate87A.toFixed(2)),
    cess,
    totalTaxLiability,
    breakdown,
  };
};

export const calculate44ADABenefits = (grossReceiptsINR, isSpecifiedProfession = true, cashPercent = 0) => {
  const receiptLimit = cashPercent <= 5 ? 7500000 : 5000000;
  const eligible44ADA = isSpecifiedProfession && grossReceiptsINR <= receiptLimit;

  const presumptiveIncome = eligible44ADA ? grossReceiptsINR * 0.5 : grossReceiptsINR;

  const taxWithout = calculateAnnualIncomeTax(grossReceiptsINR);
  const taxWith = calculateAnnualIncomeTax(presumptiveIncome);

  const estimatedTaxSaving = Math.max(0, taxWithout.totalTaxLiability - taxWith.totalTaxLiability);

  let message = '';
  if (!isSpecifiedProfession) {
    message = 'Section 44ADA applies only to specified professions (Tech, Engineering, Legal, etc.).';
  } else if (grossReceiptsINR > receiptLimit) {
    message = `Receipts exceed the ₹${(receiptLimit / 100000).toFixed(0)} Lakh limit for presumptive taxation.`;
  } else {
    message = 'Eligible under Section 44ADA! You only pay tax on 50% of your gross professional receipts.';
  }

  return {
    grossReceipts: grossReceiptsINR,
    receiptLimit,
    eligible44ADA,
    presumptiveIncome: Number(presumptiveIncome.toFixed(2)),
    taxWithout44ADA: taxWithout.totalTaxLiability,
    taxWith44ADA: taxWith.totalTaxLiability,
    estimatedTaxSaving: Number(estimatedTaxSaving.toFixed(2)),
    message,
  };
};
