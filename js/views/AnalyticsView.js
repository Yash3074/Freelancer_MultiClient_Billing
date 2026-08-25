/**
 * AnalyticsView  —  NEW FEATURE
 *
 * Renders the Revenue Analytics dashboard using Chart.js (loaded via CDN).
 * Three charts:
 *   1. Monthly Revenue Trend (bar chart — last 12 months of amountPaidINR)
 *   2. Revenue by Client    (doughnut chart)
 *   3. Invoice Status       (doughnut chart — Paid / Partial / Unpaid)
 */
export class AnalyticsView {
  /**
   * @param {import('../controllers/InvoiceController.js').InvoiceController} invoiceController
   * @param {import('../controllers/ExpenseController.js').ExpenseController} expenseController
   */
  constructor(invoiceController, expenseController) {
    this.invoiceController = invoiceController;
    this.expenseController = expenseController;
    this._charts = {};
  }

  // ── Public API: re-render all charts ───────────────────────────
  update() {
    const invoices = this.invoiceController.getAllInvoices();
    this._renderMonthlyTrend(invoices);
    this._renderClientBreakdown(invoices);
    this._renderStatusDistribution(invoices);
    this._renderExpenseVsRevenue(invoices);
  }

  // ── 1. Monthly Revenue Trend ────────────────────────────────────
  _renderMonthlyTrend(invoices) {
    const canvas = document.getElementById('chartMonthlyRevenue');
    if (!canvas) return;

    // Build last-12-months labels
    const now    = new Date();
    const labels = [];
    const data   = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      let sum = 0;
      invoices.forEach(inv => {
        if (inv.invoiceDate && inv.invoiceDate.startsWith(key)) {
          sum += inv.amountPaidINR || 0;
        }
      });
      data.push(Math.round(sum));
    }

    this._destroyChart('monthlyTrend');
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0,   'rgba(99, 102, 241, 0.6)');
    gradient.addColorStop(1,   'rgba(99, 102, 241, 0.05)');

    this._charts.monthlyTrend = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Revenue Collected (₹)',
          data,
          backgroundColor: gradient,
          borderColor: 'rgba(99, 102, 241, 0.9)',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx =>
                ` ₹${ctx.parsed.y.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              callback: v => `₹${(v / 1000).toFixed(0)}K`
            }
          }
        }
      }
    });
  }

  // ── 2. Revenue by Client ────────────────────────────────────────
  _renderClientBreakdown(invoices) {
    const canvas = document.getElementById('chartClientRevenue');
    if (!canvas) return;

    // Aggregate paid INR per client name
    const clientMap = {};
    invoices.forEach(inv => {
      const name = inv.client?.name || 'Unknown';
      clientMap[name] = (clientMap[name] || 0) + (inv.amountPaidINR || 0);
    });

    const sorted  = Object.entries(clientMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8); // top 8

    if (sorted.length === 0) {
      this._showEmpty(canvas, 'No invoice revenue yet');
      return;
    }

    const labels = sorted.map(([name])    => name);
    const data   = sorted.map(([, amount]) => Math.round(amount));

    const palette = [
      '#6366f1','#a855f7','#ec4899','#22d3ee',
      '#34d399','#fbbf24','#fb7185','#818cf8'
    ];

    this._destroyChart('clientRevenue');
    const ctx = canvas.getContext('2d');

    this._charts.clientRevenue = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: palette,
          borderColor: 'rgba(7,11,20,0.6)',
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#94a3b8',
              font: { size: 11 },
              boxWidth: 14,
              padding: 12
            }
          },
          tooltip: {
            callbacks: {
              label: ctx =>
                ` ${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')}`
            }
          }
        }
      }
    });
  }

  // ── 3. Invoice Status Distribution ─────────────────────────────
  _renderStatusDistribution(invoices) {
    const canvas = document.getElementById('chartInvoiceStatus');
    if (!canvas) return;

    const counts = { 'Fully Paid': 0, 'Partially Paid': 0, 'Unpaid': 0 };
    invoices.forEach(inv => { counts[inv.status] = (counts[inv.status] || 0) + 1; });

    if (invoices.length === 0) {
      this._showEmpty(canvas, 'No invoices yet');
      return;
    }

    this._destroyChart('statusDist');
    const ctx = canvas.getContext('2d');

    this._charts.statusDist = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Fully Paid', 'Partially Paid', 'Unpaid'],
        datasets: [{
          data: [
            counts['Fully Paid'],
            counts['Partially Paid'],
            counts['Unpaid']
          ],
          backgroundColor: [
            'rgba(52,211,153,0.8)',
            'rgba(251,191,36,0.8)',
            'rgba(251,113,133,0.8)'
          ],
          borderColor: 'rgba(7,11,20,0.6)',
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              font: { size: 11 },
              boxWidth: 14,
              padding: 12
            }
          },
          tooltip: {
            callbacks: {
              label: ctx =>
                ` ${ctx.label}: ${ctx.parsed} invoice${ctx.parsed !== 1 ? 's' : ''}`
            }
          }
        }
      }
    });
  }

  // ── 4. Expense vs Revenue ───────────────────────────────────────
  _renderExpenseVsRevenue(invoices) {
    const canvas = document.getElementById('chartExpenseRevenue');
    if (!canvas) return;

    const now    = new Date();
    const labels = [];
    const revData = [];
    const expData = [];

    const expenses = this.expenseController.getAllExpenses();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      let rev = 0;
      invoices.forEach(inv => {
        if (inv.invoiceDate?.startsWith(key)) rev += inv.amountPaidINR || 0;
      });
      revData.push(Math.round(rev));

      let exp = 0;
      expenses.forEach(e => {
        if (e.date?.startsWith(key)) exp += e.amount || 0;
      });
      expData.push(Math.round(exp));
    }

    this._destroyChart('expenseRevenue');
    const ctx = canvas.getContext('2d');

    this._charts.expenseRevenue = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue (₹)',
            data: revData,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            label: 'Expenses (₹)',
            data: expData,
            borderColor: '#fb7185',
            backgroundColor: 'rgba(251,113,133,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 14 }
          },
          tooltip: {
            callbacks: {
              label: ctx =>
                ` ${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              color: '#94a3b8',
              font: { size: 11 },
              callback: v => `₹${(v / 1000).toFixed(0)}K`
            }
          }
        }
      }
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────
  _destroyChart(key) {
    if (this._charts[key]) {
      this._charts[key].destroy();
      delete this._charts[key];
    }
  }

  _showEmpty(canvas, msg) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle    = '#94a3b8';
    ctx.font         = '14px Plus Jakarta Sans, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
  }
}
