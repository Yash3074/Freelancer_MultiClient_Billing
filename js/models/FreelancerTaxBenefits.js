export class FreelancerTaxBenefits {

    constructor(taxEngine) {
        this.taxEngine = taxEngine;
    }

    calculate(invoices, options = {}) {

        

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

     const isResident =
            options.isResident === true;

        const isSpecifiedProfession =
            options.isSpecifiedProfession === true;

        const cashReceiptPercentage =
            Number(options.cashReceiptPercentage || 0);


        const grossReceipts =
            invoices.reduce((total, invoice) => {

                const paidAmount =
                    Number(invoice.amountPaidINR || 0);

                return total + paidAmount;

            }, 0);


    const receiptLimit =
            cashReceiptPercentage <= 5
                ? 7500000
                : 5000000;


        const eligible44ADA =
            isResident &&
            isSpecifiedProfession &&
            grossReceipts <= receiptLimit;


        const presumptiveIncome =
            eligible44ADA
                ? grossReceipts * 0.50
                : grossReceipts;


        const taxWithout44ADA =
            this.taxEngine.calculateAnnualIncomeTax(
                grossReceipts
            );


        const taxWith44ADA =
            this.taxEngine.calculateAnnualIncomeTax(
                presumptiveIncome
            );



        const estimatedTaxSaving =
            Math.max(
                0,
                taxWithout44ADA.totalTaxLiability -
                taxWith44ADA.totalTaxLiability
            );


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
