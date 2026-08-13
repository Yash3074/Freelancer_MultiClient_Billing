export class Storage {
  // The session key is intentionally kept in sessionStorage (not localStorage).
  // localStorage survives closing/restarting the app entirely, which meant a
  // logged-in user stayed logged in forever. sessionStorage clears when the
  // browser/tab is actually closed, while still surviving a normal page reload.
  static SESSION_KEY = 'fta_session';

  static get(key) {
    const store = key === this.SESSION_KEY ? sessionStorage : localStorage;
    const data = store.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  static set(key, value) {
    const store = key === this.SESSION_KEY ? sessionStorage : localStorage;
    store.setItem(key, JSON.stringify(value));
  }

  static remove(key) {
    const store = key === this.SESSION_KEY ? sessionStorage : localStorage;
    store.removeItem(key);
  }

  static getClients(userId) {
    const clients = this.get('fta_clients') || [];
    return clients.filter(c => c.userId === userId);
  }

  static saveClients(clients, userId) {
    const allClients = (this.get('fta_clients') || []).filter(c => c.userId !== userId);
    this.set('fta_clients', [...allClients, ...clients]);
  }

  static getInvoices(userId) {
    const invoices = this.get('fta_invoices') || [];
    return invoices.filter(i => i.userId === userId);
  }

  static saveInvoices(invoices, userId) {
    const allInvoices = (this.get('fta_invoices') || []).filter(i => i.userId !== userId);
    this.set('fta_invoices', [...allInvoices, ...invoices]);
  }
}