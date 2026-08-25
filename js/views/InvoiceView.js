
export class InvoiceView {

  constructor(invoiceController, clientController, taxEngine, auth, onDashboardUpdate) {
    this.invoiceController  = invoiceController;
    this.clientController   = clientController;
    this.taxEngine          = taxEngine;
    this.auth               = auth;
    this.onDashboardUpdate  = onDashboardUpdate;
  }

  renderClientSelect() {
    const select = document.getElementById('invoiceClientSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Select Client --</option>';
    this.clientController.getAllClients().forEach(c => {
      const opt = document.createElement('option');
      opt.value       = c.id;
      opt.textContent = `${c.name} (${c.currency} · ${c.country})`;
      select.appendChild(opt);
    });
  }

  renderInvoicesList() {
    const list = document.getElementById('invoicesList');
    if (!list) return;

    list.innerHTML = '';
    const invoices = this.invoiceController.getAllInvoices();

    const countEl = document.getElementById('invoiceCount');
    if (countEl) {
      countEl.textContent =
        `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`;
    }

    if (invoices.length === 0) {
      list.innerHTML = `
        <div class="empty-state card">
          <div class="empty-state-icon">📄</div>
          <p>No invoices generated yet. Create your first invoice to get started.</p>
        </div>
      `;
      return;
    }

    invoices.forEach(inv => {
      const card = document.createElement('div');
      card.className = 'card';

      const badgeClass =
        inv.status === 'Fully Paid'    ? 'badge-paid'    :
        inv.status === 'Partially Paid' ? 'badge-partial' : 'badge-unpaid';

      card.innerHTML = `
        <div class="card-header">
          <h3>Invoice #${inv.id} — ${inv.client.name}</h3>
          <span class="badge ${badgeClass}">${inv.status}</span>
        </div>

        <div class="client-meta">
          <span><strong>Date:</strong> ${inv.invoiceDate || '—'}</span>
          <span><strong>Due:</strong>  ${inv.dueDate || '—'}</span>
          <span><strong>Total:</strong> ${inv.currency} ${inv.totalAmount.toLocaleString()}</span>
          <span><strong>INR Value:</strong> ₹${inv.totalINR.toLocaleString('en-IN')}</span>
        </div>

        <p style="margin-top:.75rem;font-size:.88rem;color:var(--text-muted);">
          <strong style="color:var(--text-main);">Collected:</strong>
          ${inv.currency} ${inv.amountPaid.toLocaleString()}
          (₹${inv.amountPaidINR.toLocaleString('en-IN')})
        </p>

        <div class="payment-control-box">
          <label><strong>Update Payment Status</strong></label>
          <div class="payment-controls">
            <select class="status-select" data-id="${inv.id}">
              <option value="Unpaid"        ${inv.status === 'Unpaid'         ? 'selected' : ''}>Unpaid</option>
              <option value="Partially Paid"${inv.status === 'Partially Paid' ? 'selected' : ''}>Partially Paid</option>
              <option value="Fully Paid"    ${inv.status === 'Fully Paid'     ? 'selected' : ''}>Fully Paid</option>
            </select>

            <input
              type="number"
              class="partial-amount-input"
              data-id="${inv.id}"
              placeholder="Amount Paid"
              value="${inv.amountPaid}"
              style="display:${inv.status === 'Partially Paid' ? 'inline-block' : 'none'};"
            >

            <button
              class="btn-gradient btn-update-payment"
              data-id="${inv.id}"
              style="padding:.45rem 1rem;font-size:.85rem;"
            >
              Save Status
            </button>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn-print"  data-id="${inv.id}">🖨️ Print Invoice</button>
          <button class="btn-delete" data-id="${inv.id}">Delete</button>
        </div>
      `;

      const statusSel   = card.querySelector('.status-select');
      const partialInp  = card.querySelector('.partial-amount-input');
      statusSel.onchange = e => {
        partialInp.style.display =
          e.target.value === 'Partially Paid' ? 'inline-block' : 'none';
      };

      card.querySelector('.btn-update-payment').onclick = () => {
        this.invoiceController.updatePaymentStatus(
          inv.id,
          statusSel.value,
          parseFloat(partialInp.value) || 0
        );
        this.renderInvoicesList();
        this.onDashboardUpdate();
      };

      card.querySelector('.btn-delete').onclick = () => {
        this.invoiceController.deleteInvoice(inv.id);
        this.renderInvoicesList();
        this.onDashboardUpdate();
      };

      card.querySelector('.btn-print').onclick = () =>
        this.printInvoice(inv);

      list.appendChild(card);
    });
  }
  updateInvoicePreview() {
    const clientId = document.getElementById('invoiceClientSelect')?.value;
    const client   = clientId
      ? this.clientController.getClientById(clientId)
      : null;
    const currency = client?.currency || 'INR';

    let subtotal = 0;
    document.querySelectorAll('.line-item-row').forEach(row => {
      const qty  = parseFloat(row.querySelector('.item-qty').value)  || 0;
      const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
      subtotal += qty * rate;
    });

    const isIntl = client
      ? (client.currency !== 'INR' || client.country !== 'India')
      : false;

    const gstInfo = this.taxEngine.calculateGST(subtotal, isIntl);
    const total   = subtotal + gstInfo.gstAmount;

    const fmt = n =>
      `${currency} ${n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setText('previewSubtotal', subtotal > 0 ? fmt(subtotal) : '—');
    setText('previewGST',
      subtotal > 0 ? `${fmt(gstInfo.gstAmount)} (${gstInfo.rate}%)` : '—');
    setText('previewTotal', subtotal > 0 ? fmt(total) : '—');
  }
  addLineItem() {
    const container = document.getElementById('lineItemsContainer');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'line-item-rowGrid line-item-row';
    row.innerHTML = `
      <input type="text"   class="item-desc" placeholder="Service description…" required>
      <input type="number" class="item-qty"  placeholder="Qty"  min="1"   value="1"   required>
      <input type="number" class="item-rate" placeholder="Rate" min="0"   step="0.01" required>
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

  printInvoice(inv) {
    const user         = this.auth.getCurrentUser();
    const businessName = user?.businessName || 'TaxPulse Freelancer';
    const printWin     = window.open('', '_blank');

    printWin.document.write(`
      <html>
        <head>
          <title>Invoice — ${inv.id}</title>
          <style>
            body { font-family:'Segoe UI',sans-serif; padding:40px; color:#1e293b; max-width:800px; margin:0 auto; }
            .header { display:flex; justify-content:space-between; border-bottom:3px solid #6366f1; padding-bottom:24px; margin-bottom:24px; }
            .brand  { color:#6366f1; font-size:1.5rem; font-weight:700; }
            table   { width:100%; border-collapse:collapse; margin-top:24px; }
            th, td  { border:1px solid #e2e8f0; padding:12px; text-align:left; }
            th      { background:#f8fafc; font-size:.85rem; text-transform:uppercase; color:#64748b; }
            .totals { margin-top:24px; text-align:right; }
            .totals p  { margin:4px 0; color:#64748b; }
            .totals h3 { color:#1e293b; margin-top:12px; }
            .paid   { color:#10b981; }
            .meta   { font-size:.9rem; color:#64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">${businessName}</div>
              <p class="meta"><strong>Invoice ID:</strong> ${inv.id}</p>
              <p class="meta"><strong>Date:</strong> ${inv.invoiceDate} · <strong>Due:</strong> ${inv.dueDate}</p>
              <p class="meta"><strong>Status:</strong> ${inv.status}</p>
            </div>
            <div>
              <h3 style="margin-bottom:8px;">Billed To</h3>
              <p><strong>${inv.client.name}</strong></p>
              <p class="meta">${inv.client.address}</p>
              <p class="meta">${inv.client.country}</p>
              <p class="meta">GSTIN: ${inv.client.gstin || 'N/A'}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Rate (${inv.currency})</th>
                <th>Amount (${inv.currency})</th>
              </tr>
            </thead>
            <tbody>
              ${inv.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${item.rate.toLocaleString()}</td>
                  <td>${(item.quantity * item.rate).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <p>Subtotal: ${inv.currency} ${inv.subtotal.toFixed(2)}</p>
            <p>GST / Tax (${inv.gstRate}%): ${inv.currency} ${inv.gstAmount.toFixed(2)}</p>
            <h3>Total Due: ${inv.currency} ${inv.totalAmount.toFixed(2)}</h3>
            <h2 class="paid">Amount Received: ${inv.currency} ${inv.amountPaid.toFixed(2)}</h2>
          </div>

          ${inv.notes ? `
            <p style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;color:#64748b;font-size:.9rem;">
              <strong>Notes:</strong> ${inv.notes}
            </p>
          ` : ''}
        </body>
      </html>
    `);

    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  }
}
