import { expenseApi } from '../services/api.js';

export class ExpenseController {
  static CATEGORIES = [
    { key: 'Software & Subscriptions', icon: '💻' },
    { key: 'Equipment', icon: '🖥️' },
    { key: 'Office & Rent', icon: '🏢' },
    { key: 'Travel', icon: '✈️' },
    { key: 'Marketing', icon: '📣' },
    { key: 'Professional Fees', icon: '📋' },
    { key: 'Internet & Phone', icon: '📱' },
    { key: 'Other', icon: '🧾' },
  ];

  constructor() {
    this.expenses = [];
  }

  static getCategoryIcon(category) {
    const match = ExpenseController.CATEGORIES.find(c => c.key === category);
    return match ? match.icon : '🧾';
  }

  async loadExpenses() {
    try {
      this.expenses = await expenseApi.getAll();
      return this.expenses;
    } catch (err) {
      console.error('Failed to load expenses from API:', err);
      return [];
    }
  }

  async addExpense(formData, id = null) {
    let result;
    if (id) {
      result = await expenseApi.update(id, formData);
      const index = this.expenses.findIndex(e => (e._id || e.id) === id);
      if (index >= 0) this.expenses[index] = result;
    } else {
      result = await expenseApi.create(formData);
      this.expenses.unshift(result);
    }
    return result;
  }

  async deleteExpense(id) {
    await expenseApi.delete(id);
    this.expenses = this.expenses.filter(e => (e._id || e.id) !== id);
  }

  getExpenseById(id) {
    return this.expenses.find(e => (e._id || e.id) === id);
  }

  getAllExpenses() {
    return this.expenses;
  }

  getTotalExpenses() {
    return this.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }

  getExpensesByCategory() {
    const totals = {};
    ExpenseController.CATEGORIES.forEach(c => { totals[c.key] = 0; });
    this.expenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + (e.amount || 0);
    });
    return Object.entries(totals)
      .filter(([, amount]) => amount > 0)
      .sort((a, b) => b[1] - a[1]);
  }
}
