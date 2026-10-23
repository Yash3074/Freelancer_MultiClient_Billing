import { aiApi } from '../services/api.js';

export class ClientView {
  constructor(clientController, onClientEdit, onClientDelete) {
    this.clientController = clientController;
    this.onClientEdit = onClientEdit;
    this.onClientDelete = onClientDelete;
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

  async renderClientsList() {
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

    for (const c of clients) {
      const cid = c._id || c.id;
      const card = document.createElement('div');
      card.className = 'card client-card';

      card.innerHTML = `
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <div class="client-avatar">${c.name.charAt(0).toUpperCase()}</div>
            <div>
              <h3>${c.name}</h3>
              <p class="client-company-tag">${c.company || 'Individual Client'}</p>
            </div>
          </div>
          <div>
            <button class="btn-ai-risk btn-outline" data-id="${cid}" style="padding:0.4rem 0.8rem;font-size:0.8rem;margin-right:0.4rem;">
              🤖 AI Health
            </button>
            <button class="btn-edit" data-id="${cid}">Edit</button>
            <button class="btn-delete" data-id="${cid}">Delete</button>
          </div>
        </div>

        <div class="client-meta">
          <span><strong>Email:</strong> ${c.email}</span>
          <span><strong>Location:</strong> ${c.country}</span>
          <span><strong>Currency:</strong> ${c.currency}</span>
          <span><strong>Terms:</strong> Net-${c.paymentTermsDays || 15} days</span>
          <span><strong>GSTIN:</strong> ${c.gstin || 'N/A'}</span>
        </div>

        <p style="margin-top:.75rem;font-size:.88rem;color:var(--text-muted);">
          <strong style="color:var(--text-main);">Address:</strong> ${c.address || 'Not specified'}
        </p>

        <div id="aiRiskBox-${cid}" class="ai-risk-box" style="display:none;margin-top:1rem;padding:0.85rem;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
            <span style="font-weight:600;font-size:0.88rem;color:var(--accent-cyan);">🧠 AI Payment Risk Analysis</span>
            <span id="aiRiskBadge-${cid}" class="badge">Checking...</span>
          </div>
          <p id="aiRiskRec-${cid}" style="font-size:0.83rem;color:var(--text-main);margin:0;"></p>
        </div>
      `;

      card.querySelector('.btn-delete').onclick = () => this.onClientDelete(cid);
      card.querySelector('.btn-edit').onclick = () => this.onClientEdit(c);

      const aiRiskBtn = card.querySelector('.btn-ai-risk');
      aiRiskBtn.onclick = async () => {
        const box = document.getElementById(`aiRiskBox-${cid}`);
        const badge = document.getElementById(`aiRiskBadge-${cid}`);
        const rec = document.getElementById(`aiRiskRec-${cid}`);

        if (box.style.display === 'block') {
          box.style.display = 'none';
          return;
        }

        box.style.display = 'block';
        badge.textContent = 'Analyzing...';
        badge.className = 'badge';

        try {
          const res = await aiApi.predictClientRisk(cid);
          badge.textContent = `${res.riskLevel} (${res.reliabilityScore}/100)`;
          badge.className = res.riskLevel.includes('High')
            ? 'badge badge-unpaid'
            : res.riskLevel.includes('Moderate')
            ? 'badge badge-partial'
            : 'badge badge-paid';
          rec.innerHTML = `<strong>Recommendation:</strong> ${res.recommendation} <br><span style="color:var(--text-muted);font-size:0.78rem;">Paid: ${res.paidCount} | Overdue: ${res.overdueCount || 0}</span>`;
        } catch (e) {
          badge.textContent = 'Unavailable';
          rec.textContent = 'Could not generate AI insight for this client.';
        }
      };

      list.appendChild(card);
    }
  }

  resetClientForm() {
    const titleEl = document.getElementById('clientFormTitle');
    const saveBtn = document.getElementById('btnSaveClient');
    const cancelBtn = document.getElementById('btnCancelClientEdit');
    const form = document.getElementById('clientForm');
    const countryEl = document.getElementById('clientCountry');

    if (titleEl) titleEl.textContent = 'Add New Client';
    if (saveBtn) saveBtn.textContent = 'Save Client';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (form) form.reset();
    if (countryEl) countryEl.value = 'India';
  }

  populateEditForm(c) {
    const titleEl = document.getElementById('clientFormTitle');
    const saveBtn = document.getElementById('btnSaveClient');
    const cancelBtn = document.getElementById('btnCancelClientEdit');

    if (titleEl) titleEl.textContent = `Edit Client — ${c.name}`;
    if (saveBtn) saveBtn.textContent = 'Update Client';
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    this._setVal('clientName', c.name || '');
    this._setVal('clientEmail', c.email || '');
    this._setVal('clientCompany', c.company || '');
    this._setVal('clientCountry', c.country || 'India');
    this._setVal('clientCurrency', c.currency || 'INR');
    this._setVal('clientGSTIN', c.gstin === 'N/A' ? '' : (c.gstin || ''));
    this._setVal('clientAddress', c.address || '');

    document.querySelector('[data-tab="tab-clients"]')?.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  _setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }
}
