/*
 * Freelancer Tax Benefits
 * Developed by Yashit3075
 *
 * Section 44ADA:
 * Presumptive taxation for eligible specified professionals.
 *
 * The calculation is invoice-based. If there are no invoices,
 * no freelancer tax benefit is considered.
 */

export class FreelancerTaxBenefits {

    constructor(taxEngine) {
        this.taxEngine = taxEngine;
    }

    calculate(invoices, options = {}) {

        /*
         * --------------------------------------------------
         * STEP 1: No invoices = no benefit calculation
         * --------------------------------------------------
         */

        if (!Array.isArray(invoices) || invoices.length === 0) {

            return {
                hasInvoices: false,
                invoiceCount: 0,
                grossReceipts: 0,
                presumptiveIncome: 0,
                eligible44ADA: false,
                taxWithout44ADA: 0,
                taxWith44ADA: 0,
                estimatedTaxSaving: 0,
                message:
                    'Add an invoice to calculate freelancer tax benefits.'
            };
        }


        /*
         * --------------------------------------------------
         * STEP 2: Get user's eligibility information
         * --------------------------------------------------
         */

        const isResident =
            options.isResident === true;

        const isSpecifiedProfession =
            options.isSpecifiedProfession === true;

        const cashReceiptPercentage =
            Number(options.cashReceiptPercentage || 0);


        /*
         * --------------------------------------------------
         * STEP 3: Calculate realized receipts
         *
         * We use amountPaidINR because the existing application
         * already treats collected payments as realized income.
         * --------------------------------------------------
         */

        const grossReceipts =
            invoices.reduce((total, invoice) => {

                const paidAmount =
                    Number(invoice.amountPaidINR || 0);

                return total + paidAmount;

            }, 0);


        /*
         * --------------------------------------------------
         * STEP 4: Determine the applicable 44ADA limit
         *
         * <= 5% cash receipts:
         *       ₹75 lakh
         *
         * Otherwise:
         *       ₹50 lakh
         * --------------------------------------------------
         */

        const receiptLimit =
            cashReceiptPercentage <= 5
                ? 7500000
                : 5000000;


        /*
         * --------------------------------------------------
         * STEP 5: Check 44ADA eligibility
         * --------------------------------------------------
         */

        const eligible44ADA =
            isResident &&
            isSpecifiedProfession &&
            grossReceipts <= receiptLimit;


        /*
         * --------------------------------------------------
         * STEP 6: Calculate presumptive income
         *
         * Section 44ADA:
         *
         * Presumptive income = 50% of gross receipts
         * --------------------------------------------------
         */

        const presumptiveIncome =
            eligible44ADA
                ? grossReceipts * 0.50
                : grossReceipts;


        /*
         * --------------------------------------------------
         * STEP 7: Compare tax with and without 44ADA
         *
         * We reuse the existing TaxEngine rather than
         * duplicating the project's tax calculation.
         * --------------------------------------------------
         */

        const taxWithout44ADA =
            this.taxEngine.calculateAnnualIncomeTax(
                grossReceipts
            );


        const taxWith44ADA =
            this.taxEngine.calculateAnnualIncomeTax(
                presumptiveIncome
            );


        /*
         * --------------------------------------------------
         * STEP 8: Calculate estimated tax saving
         * --------------------------------------------------
         */

        const estimatedTaxSaving =
            Math.max(
                0,
                taxWithout44ADA.totalTaxLiability -
                taxWith44ADA.totalTaxLiability
            );


        /*
         * --------------------------------------------------
         * STEP 9: User-friendly eligibility message
         * --------------------------------------------------
         */

        let message;

        if (!isResident) {

            message =
                '44ADA applies to eligible resident taxpayers.';

        } else if (!isSpecifiedProfession) {

            message =
                '44ADA applies to specified professions.';

        } else if (grossReceipts > receiptLimit) {

            message =
                'Professional receipts exceed the applicable 44ADA limit.';

        } else {

            message =
                'You may be eligible to declare 50% of eligible gross receipts as presumptive professional income under Section 44ADA.';
        }


        /*
         * --------------------------------------------------
         * STEP 10: Return complete result
         * --------------------------------------------------
         */

        return {

            hasInvoices: true,

            invoiceCount:
                invoices.length,

            grossReceipts,

            receiptLimit,

            presumptiveIncome,

            eligible44ADA,

            taxWithout44ADA:
                taxWithout44ADA.totalTaxLiability,

            taxWith44ADA:
                taxWith44ADA.totalTaxLiability,

            estimatedTaxSaving,

            message
        };
    }
}