/**
 * ClientView
 * Handles rendering of the client list and client select dropdown.
 */
export class ClientView {
  /**
   * @param {import('../controllers/ClientController.js').ClientController} clientController
   * @param {Function} onClientEdit   callback(clientId) when Edit is clicked
   * @param {Function} onClientDelete callback(clientId) when Delete is clicked
   */
  constructor(clientController, onClientEdit, onClientDelete) {
    this.clientController = clientController;
    this.onClientEdit     = onClientEdit;
    this.onClientDelete   = onClientDelete;
  }

  // ── Client select dropdown (invoice form) ───────────────────────
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

  // ── Client cards list ───────────────────────────────────────────
  renderClientsList() {
    const list = document.getElementById('clientsList');
    if (!list) return;

    list.innerHTML = '';
    const clients = this.clientController.getAllClients();

    if (clients.length === 0) {
      list.innerHTML = `
        <div class="empty-state card">
          <div class="empty-state-icon">👥</div>
          <p>No clients registered yet. Add your first client above.</p>
        </div>
      `;
      return;
    }

    clients.forEach(c => {
      const card = document.createElement('div');
      card.className = 'card';

      card.innerHTML = `
        <div class="card-header">
          <h3>${c.name}</h3>
          <div>
            <button class="btn-edit"   data-id="${c.id}">Edit</button>
            <button class="btn-delete" data-id="${c.id}">Delete</button>
          </div>
        </div>

        <div class="client-meta">
          <span><strong>Email:</strong>    ${c.email}</span>
          <span><strong>Location:</strong> ${c.country}</span>
          <span><strong>Currency:</strong> ${c.currency}</span>
          <span><strong>GSTIN:</strong>    ${c.gstin || 'N/A'}</span>
        </div>

        <p style="margin-top:.75rem;font-size:.88rem;color:var(--text-muted);">
          <strong style="color:var(--text-main);">Address:</strong> ${c.address}
        </p>
      `;

      card.querySelector('.btn-delete').onclick = () =>
        this.onClientDelete(c.id);

      card.querySelector('.btn-edit').onclick = () =>
        this.onClientEdit(c);

      list.appendChild(card);
    });
  }

  // ── Reset client form to "Add new" state ────────────────────────
  resetClientForm() {
    const titleEl  = document.getElementById('clientFormTitle');
    const saveBtn  = document.getElementById('btnSaveClient');
    const cancelBtn = document.getElementById('btnCancelClientEdit');
    const form     = document.getElementById('clientForm');
    const countryEl = document.getElementById('clientCountry');

    if (titleEl)   titleEl.textContent   = 'Add New Client';
    if (saveBtn)   saveBtn.textContent   = 'Save Client';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (form)      form.reset();
    if (countryEl) countryEl.value = 'India';
  }

  // ── Populate form for editing ───────────────────────────────────
  populateEditForm(c) {
    const titleEl   = document.getElementById('clientFormTitle');
    const saveBtn   = document.getElementById('btnSaveClient');
    const cancelBtn = document.getElementById('btnCancelClientEdit');

    if (titleEl)   titleEl.textContent     = `Edit Client — ${c.name}`;
    if (saveBtn)   saveBtn.textContent     = 'Update Client';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    this._setVal('clientName',     c.name);
    this._setVal('clientEmail',    c.email);
    this._setVal('clientCountry',  c.country);
    this._setVal('clientCurrency', c.currency);
    this._setVal('clientGSTIN',    c.gstin === 'N/A' ? '' : c.gstin);
    this._setVal('clientAddress',  c.address);

    document.querySelector('[data-tab="tab-clients"]')?.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  _setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }
}
