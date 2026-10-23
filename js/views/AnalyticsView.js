export class AnalyticsView {
  constructor(invoiceController, expenseController) {
    this.invoiceController = invoiceController;
    this.expenseController = expenseController;
    this._charts = {};
    this._timeframeMonths = 12;
    this._boundFilter = false;
  }

  update() {
    this._bindTimeframeFilter();

    const allInvoices = this.invoiceController.getAllInvoices() || [];
    const allExpenses = this.expenseController.getAllExpenses() || [];

    const { invoices, expenses } = this._filterByTimeframe(allInvoices, allExpenses);

    this._renderKPIs(invoices, expenses);
    this._renderInsights(invoices, expenses);
    this._renderMonthlyCashflow(allInvoices, allExpenses);
    this._renderCurrencyShare(invoices);
    this._renderInvoiceStatus(invoices);
    this._renderClientRevenue(invoices);
    this._renderExpenseCategories(expenses);
    this._renderLeaderboardTable(invoices);
  }

  _bindTimeframeFilter() {
    if (this._boundFilter) return;
    const container = document.getElementById('analyticsTimeframePills');
    if (!container) return;

    container.querySelectorAll('.pill').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const m = btn.dataset.months;
        this._timeframeMonths = m === 'all' ? 'all' : parseInt(m, 10);

        const chip = document.getElementById('chartMonthlyChip');
        if (chip) {
          chip.textContent = m === 'all' ? 'All-Time Record' : `Last ${m} Months`;
        }

        this.update();
      });
    });

    this._boundFilter = true;
  }

  _filterByTimeframe(invoices, expenses) {
    if (this._timeframeMonths === 'all') {
      return { invoices, expenses };
    }

    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - this._timeframeMonths + 1, 1);
    const cutoffKey = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}-01`;

    const filteredInvoices = invoices.filter(inv => {
      const d = inv.invoiceDate || '';
      return d >= cutoffKey;
    });

    const filteredExpenses = expenses.filter(exp => {
      const d = exp.date || '';
      return d >= cutoffKey;
    });

    return { invoices: filteredInvoices, expenses: filteredExpenses };
  }

  _renderKPIs(invoices, expenses) {
    let totalBilled = 0;
    let totalCollected = 0;
    const currencies = new Set();

    invoices.forEach(inv => {
      totalBilled += inv.totalINR || 0;
      totalCollected += inv.amountPaidINR || 0;
      if (inv.currency) currencies.add(inv.currency);
    });

    let totalExpenses = 0;
    expenses.forEach(e => {
      totalExpenses += e.amount || 0;
    });

    const netProfit = totalCollected - totalExpenses;
    const realizationRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;
    const avgInvoice = invoices.length > 0 ? totalBilled / invoices.length : 0;
    const profitMargin = totalCollected > 0 ? (netProfit / totalCollected) * 100 : 0;

    const formatINR = val => '₹' + Math.round(val).toLocaleString('en-IN');
    const formatCompact = val => {
      if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + ' Cr';
      if (val >= 100000) return '₹' + (val / 100000).toFixed(2) + ' L';
      if (val >= 1000) return '₹' + (val / 1000).toFixed(1) + ' K';
      return '₹' + Math.round(val).toLocaleString('en-IN');
    };

    const setEl = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setEl('kpiRealizationRate', `${realizationRate.toFixed(1)}%`);
    setEl('kpiRealizationSub', `${formatCompact(totalCollected)} collected of ${formatCompact(totalBilled)}`);

    setEl('kpiAvgInvoice', formatCompact(avgInvoice));
    setEl('kpiAvgInvoiceSub', `Across ${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`);

    setEl('kpiProfitMargin', `${profitMargin >= 0 ? '+' : ''}${profitMargin.toFixed(1)}%`);
    setEl('kpiProfitMarginSub', `Net cashflow: ${formatCompact(netProfit)}`);

    const curList = Array.from(currencies);
    setEl('kpiCurrencies', curList.length > 0 ? curList.length : '1');
    setEl('kpiCurrenciesSub', curList.length > 0 ? curList.join(', ') : 'INR Domestic');
  }

  _renderInsights(invoices, expenses) {
    const setEl = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    // 1. Client Concentration Insight
    const clientMap = {};
    let totalCollected = 0;
    invoices.forEach(inv => {
      const name = inv.client?.name || 'Unknown Client';
      const paid = inv.amountPaidINR || 0;
      clientMap[name] = (clientMap[name] || 0) + paid;
      totalCollected += paid;
    });

    const sortedClients = Object.entries(clientMap).sort((a, b) => b[1] - a[1]);
    const topClient = sortedClients[0];

    const concEl = document.getElementById('insightConcentrationText');
    const concStatus = document.getElementById('statusConcentration');

    if (!topClient || totalCollected === 0) {
      if (concEl) concEl.textContent = 'Record paid invoices to monitor client concentration risk.';
      if (concStatus) concStatus.textContent = 'No Data';
    } else {
      const topPct = Math.round((topClient[1] / totalCollected) * 100);
      if (topPct > 45) {
        if (concEl) concEl.textContent = `⚠️ High Dependency: "${topClient[0]}" represents ${topPct}% of your realized revenue. Broaden your client base to hedge pipeline risk.`;
        if (concStatus) {
          concStatus.textContent = `${topPct}% Concentration`;
          concStatus.style.color = '#fb7185';
        }
      } else {
        if (concEl) concEl.textContent = `✅ Well-Diversified: Top client "${topClient[0]}" accounts for ${topPct}% of income. Healthy revenue spread with low dependency.`;
        if (concStatus) {
          concStatus.textContent = 'Balanced';
          concStatus.style.color = '#34d399';
        }
      }
    }

    // 2. Collection Velocity Insight
    let fullyPaidCount = 0;
    invoices.forEach(inv => {
      if (inv.status === 'Fully Paid') fullyPaidCount++;
    });

    const velEl = document.getElementById('insightVelocityText');
    const velStatus = document.getElementById('statusVelocity');

    if (invoices.length === 0) {
      if (velEl) velEl.textContent = 'Issue invoices with dynamic UPI QR codes to track settlement velocity.';
      if (velStatus) velStatus.textContent = 'No Data';
    } else {
      const paidRatio = Math.round((fullyPaidCount / invoices.length) * 100);
      if (paidRatio >= 80) {
        if (velEl) velEl.textContent = `⚡ Outstanding Collection: ${paidRatio}% of your invoices are completely settled. Domestic UPI QR and quick wire terms keep cashflow fluent.`;
        if (velStatus) {
          velStatus.textContent = `${paidRatio}% Settled`;
          velStatus.style.color = '#34d399';
        }
      } else {
        if (velEl) velEl.textContent = `🕒 ${100 - paidRatio}% of billed invoices have unpaid or partial balances. Follow up with pending clients or resend UPI payment links.`;
        if (velStatus) {
          velStatus.textContent = `${paidRatio}% Settled`;
          velStatus.style.color = '#fbbf24';
        }
      }
    }

    // 3. Section 44ADA Turnover Ceiling (₹75 Lakhs)
    const adaEl = document.getElementById('insight44ADAText');
    const adaStatus = document.getElementById('status44ADA');
    const limit = 7500000;
    const utilPct = Math.min(100, (totalCollected / limit) * 100);
    const remaining = Math.max(0, limit - totalCollected);

    const formatLakhs = val => '₹' + (val / 100000).toFixed(2) + ' Lakhs';

    if (adaEl) {
      adaEl.textContent = `🏛️ Presumptive Turnover: ${formatLakhs(totalCollected)} realized (${utilPct.toFixed(1)}% of ₹75L ceiling). You have ${formatLakhs(remaining)} remaining before tax audit requirements.`;
    }
    if (adaStatus) {
      adaStatus.textContent = `${utilPct.toFixed(0)}% Limit`;
      adaStatus.style.color = utilPct > 80 ? '#fb7185' : '#22d3ee';
    }
  }

  _renderMonthlyCashflow(allInvoices, allExpenses) {
    const canvas = document.getElementById('chartMonthlyRevenue');
    if (!canvas) return;

    const monthsCount = this._timeframeMonths === 'all' ? 12 : this._timeframeMonths;
    const now = new Date();
    const labels = [];
    const revData = [];
    const expData = [];
    const profitData = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      let rev = 0;
      allInvoices.forEach(inv => {
        if (inv.invoiceDate?.startsWith(key)) {
          rev += inv.amountPaidINR || 0;
        }
      });
      revData.push(Math.round(rev));

      let exp = 0;
      allExpenses.forEach(e => {
        if (e.date?.startsWith(key)) {
          exp += e.amount || 0;
        }
      });
      expData.push(Math.round(exp));

      profitData.push(Math.round(rev - exp));
    }

    this._destroyChart('monthlyCashflow');
    const ctx = canvas.getContext('2d');

    const gradRev = ctx.createLinearGradient(0, 0, 0, 300);
    gradRev.addColorStop(0, 'rgba(52, 211, 153, 0.45)');
    gradRev.addColorStop(1, 'rgba(52, 211, 153, 0.02)');

    this._charts.monthlyCashflow = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Collected Revenue (₹)',
            data: revData,
            borderColor: '#34d399',
            backgroundColor: gradRev,
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointBackgroundColor: '#34d399',
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Business Expenses (₹)',
            data: expData,
            borderColor: '#fb7185',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.35,
            borderWidth: 2,
            pointBackgroundColor: '#fb7185',
            pointRadius: 3,
            pointHoverRadius: 5
          },
          {
            label: 'Net Cashflow (₹)',
            data: profitData,
            borderColor: '#22d3ee',
            backgroundColor: 'transparent',
            tension: 0.35,
            borderWidth: 2,
            pointBackgroundColor: '#22d3ee',
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#94a3b8',
              font: { size: 11, family: 'Plus Jakarta Sans' },
              boxWidth: 12,
              padding: 14
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
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

  _renderCurrencyShare(invoices) {
    const canvas = document.getElementById('chartCurrencyShare');
    if (!canvas) return;

    const currencyMap = {};
    invoices.forEach(inv => {
      const cur = inv.currency || 'INR';
      currencyMap[cur] = (currencyMap[cur] || 0) + (inv.amountPaidINR || 0);
    });

    const entries = Object.entries(currencyMap).filter(([, val]) => val > 0);

    if (entries.length === 0) {
      this._showEmpty(canvas, 'No currency revenue yet');
      return;
    }

    const labels = entries.map(([cur]) => cur);
    const data = entries.map(([, amount]) => Math.round(amount));

    const palette = ['#6366f1', '#22d3ee', '#34d399', '#fbbf24', '#ec4899', '#a855f7', '#fb7185'];

    this._destroyChart('currencyShare');
    const ctx = canvas.getContext('2d');

    this._charts.currencyShare = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: palette.slice(0, labels.length),
            borderColor: 'rgba(7, 11, 20, 0.8)',
            borderWidth: 3,
            hoverOffset: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12, padding: 10 }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')}`
            }
          }
        }
      }
    });
  }

  _renderInvoiceStatus(invoices) {
    const canvas = document.getElementById('chartInvoiceStatus');
    if (!canvas) return;

    const counts = { 'Fully Paid': 0, 'Partially Paid': 0, 'Unpaid': 0 };
    invoices.forEach(inv => {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
    });

    if (invoices.length === 0) {
      this._showEmpty(canvas, 'No invoices generated yet');
      return;
    }

    this._destroyChart('statusDist');
    const ctx = canvas.getContext('2d');

    this._charts.statusDist = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Fully Paid', 'Partially Paid', 'Unpaid'],
        datasets: [
          {
            data: [counts['Fully Paid'], counts['Partially Paid'], counts['Unpaid']],
            backgroundColor: [
              'rgba(52, 211, 153, 0.85)',
              'rgba(251, 191, 36, 0.85)',
              'rgba(251, 113, 133, 0.85)'
            ],
            borderColor: 'rgba(7, 11, 20, 0.8)',
            borderWidth: 3,
            hoverOffset: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12, padding: 12 }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed} invoice${ctx.parsed !== 1 ? 's' : ''}`
            }
          }
        }
      }
    });
  }

  _renderClientRevenue(invoices) {
    const canvas = document.getElementById('chartClientRevenue');
    if (!canvas) return;

    const clientMap = {};
    invoices.forEach(inv => {
      const name = inv.client?.name || 'Unknown Client';
      clientMap[name] = (clientMap[name] || 0) + (inv.amountPaidINR || 0);
    });

    const sorted = Object.entries(clientMap)
      .filter(([, val]) => val > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    if (sorted.length === 0) {
      this._showEmpty(canvas, 'No client payments yet');
      return;
    }

    const labels = sorted.map(([name]) => name);
    const data = sorted.map(([, amount]) => Math.round(amount));

    const palette = ['#6366f1', '#a855f7', '#ec4899', '#22d3ee', '#34d399', '#fbbf24'];

    this._destroyChart('clientRevenue');
    const ctx = canvas.getContext('2d');

    this._charts.clientRevenue = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: palette.slice(0, labels.length),
            borderColor: 'rgba(7, 11, 20, 0.8)',
            borderWidth: 3,
            hoverOffset: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12, padding: 8 }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')}`
            }
          }
        }
      }
    });
  }

  _renderExpenseCategories(expenses) {
    const canvas = document.getElementById('chartExpenseCategories');
    if (!canvas) return;

    const catMap = {};
    expenses.forEach(e => {
      const cat = e.category || 'Other Expenses';
      catMap[cat] = (catMap[cat] || 0) + (e.amount || 0);
    });

    const entries = Object.entries(catMap)
      .filter(([, val]) => val > 0)
      .sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      this._showEmpty(canvas, 'No business expenses logged');
      return;
    }

    const labels = entries.map(([cat]) => cat);
    const data = entries.map(([, amount]) => Math.round(amount));

    const palette = ['#f43f5e', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4', '#10b981'];

    this._destroyChart('expenseCategories');
    const ctx = canvas.getContext('2d');

    this._charts.expenseCategories = new window.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: palette.slice(0, labels.length),
            borderColor: 'rgba(7, 11, 20, 0.8)',
            borderWidth: 3,
            hoverOffset: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12, padding: 8 }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ₹${ctx.parsed.toLocaleString('en-IN')}`
            }
          }
        }
      }
    });
  }

  _renderLeaderboardTable(invoices) {
    const tbody = document.getElementById('analyticsLeaderboardBody');
    if (!tbody) return;

    const clientStats = {};

    invoices.forEach(inv => {
      const name = inv.client?.name || 'Unknown Client';
      const company = inv.client?.company || '';
      const currency = inv.client?.currency || inv.currency || 'INR';

      if (!clientStats[name]) {
        clientStats[name] = {
          name,
          company,
          currency,
          invoicesCount: 0,
          totalBilled: 0,
          totalPaid: 0,
          paidCount: 0
        };
      }

      clientStats[name].invoicesCount++;
      clientStats[name].totalBilled += inv.totalINR || 0;
      clientStats[name].totalPaid += inv.amountPaidINR || 0;
      if (inv.status === 'Fully Paid') {
        clientStats[name].paidCount++;
      }
    });

    const sortedClients = Object.values(clientStats).sort((a, b) => b.totalPaid - a.totalPaid);

    if (sortedClients.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No client records found. Create an invoice to begin.</td></tr>';
      return;
    }

    const formatINR = val => '₹' + Math.round(val).toLocaleString('en-IN');

    tbody.innerHTML = sortedClients
      .map((c, idx) => {
        const rate = c.totalBilled > 0 ? Math.round((c.totalPaid / c.totalBilled) * 100) : 0;
        const pRate = c.invoicesCount > 0 ? (c.paidCount / c.invoicesCount) * 100 : 0;

        let pillClass = 'punctuality-stellar';
        let pillText = '🟢 Stellar (100)';
        if (pRate < 50) {
          pillClass = 'punctuality-risk';
          pillText = '🔴 Slow Payer';
        } else if (pRate < 80) {
          pillClass = 'punctuality-slow';
          pillText = '🟡 Moderate';
        } else if (pRate < 100) {
          pillClass = 'punctuality-good';
          pillText = '🔵 Reliable';
        }

        return `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:10px;">
                <div class="client-avatar" style="width:32px;height:32px;font-size:0.85rem;">${c.name.substring(0, 2).toUpperCase()}</div>
                <div>
                  <strong style="color:#fff;">${c.name}</strong>
                  ${c.company ? `<div style="font-size:0.75rem;color:#94a3b8;">${c.company}</div>` : ''}
                </div>
              </div>
            </td>
            <td><span class="chip">${c.currency}</span></td>
            <td><strong>${c.invoicesCount}</strong></td>
            <td>${formatINR(c.totalBilled)}</td>
            <td style="color:#34d399;font-weight:700;">${formatINR(c.totalPaid)}</td>
            <td>
              <div style="display:flex;align-items:center;gap:6px;">
                <span>${rate}%</span>
                <div style="width:50px;height:6px;background:rgba(255,255,255,0.08);border-radius:999px;overflow:hidden;">
                  <div style="width:${Math.min(100, rate)}%;height:100%;background:${rate >= 80 ? '#34d399' : rate >= 50 ? '#fbbf24' : '#fb7185'};border-radius:999px;"></div>
                </div>
              </div>
            </td>
            <td><span class="punctuality-pill ${pillClass}">${pillText}</span></td>
          </tr>
        `;
      })
      .join('');
  }

  _destroyChart(key) {
    if (this._charts[key]) {
      this._charts[key].destroy();
      delete this._charts[key];
    }
  }

  _showEmpty(canvas, msg) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
  }
}
