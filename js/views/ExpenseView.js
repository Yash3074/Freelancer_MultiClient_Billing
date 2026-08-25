/**
 * ExpenseView  —  BUG FIX
 *
 * Previously the entire expense feature was never wired up:
 *  - ExpenseController was never imported or instantiated in app.js
 *  - The expense form had no submit handler
 *  - The category <select> was never populated
 *  - renderExpensesList / renderCategoryBars were never called
 *  - Dashboard stat cards dashTotalExpenses & dashRealNetIncome were never set
 *
 * This module fixes all of the above.
 */
import { ExpenseController } from '../controllers/ExpenseController.js';

export class ExpenseView {
  /**
   * @param {import('../controllers/ExpenseController.js').ExpenseController} expenseController
   * @param {Function} onDashboardUpdate  callback to refresh the dashboard after any change
   */
  constructor(expenseController, onDashboardUpdate) {
    this.expenseController  = expenseController;
    this.onDashboardUpdate  = onDashboardUpdate;
    this._editingExpenseId  = null;
  }

  // ── Populate category select ─────────────────────────────────────
  populateCategorySelect() {
    const sel = document.getElementById('expenseCategory');
    if (!sel) return;

    sel.innerHTML = '';
    ExpenseController.CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value       = cat.key;
      opt.textContent = `${cat.icon} ${cat.key}`;
      sel.appendChild(opt);
    });
  }

  // ── Bind form submit ─────────────────────────────────────────────
  bindExpenseForm(Toast) {
    const form = document.getElementById('expenseForm');
    if (!form) return;

    // Set today's date as default
    const dateInput = document.getElementById('expenseDate');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    form.onsubmit = (e) => {
      e.preventDefault();

      const descEl    = document.getElementById('expenseDescription');
      const catEl     = document.getElementById('expenseCategory');
      const amountEl  = document.getElementById('expenseAmount');
      const dateEl    = document.getElementById('expenseDate');
      const notesEl   = document.getElementById('expenseNotes');

      const amount = parseFloat(amountEl?.value) || 0;
      if (amount <= 0) {
        Toast.error('Please enter a valid expense amount.');
        return;
      }

      this.expenseController.addExpense({
        id:          this._editingExpenseId || undefined,
        description: descEl?.value  || '',
        category:    catEl?.value   || 'Other',
        amount,
        date:        dateEl?.value  || new Date().toISOString().split('T')[0],
        notes:       notesEl?.value || ''
      });

      const isEdit = Boolean(this._editingExpenseId);
      this._editingExpenseId = null;

      Toast.success(isEdit ? 'Expense updated!' : 'Expense saved!');
      form.reset();
      if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];

      // Reset form heading/button
      const heading = document.getElementById('expenseFormTitle');
      const btn     = document.getElementById('btnSaveExpense');
      const cancelBtn = document.getElementById('btnCancelExpenseEdit');
      if (heading)   heading.textContent   = 'Add Expense';
      if (btn)       btn.textContent       = 'Save Expense';
      if (cancelBtn) cancelBtn.style.display = 'none';

      this.renderExpensesList();
      this.onDashboardUpdate();
    };

    // Cancel edit button
    const cancelBtn = document.getElementById('btnCancelExpenseEdit');
    cancelBtn?.addEventListener('click', () => {
      this._editingExpenseId = null;
      form.reset();
      const heading = document.getElementById('expenseFormTitle');
      const btn     = document.getElementById('btnSaveExpense');
      if (heading)   heading.textContent   = 'Add Expense';
      if (btn)       btn.textContent       = 'Save Expense';
      cancelBtn.style.display = 'none';
    });
  }

  // ── Render expenses list ─────────────────────────────────────────
  renderExpensesList() {
    const list = document.getElementById('expensesList');
    if (!list) return;

    list.innerHTML = '';
    const expenses = this.expenseController.getAllExpenses();
    const total    = this.expenseController.getTotalExpenses();

    // Update count chip
    const countEl = document.getElementById('expenseCount');
    if (countEl) {
      countEl.textContent =
        `${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`;
    }

    // Update stat card
    const totalEl = document.getElementById('expTotalAmount');
    if (totalEl) {
      totalEl.textContent =
        `₹${total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    }

    // Update top category
    const byCategory = this.expenseController.getExpensesByCategory();
    const topCatEl   = document.getElementById('expTopCategory');
    const topNoteEl  = document.getElementById('expTopCategoryNote');
    if (byCategory.length > 0) {
      const [topKey, topAmt] = byCategory[0];
      const icon = ExpenseController.getCategoryIcon(topKey);
      if (topCatEl)  topCatEl.textContent  = `${icon} ${topKey}`;
      if (topNoteEl) topNoteEl.textContent =
        `₹${topAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    } else {
      if (topCatEl)  topCatEl.textContent  = '—';
      if (topNoteEl) topNoteEl.textContent = 'No expenses yet';
    }

    // Category breakdown bars
    this.renderCategoryBars(byCategory, total);

    // Empty state
    if (expenses.length === 0) {
      list.innerHTML = `
        <div class="empty-state card">
          <div class="empty-state-icon">🧾</div>
          <p>No expenses logged yet. Add your first expense above.</p>
        </div>
      `;
      return;
    }

    // Expense cards
    expenses.forEach(exp => {
      const card = document.createElement('div');
      card.className = 'card expense-card';

      const icon = ExpenseController.getCategoryIcon(exp.category);

      card.innerHTML = `
        <div class="expense-card-main">
          <div class="expense-icon">${icon}</div>
          <div class="expense-info">
            <h4>${exp.description}</h4>
            <div class="expense-meta">
              <span class="expense-category-tag">${exp.category}</span>
              <span>📅 ${exp.date}</span>
              ${exp.notes ? `<span>💬 ${exp.notes}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="expense-right">
          <div class="expense-amount">₹${exp.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div class="expense-actions">
            <button class="btn-edit   expense-edit-btn"   data-id="${exp.id}" title="Edit">✏️</button>
            <button class="btn-delete expense-delete-btn" data-id="${exp.id}" title="Delete">🗑️</button>
          </div>
        </div>
      `;

      // Delete
      card.querySelector('.expense-delete-btn').onclick = () => {
        this.expenseController.deleteExpense(exp.id);
        this.renderExpensesList();
        this.onDashboardUpdate();
      };

      // Edit — pre-fill form
      card.querySelector('.expense-edit-btn').onclick = () => {
        this._editingExpenseId = exp.id;

        this._setVal('expenseDescription', exp.description);
        this._setVal('expenseCategory',    exp.category);
        this._setVal('expenseAmount',      exp.amount);
        this._setVal('expenseDate',        exp.date);
        this._setVal('expenseNotes',       exp.notes || '');

        const heading   = document.getElementById('expenseFormTitle');
        const btn       = document.getElementById('btnSaveExpense');
        const cancelBtn = document.getElementById('btnCancelExpenseEdit');
        if (heading)   heading.textContent     = 'Edit Expense';
        if (btn)       btn.textContent         = 'Update Expense';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';

        document.getElementById('expenseForm')?.scrollIntoView({ behavior: 'smooth' });
      };

      list.appendChild(card);
    });
  }

  // ── Category bars ────────────────────────────────────────────────
  renderCategoryBars(byCategory, total) {
    const container = document.getElementById('expenseCategoryBars');
    const card      = document.getElementById('expenseCategoryCard');
    if (!container || !card) return;

    if (byCategory.length === 0) {
      card.style.display = 'none';
      return;
    }

    card.style.display = 'block';
    container.innerHTML = '';

    byCategory.forEach(([key, amt]) => {
      const pct  = total > 0 ? ((amt / total) * 100).toFixed(1) : 0;
      const icon = ExpenseController.getCategoryIcon(key);
      const row  = document.createElement('div');
      row.className = 'category-bar-row';
      row.innerHTML = `
        <div class="category-bar-label">
          <strong>${icon} ${key}</strong>
          <span>₹${amt.toLocaleString('en-IN', { maximumFractionDigits: 0 })} · ${pct}%</span>
        </div>
        <div class="category-bar-track">
          <div class="category-bar-fill" style="width:${pct}%"></div>
        </div>
      `;
      container.appendChild(row);
    });
  }

  _setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }
}
