import { invoiceApi } from '../services/api.js';

export class InvoiceView {
  constructor(invoiceController, clientController, taxEngine, auth, onDashboardUpdate) {
    this.invoiceController = invoiceController;
    this.clientController = clientController;
    this.taxEngine = taxEngine;
    this.auth = auth;
    this.onDashboardUpdate = onDashboardUpdate;
    this._statusFilter = 'All';
    this._searchQuery = '';
  }

  renderClientSelect() {
    const select = document.getElementById('invoiceClientSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Select Client --</option>';
    this.clientController.getAllClients().forEach(c => {
      const opt = document.createElement('option');
      const cid = c._id || c.id;
      opt.value = cid;
      opt.textContent = `${c.name} (${c.currency} · ${c.country})`;
      select.appendChild(opt);
    });
  }

  renderInvoicesList() {
    const list = document.getElementById('invoicesList');
    if (!list) return;

    list.innerHTML = '';
    let invoices = this.invoiceController.getAllInvoices();

    // Filter by status if selected
    if (this._statusFilter !== 'All') {
      invoices = invoices.filter(i => i.status === this._statusFilter);
    }

    // Filter by search query
    if (this._searchQuery) {
      const q = this._searchQuery.toLowerCase();
      invoices = invoices.filter(i =>
        (i.invoiceNumber && i.invoiceNumber.toLowerCase().includes(q)) ||
        (i.client?.name && i.client.name.toLowerCase().includes(q))
      );
    }

    const countEl = document.getElementById('invoiceCount');
    if (countEl) {
      countEl.textContent = `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`;
    }

    if (invoices.length === 0) {
      list.innerHTML = `
        <div class="empty-state card">
          <div class="empty-state-icon">📄</div>
          <p>No invoices matching your criteria. Create a new invoice or adjust filters.</p>
        </div>
      `;
      return;
    }

    invoices.forEach(inv => {
      const card = document.createElement('div');
      card.className = 'card invoice-card';
      const invId = inv._id || inv.id;

      const badgeClass =
        inv.status === 'Fully Paid'
          ? 'badge-paid'
          : inv.status === 'Partially Paid'
          ? 'badge-partial'
          : 'badge-unpaid';

      const clientName = inv.client?.name || 'Unknown Client';
      const clientAddress = inv.client?.address || '';
      const clientCountry = inv.client?.country || '';

      const invoiceNum = inv.invoiceNumber || inv.id || 'INV-001';
      const invDateStr = inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : '—';
      const dueDateStr = inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—';

      card.innerHTML = `
        <div class="card-header">
          <div>
            <h3>${invoiceNum} — ${clientName}</h3>
            <span style="font-size:0.8rem;color:var(--text-muted);">Created: ${invDateStr} | Due: ${dueDateStr}</span>
          </div>
          <div style="display:flex;gap:0.5rem;align-items:center;">
            <span class="badge ${badgeClass}">${inv.status}</span>
          </div>
        </div>

        <div class="client-meta">
          <span><strong>Total:</strong> ${inv.currency} ${(inv.totalAmount || 0).toLocaleString()}</span>
          <span><strong>INR Value:</strong> ₹${(inv.totalINR || 0).toLocaleString('en-IN')}</span>
          <span><strong>Received:</strong> ${inv.currency} ${(inv.amountPaid || 0).toLocaleString()}</span>
          <span><strong>Balance Due:</strong> ${inv.currency} ${Math.max(0, (inv.totalAmount || 0) - (inv.amountPaid || 0)).toLocaleString()}</span>
        </div>

        <div class="payment-control-box">
          <label><strong>Update Payment Status</strong></label>
          <div class="payment-controls">
            <select class="status-select" data-id="${invId}">
              <option value="Unpaid" ${inv.status === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
              <option value="Partially Paid" ${inv.status === 'Partially Paid' ? 'selected' : ''}>Partially Paid</option>
              <option value="Fully Paid" ${inv.status === 'Fully Paid' ? 'selected' : ''}>Fully Paid</option>
            </select>

            <input
              type="number"
              class="partial-amount-input"
              data-id="${invId}"
              placeholder="Amount Paid"
              value="${inv.amountPaid || 0}"
              style="display:${inv.status === 'Partially Paid' ? 'inline-block' : 'none'};"
            >

            <button
              class="btn-gradient btn-update-payment"
              data-id="${invId}"
              style="padding:.45rem 1rem;font-size:.85rem;"
            >
              Save Status
            </button>
          </div>
        </div>

        <div class="card-actions" style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
          <button class="btn-print btn-outline" data-id="${invId}">🖨️ View &amp; Print PDF</button>
          ${inv.publicShareToken ? `<button class="btn-share-link btn-outline" data-token="${inv.publicShareToken}">🔗 Copy Client Link</button>` : ''}
          <button class="btn-delete" data-id="${invId}">Delete</button>
        </div>
      `;

      const statusSel = card.querySelector('.status-select');
      const partialInp = card.querySelector('.partial-amount-input');
      statusSel.onchange = e => {
        partialInp.style.display = e.target.value === 'Partially Paid' ? 'inline-block' : 'none';
      };

      card.querySelector('.btn-update-payment').onclick = async () => {
        try {
          await this.invoiceController.updatePaymentStatus(
            invId,
            statusSel.value,
            parseFloat(partialInp.value) || 0
          );
          this.renderInvoicesList();
          this.onDashboardUpdate();
          window.dispatchEvent(new CustomEvent('toast:success', { detail: 'Payment status updated!' }));
        } catch (err) {
          window.dispatchEvent(new CustomEvent('toast:error', { detail: err.message }));
        }
      };

      card.querySelector('.btn-delete').onclick = async () => {
        if (!confirm('Are you sure you want to delete this invoice?')) return;
        try {
          await this.invoiceController.deleteInvoice(invId);
          this.renderInvoicesList();
          this.onDashboardUpdate();
          window.dispatchEvent(new CustomEvent('toast:info', { detail: 'Invoice deleted.' }));
        } catch (err) {
          window.dispatchEvent(new CustomEvent('toast:error', { detail: err.message }));
        }
      };

      card.querySelector('.btn-print').onclick = async () => {
        await this.printInvoice(invId);
      };

      const shareBtn = card.querySelector('.btn-share-link');
      if (shareBtn) {
        shareBtn.onclick = () => {
          const shareUrl = `${window.location.origin}/api/v1/invoices/public/${inv.publicShareToken}`;
          navigator.clipboard.writeText(shareUrl);
          window.dispatchEvent(new CustomEvent('toast:success', { detail: 'Public invoice link copied to clipboard!' }));
        };
      }

      list.appendChild(card);
    });
  }

  updateInvoicePreview() {
    const clientId = document.getElementById('invoiceClientSelect')?.value;
    const client = clientId ? this.clientController.getClientById(clientId) : null;
    const currency = client?.currency || 'INR';

    let subtotal = 0;
    document.querySelectorAll('.line-item-row').forEach(row => {
      const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
      const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
      subtotal += qty * rate;
    });

    const isIntl = client ? (client.currency !== 'INR' || client.country !== 'India') : false;
    const gstInfo = this.taxEngine.calculateGST(subtotal, isIntl);
    const total = subtotal + gstInfo.gstAmount;

    const fmt = n =>
      `${currency} ${n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setText('previewSubtotal', subtotal > 0 ? fmt(subtotal) : '—');
    setText('previewGST', subtotal > 0 ? `${fmt(gstInfo.gstAmount)} (${gstInfo.rate}%)` : '—');
    setText('previewTotal', subtotal > 0 ? fmt(total) : '—');
  }

  addLineItem() {
    const container = document.getElementById('lineItemsContainer');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'line-item-rowGrid line-item-row';
    row.innerHTML = `
      <input type="text" class="item-desc" placeholder="Service description (e.g. Fullstack API Development)…" required>
      <input type="number" class="item-qty" placeholder="Qty" min="0.5" step="0.5" value="1" required>
      <input type="number" class="item-rate" placeholder="Rate" min="0" step="0.01" required>
      <button type="button" class="btn-remove" title="Remove">&times;</button>
    `;

    row.querySelectorAll('input').forEach(inp =>
      inp.addEventListener('input', () => this.updateInvoicePreview())
    );

    row.querySelector('.btn-remove').onclick = () => {
      if (container.children.length > 1) {
        row.remove();
        this.updateInvoicePreview();
      }
    };

    container.appendChild(row);
  }

  async printInvoice(invoiceId) {
    try {
      const res = await invoiceApi.getById(invoiceId);
      const invoiceData = res.invoice;

      const user = this.auth.getCurrentUser();
      const businessName = user?.businessName || user?.name || 'TaxPulse Freelancer';
      const userLogo = user?.logoUrl ? `<img src="${user.logoUrl}" style="max-height:60px;margin-bottom:8px;display:block;">` : '';

      // Determine QR Code (from API or robust dynamic fallback)
      const balanceDueINR = Math.max(0, (invoiceData.totalINR || 0) - (invoiceData.amountPaidINR || 0));
      const inrAmount = balanceDueINR > 0 ? balanceDueINR : (invoiceData.totalINR || (invoiceData.totalAmount * (invoiceData.exchangeRateToINR || 1)));

      let qrImageSrc = res.upiQrCode;
      let qrLabel = res.qrCaption;

      if (!qrImageSrc) {
        if (user?.upiId) {
          const upiString = `upi://pay?pa=${encodeURIComponent(user.upiId)}&pn=${encodeURIComponent(businessName)}&am=${Math.round(inrAmount)}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoiceData.invoiceNumber}`)}`;
          qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
          qrLabel = invoiceData.currency === 'INR' ? 'Scan with GPay / PhonePe / Paytm to pay instantly' : `Scan to pay via UPI (Converted: ₹${Math.round(inrAmount).toLocaleString('en-IN')})`;
        } else if (invoiceData.publicShareToken) {
          const verifyUrl = `${window.location.origin}/api/v1/invoices/public/${invoiceData.publicShareToken}`;
          qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}`;
          qrLabel = 'Scan with phone camera to verify official invoice online';
        }
      }

      if (!qrLabel) {
        qrLabel = invoiceData.currency === 'INR' ? 'Scan with GPay / PhonePe / Paytm to pay instantly' : `Scan to pay via UPI (Converted: ₹${Math.round(inrAmount).toLocaleString('en-IN')})`;
      }

      const printWin = window.open('', '_blank');
      if (!printWin) {
        window.dispatchEvent(new CustomEvent('toast:error', { detail: 'Pop-up blocked. Please allow pop-ups to print the invoice.' }));
        return;
      }

      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Invoice #${invoiceData.invoiceNumber} - ${businessName}</title>
            <style>
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              body {
                font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
                padding: 24px 40px;
                color: #1e293b;
                max-width: 860px;
                margin: 0 auto;
                background: #fff;
                line-height: 1.5;
              }
              .no-print-bar {
                background: #f8fafc;
                border: 1px solid #cbd5e1;
                border-radius: 12px;
                padding: 14px 20px;
                margin-bottom: 24px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
              }
              .btn-print-action {
                background: #4f46e5;
                color: #fff;
                border: none;
                padding: 10px 22px;
                border-radius: 8px;
                font-weight: 700;
                font-size: 0.95rem;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
                transition: background 0.2s;
              }
              .btn-print-action:hover { background: #4338ca; }
              .btn-close-action {
                background: #fff;
                color: #475569;
                border: 1px solid #cbd5e1;
                padding: 9px 18px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 0.9rem;
                cursor: pointer;
              }
              .btn-close-action:hover { background: #f1f5f9; }
              .print-hint {
                font-size: 0.8rem;
                color: #64748b;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 2px solid #4f46e5;
                padding-bottom: 20px;
                margin-bottom: 20px;
              }
              .brand { color: #4f46e5; font-size: 1.65rem; font-weight: 800; letter-spacing: -0.5px; }
              .meta-title { font-weight: 700; color: #475569; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border-bottom: 1px solid #e2e8f0; padding: 12px 14px; text-align: left; }
              th { background: #f8fafc; font-size: 0.8rem; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.04em; }
              .totals-box { margin-top: 24px; display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
              .payment-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; width: 55%; font-size: 0.88rem; }
              .totals { text-align: right; width: 42%; }
              .totals p { margin: 6px 0; color: #64748b; font-size: 0.92rem; }
              .totals h3 { color: #0f172a; margin: 10px 0 8px; font-size: 1.3rem; border-top: 1px dashed #cbd5e1; padding-top: 8px; }
              .paid { color: #059669; font-weight: 700; }
              .balance-due { font-weight: 800; color: #dc2626; font-size: 1.1rem; }
              .qr-box {
                text-align: center;
                margin-top: 14px;
                padding: 12px;
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .qr-img {
                width: 150px;
                height: 150px;
                display: block;
                border-radius: 6px;
                border: 1px solid #cbd5e1;
              }
              .qr-caption {
                font-size: 0.76rem;
                font-weight: 600;
                color: #475569;
                margin-top: 8px;
                line-height: 1.3;
                max-width: 200px;
              }
              @media print {
                body { padding: 10px 0; max-width: 100%; }
                .no-print-bar { display: none !important; }
                .qr-img { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              }
            </style>
          </head>
          <body>
            <div class="no-print-bar">
              <div>
                <button onclick="window.print()" class="btn-print-action">🖨️ Print / Save as PDF</button>
                <button onclick="window.close()" class="btn-close-action" style="margin-left:8px;">✕ Close Preview</button>
              </div>
              <span class="print-hint">💡 Tip: Enable <strong>"Background graphics"</strong> in browser print options for best results.</span>
            </div>

            <div class="header">
              <div>
                ${userLogo}
                <div class="brand">${businessName}</div>
                <p style="color:#64748b;font-size:0.88rem;margin-top:4px;">${user?.email || ''} | ${user?.phone || ''}</p>
                <p style="color:#64748b;font-size:0.85rem;">GSTIN: ${user?.gstin || 'N/A'} | PAN: ${user?.pan || 'N/A'}</p>
              </div>
              <div style="text-align:right;">
                <h2 style="margin:0;color:#0f172a;font-size:1.75rem;">INVOICE</h2>
                <p style="margin:4px 0;font-weight:700;color:#6366f1;">#${invoiceData.invoiceNumber}</p>
                <p style="margin:2px 0;font-size:0.85rem;color:#64748b;">Date: ${new Date(invoiceData.invoiceDate).toLocaleDateString()}</p>
                <p style="margin:2px 0;font-size:0.85rem;color:#64748b;">Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}</p>
                <p style="margin:4px 0;">
                  <span style="display:inline-block;padding:3px 10px;background:${invoiceData.status === 'Fully Paid' ? '#dcfce7' : invoiceData.status === 'Partially Paid' ? '#fef3c7' : '#fee2e2'};color:${invoiceData.status === 'Fully Paid' ? '#15803d' : invoiceData.status === 'Partially Paid' ? '#b45309' : '#b91c1c'};border-radius:12px;font-size:0.8rem;font-weight:700;">
                    ${invoiceData.status}
                  </span>
                </p>
              </div>
            </div>

            <div style="display:flex;justify-content:space-between;margin-bottom:24px;">
              <div>
                <div class="meta-title">Billed To</div>
                <p style="margin:0;font-weight:700;font-size:1.05rem;">${invoiceData.client?.name}</p>
                <p style="margin:3px 0;color:#64748b;font-size:0.9rem;">${invoiceData.client?.company || ''}</p>
                <p style="margin:3px 0;color:#64748b;font-size:0.85rem;">${invoiceData.client?.address || ''}</p>
                <p style="margin:3px 0;color:#64748b;font-size:0.85rem;">${invoiceData.client?.country || ''} · GSTIN: ${invoiceData.client?.gstin || 'N/A'}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align:center;">Qty</th>
                  <th style="text-align:right;">Rate (${invoiceData.currency})</th>
                  <th style="text-align:right;">Amount (${invoiceData.currency})</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceData.items.map(item => `
                  <tr>
                    <td><strong>${item.description}</strong></td>
                    <td style="text-align:center;">${item.quantity}</td>
                    <td style="text-align:right;">${item.rate.toLocaleString()}</td>
                    <td style="text-align:right;">${item.amount.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals-box">
              <div class="payment-info">
                <div class="meta-title">Payment Instructions</div>
                ${user?.upiId ? `<p style="margin:4px 0;"><strong>UPI ID:</strong> ${user.upiId}</p>` : ''}
                ${user?.bankDetails?.bankName ? `<p style="margin:4px 0;"><strong>Bank:</strong> ${user.bankDetails.bankName} | <strong>A/C:</strong> ${user.bankDetails.accountNumber} | <strong>IFSC:</strong> ${user.bankDetails.ifscCode}</p>` : ''}
                ${invoiceData.notes ? `<p style="margin-top:8px;font-style:italic;color:#64748b;"><strong>Note:</strong> ${invoiceData.notes}</p>` : ''}

                ${qrImageSrc ? `
                  <div class="qr-box">
                    <img src="${qrImageSrc}" alt="Invoice Payment & Verification QR Code" class="qr-img">
                    <p class="qr-caption">${qrLabel}</p>
                  </div>
                ` : ''}
              </div>

              <div class="totals">
                <p>Subtotal: ${invoiceData.currency} ${invoiceData.subtotal.toFixed(2)}</p>
                <p>Tax / GST (${invoiceData.gstRate}%): ${invoiceData.currency} ${invoiceData.gstAmount.toFixed(2)}</p>
                <h3>Total Amount: ${invoiceData.currency} ${invoiceData.totalAmount.toFixed(2)}</h3>
                <p class="paid">Amount Paid: ${invoiceData.currency} ${(invoiceData.amountPaid || 0).toFixed(2)}</p>
                <p class="balance-due">Balance Due: ${invoiceData.currency} ${Math.max(0, invoiceData.totalAmount - (invoiceData.amountPaid || 0)).toFixed(2)}</p>
              </div>
            </div>

            <script>
              function triggerAutoPrint() {
                window.focus();
                setTimeout(function() {
                  window.print();
                }, 300);
              }
              window.onload = function() {
                var qr = document.querySelector('.qr-img');
                if (qr && !qr.complete) {
                  qr.onload = triggerAutoPrint;
                  qr.onerror = triggerAutoPrint;
                } else {
                  triggerAutoPrint();
                }
              };
            </script>
          </body>
        </html>
      `);

      printWin.document.close();
    } catch (err) {
      window.dispatchEvent(new CustomEvent('toast:error', { detail: 'Could not load invoice for printing: ' + err.message }));
    }
  }
}
