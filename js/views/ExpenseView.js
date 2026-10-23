import { ExpenseController } from '../controllers/ExpenseController.js';
import { aiApi } from '../services/api.js';

export class ExpenseView {
  constructor(expenseController, onDashboardUpdate) {
    this.expenseController = expenseController;
    this.onDashboardUpdate = onDashboardUpdate;
    this._editingExpenseId = null;
  }

  populateCategorySelect() {
    const sel = document.getElementById('expenseCategory');
    if (!sel) return;

    sel.innerHTML = '';
    ExpenseController.CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.key;
      opt.textContent = `${cat.icon} ${cat.key}`;
      sel.appendChild(opt);
    });
  }

  bindExpenseForm(Toast) {
    const form = document.getElementById('expenseForm');
    if (!form) return;

    const dateInput = document.getElementById('expenseDate');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    // AI Categorizer Button Binding
    const aiBtn = document.getElementById('btnAiCategorize');
    const descInput = document.getElementById('expenseDescription');
    const catSelect = document.getElementById('expenseCategory');

    if (aiBtn && descInput && catSelect) {
      aiBtn.onclick = async () => {
        const text = descInput.value.trim();
        if (!text) {
          Toast.info('Please enter a description first to auto-categorize.');
          return;
        }

        aiBtn.textContent = '⏳ Thinking...';
        try {
          const res = await aiApi.categorizeExpense(text);
          if (res.suggestedCategory && res.suggestedCategory !== 'Other') {
            catSelect.value = res.suggestedCategory;
            Toast.success(`AI classified as "${res.suggestedCategory}" (${res.confidenceScore} confidence)`);
          } else {
            Toast.info(res.explanation || 'General expense detected.');
          }
        } catch (e) {
          Toast.error('AI Categorizer failed.');
        } finally {
          aiBtn.innerHTML = '✨ AI Auto-Categorize';
        }
      };
    }

    form.onsubmit = async (e) => {
      e.preventDefault();

      const descEl = document.getElementById('expenseDescription');
      const catEl = document.getElementById('expenseCategory');
      const amountEl = document.getElementById('expenseAmount');
      const dateEl = document.getElementById('expenseDate');
      const notesEl = document.getElementById('expenseNotes');
      const receiptFileEl = document.getElementById('expenseReceipt');

      const amount = parseFloat(amountEl?.value) || 0;
      if (amount <= 0) {
        Toast.error('Please enter a valid expense amount.');
        return;
      }

      const formData = new FormData();
      formData.append('description', descEl?.value || '');
      formData.append('category', catEl?.value || 'Other');
      formData.append('amount', amount);
      formData.append('date', dateEl?.value || new Date().toISOString().split('T')[0]);
      formData.append('notes', notesEl?.value || '');

      if (receiptFileEl && receiptFileEl.files && receiptFileEl.files[0]) {
        formData.append('receipt', receiptFileEl.files[0]);
      }

      try {
        const isEdit = Boolean(this._editingExpenseId);
        await this.expenseController.addExpense(formData, this._editingExpenseId);
        this._editingExpenseId = null;

        Toast.success(isEdit ? 'Expense updated!' : 'Expense saved with receipt!');
        form.reset();
        if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];

        const heading = document.getElementById('expenseFormTitle');
        const btn = document.getElementById('btnSaveExpense');
        const cancelBtn = document.getElementById('btnCancelExpenseEdit');
        if (heading) heading.textContent = 'Add Expense';
        if (btn) btn.textContent = 'Save Expense';
        if (cancelBtn) cancelBtn.style.display = 'none';

        this.renderExpensesList();
        this.onDashboardUpdate();
      } catch (err) {
        Toast.error(err.message || 'Failed to save expense.');
      }
    };

    const cancelBtn = document.getElementById('btnCancelExpenseEdit');
    cancelBtn?.addEventListener('click', () => {
      this._editingExpenseId = null;
      form.reset();
      const heading = document.getElementById('expenseFormTitle');
      const btn = document.getElementById('btnSaveExpense');
      if (heading) heading.textContent = 'Add Expense';
      if (btn) btn.textContent = 'Save Expense';
      cancelBtn.style.display = 'none';
      if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    });
  }

  renderExpensesList() {
    const list = document.getElementById('expensesList');
    if (!list) return;

    list.innerHTML = '';
    const expenses = this.expenseController.getAllExpenses();

    const countEl = document.getElementById('expenseCount');
    if (countEl) {
      countEl.textContent = `${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`;
    }

    const totalEl = document.getElementById('expTotalAmount');
    if (totalEl) {
      totalEl.textContent = `₹${this.expenseController.getTotalExpenses().toLocaleString('en-IN')}`;
    }

    this.renderCategoryBars();

    if (expenses.length === 0) {
      list.innerHTML = `
        <div class="empty-state card">
          <div class="empty-state-icon">🧾</div>
          <p>No expenses logged yet. Add your deductible costs above.</p>
        </div>
      `;
      return;
    }

    expenses.forEach(e => {
      const expId = e._id || e.id;
      const card = document.createElement('div');
      card.className = 'card expense-card';

      const icon = ExpenseController.getCategoryIcon(e.category);
      const dateStr = e.date ? new Date(e.date).toLocaleDateString() : '—';
      const receiptBtn = e.receiptUrl
        ? `<button class="btn-receipt btn-outline" data-url="${e.receiptUrl}" style="padding:0.35rem 0.75rem;font-size:0.8rem;">📎 View Bill</button>`
        : '';

      card.innerHTML = `
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <span style="font-size:1.5rem;">${icon}</span>
            <div>
              <h3>${e.description}</h3>
              <p style="font-size:0.82rem;color:var(--text-muted);margin:0;">
                <span class="badge" style="background:rgba(255,255,255,0.08);">${e.category}</span> · ${dateStr}
              </p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <span style="font-size:1.2rem;font-weight:700;color:var(--accent-red);">-₹${(e.amount || 0).toLocaleString('en-IN')}</span>
            ${receiptBtn}
            <button class="btn-delete" data-id="${expId}">Delete</button>
          </div>
        </div>
        ${e.notes ? `<p style="margin-top:0.5rem;font-size:0.85rem;color:var(--text-muted);">${e.notes}</p>` : ''}
      `;

      card.querySelector('.btn-delete').onclick = async () => {
        if (!confirm('Delete this expense?')) return;
        try {
          await this.expenseController.deleteExpense(expId);
          this.renderExpensesList();
          this.onDashboardUpdate();
          window.dispatchEvent(new CustomEvent('toast:info', { detail: 'Expense deleted.' }));
        } catch (err) {
          window.dispatchEvent(new CustomEvent('toast:error', { detail: err.message }));
        }
      };

      const btnViewReceipt = card.querySelector('.btn-receipt');
      if (btnViewReceipt) {
        btnViewReceipt.onclick = () => {
          this.showReceiptModal(e.receiptUrl, e.description);
        };
      }

      list.appendChild(card);
    });
  }

  showReceiptModal(url, title) {
    let modal = document.getElementById('receiptPreviewModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'receiptPreviewModal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-card">
          <div class="modal-header">
            <h3 id="receiptModalTitle">Receipt Preview</h3>
            <button class="modal-close" onclick="document.getElementById('receiptPreviewModal').style.display='none'">&times;</button>
          </div>
          <div class="modal-body" id="receiptModalContent" style="text-align:center;padding:1rem;"></div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const titleEl = document.getElementById('receiptModalTitle');
    const contentEl = document.getElementById('receiptModalContent');
    if (titleEl) titleEl.textContent = `Receipt: ${title}`;

    if (url.toLowerCase().endsWith('.pdf')) {
      contentEl.innerHTML = `<iframe src="${url}" style="width:100%;height:500px;border:none;"></iframe>`;
    } else {
      contentEl.innerHTML = `<img src="${url}" style="max-width:100%;max-height:500px;border-radius:8px;object-fit:contain;">`;
    }

    modal.style.display = 'flex';
  }

  renderCategoryBars() {
    const card = document.getElementById('expenseCategoryCard');
    const container = document.getElementById('expenseCategoryBars');
    if (!card || !container) return;

    const byCat = this.expenseController.getExpensesByCategory();
    const total = this.expenseController.getTotalExpenses();

    if (byCat.length === 0 || total === 0) {
      card.style.display = 'none';
      return;
    }

    card.style.display = 'block';
    container.innerHTML = '';

    byCat.forEach(([cat, amt]) => {
      const pct = Math.round((amt / total) * 100);
      const icon = ExpenseController.getCategoryIcon(cat);

      const row = document.createElement('div');
      row.className = 'category-bar-row';
      row.style.marginBottom = '0.75rem';
      row.innerHTML = `
        <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:0.25rem;">
          <span>${icon} ${cat}</span>
          <span style="font-weight:600;">₹${amt.toLocaleString('en-IN')} (${pct}%)</span>
        </div>
        <div style="background:rgba(255,255,255,0.06);height:8px;border-radius:4px;overflow:hidden;">
          <div style="width:${pct}%;background:linear-gradient(90deg,#6366f1,#a855f7);height:100%;"></div>
        </div>
      `;
      container.appendChild(row);
    });
  }
}
