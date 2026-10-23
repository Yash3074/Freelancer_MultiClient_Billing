import { clientApi } from '../services/api.js';

export class ClientController {
  constructor() {
    this.clients = [];
  }

  async loadClients() {
    try {
      this.clients = await clientApi.getAll();
      return this.clients;
    } catch (err) {
      console.error('Failed to load clients from API:', err);
      return [];
    }
  }

  async addClient(clientData) {
    if (clientData.id) {
      const updated = await clientApi.update(clientData.id, clientData);
      const index = this.clients.findIndex(c => (c._id || c.id) === clientData.id);
      if (index >= 0) this.clients[index] = updated;
      return updated;
    } else {
      const created = await clientApi.create(clientData);
      this.clients.unshift(created);
      return created;
    }
  }

  async deleteClient(id) {
    await clientApi.delete(id);
    this.clients = this.clients.filter(c => (c._id || c.id) !== id);
  }

  getClientById(id) {
    return this.clients.find(c => (c._id || c.id) === id);
  }

  getAllClients() {
    return this.clients;
  }
}
