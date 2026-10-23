import { Invoice } from '../models/Invoice.js';
import { Expense } from '../models/Expense.js';
import {
  calculateAnnualIncomeTax,
  calculate44ADABenefits,
} from '../utils/taxCalculator.js';

// @desc    Get dashboard metrics, progressive tax breakdown, & 44ADA calculation
// @route   GET /api/v1/tax/dashboard
// @access  Private
export const getDashboardMetrics = async (req, res, next) => {
  try {
    const user = req.user;
    const [invoices, expenses] = await Promise.all([
      Invoice.find({ user: user._id }).populate('client', 'name currency'),
      Expense.find({ user: user._id }),
    ]);

    // Financial totals
    let grossRealizedINR = 0;
    let totalInvoicedINR = 0;
    let outstandingINR = 0;
    const invoiceStatusCounts = { 'Fully Paid': 0, 'Partially Paid': 0, Unpaid: 0, Overdue: 0 };
    const clientRevenueMap = {};
    const monthlyRevenueMap = {};

    invoices.forEach((inv) => {
      totalInvoicedINR += inv.totalINR || 0;
      grossRealizedINR += inv.amountPaidINR || 0;

      const remainingINR = Math.max(0, (inv.totalINR || 0) - (inv.amountPaidINR || 0));
      if (inv.status !== 'Fully Paid') {
        outstandingINR += remainingINR;
      }

      invoiceStatusCounts[inv.status] = (invoiceStatusCounts[inv.status] || 0) + 1;

      // Group revenue by client
      const clientName = inv.client?.name || 'Unknown Client';
      clientRevenueMap[clientName] = (clientRevenueMap[clientName] || 0) + (inv.amountPaidINR || 0);

      // Group revenue by month
      const date = new Date(inv.invoiceDate || inv.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenueMap[monthKey] = (monthlyRevenueMap[monthKey] || 0) + (inv.amountPaidINR || 0);
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netBeforeTax = Math.max(0, grossRealizedINR - totalExpenses);

    // Calculate Progressive Income Tax under regular regime
    const regularTax = calculateAnnualIncomeTax(grossRealizedINR);

    // Calculate 44ADA Benefits
    const cashPercent = Number(req.query.cashPercent) || 0;
    const isSpecifiedProfession = user.isSpecifiedProfession !== false;
    const freelancerBenefits = calculate44ADABenefits(
      grossRealizedINR,
      isSpecifiedProfession,
      cashPercent
    );

    // Real Net Take Home (Realized - Expenses - Estimated Tax)
    const effectiveTax = freelancerBenefits.eligible44ADA
      ? freelancerBenefits.taxWith44ADA
      : regularTax.totalTaxLiability;
    const realNetTakeHome = Math.max(0, grossRealizedINR - totalExpenses - effectiveTax);

    res.json({
      success: true,
      metrics: {
        grossRealizedINR: Number(grossRealizedINR.toFixed(2)),
        totalInvoicedINR: Number(totalInvoicedINR.toFixed(2)),
        outstandingINR: Number(outstandingINR.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        netBeforeTax: Number(netBeforeTax.toFixed(2)),
        realNetTakeHome: Number(realNetTakeHome.toFixed(2)),
        effectiveTax: Number(effectiveTax.toFixed(2)),
        invoiceCount: invoices.length,
      },
      regularTax,
      freelancerBenefits,
      analytics: {
        invoiceStatusCounts,
        clientRevenue: Object.entries(clientRevenueMap)
          .map(([name, amount]) => ({ name, amount: Number(amount.toFixed(2)) }))
          .sort((a, b) => b.amount - a.amount),
        monthlyRevenue: Object.entries(monthlyRevenueMap)
          .map(([month, amount]) => ({ month, amount: Number(amount.toFixed(2)) }))
          .sort((a, b) => a.month.localeCompare(b.month)),
      },
    });
  } catch (error) {
    next(error);
  }
};
