import { Storage } from '../models/Storage.js';

export class ExpenseController {
  static CATEGORIES = [
    { key: 'Software & Subscriptions', icon: '💻' },
    { key: 'Equipment', icon: '🖥️' },
    { key: 'Office & Rent', icon: '🏢' },
    { key: 'Travel', icon: '✈️' },
    { key: 'Marketing', icon: '📣' },
    { key: 'Professional Fees', icon: '📋' },
    { key: 'Internet & Phone', icon: '📱' },
    { key: 'Other', icon: '🧾' }
  ];

  constructor(userId) {
    this.userId = userId;
    this.expenses = Storage.getExpenses(this.userId);
  }

  static getCategoryIcon(category) {
    const match = ExpenseController.CATEGORIES.find(c => c.key === category);
    return match ? match.icon : '🧾';
  }

  addExpense(data) {
    const expense = {
      id: data.id || ('EXP-' + Date.now()),
      userId: this.userId,
      description: data.description,
      category: data.category || 'Other',
      amount: Number(data.amount) || 0,
      date: data.date || new Date().toISOString().split('T')[0],
      notes: data.notes || '',
      createdAt: data.createdAt || new Date().toISOString()
    };

    const existingIndex = this.expenses.findIndex(e => e.id === expense.id);
    if (existingIndex >= 0) {
      this.expenses[existingIndex] = expense;
    } else {
      this.expenses.push(expense);
    }

    Storage.saveExpenses(this.expenses, this.userId);
    return expense;
  }

  deleteExpense(id) {
    this.expenses = this.expenses.filter(e => e.id !== id);
    Storage.saveExpenses(this.expenses, this.userId);
  }

  getExpenseById(id) {
    return this.expenses.find(e => e.id === id);
  }

  getAllExpenses() {
    return [...this.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  getTotalExpenses() {
    return this.expenses.reduce((sum, e) => sum + e.amount, 0);
  }

  getExpensesByCategory() {
    const totals = {};
    ExpenseController.CATEGORIES.forEach(c => { totals[c.key] = 0; });
    this.expenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return Object.entries(totals)
      .filter(([, amount]) => amount > 0)
      .sort((a, b) => b[1] - a[1]);
  }
}
