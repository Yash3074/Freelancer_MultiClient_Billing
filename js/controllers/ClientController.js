import { Storage } from '../models/Storage.js';

export class ClientController {
  constructor(userId) {
    this.userId = userId;
    this.clients = Storage.getClients(this.userId);
  }

  addClient(clientData) {
    const client = {
      id: clientData.id || ('CLI-' + Date.now()),
      userId: this.userId,
      name: clientData.name,
      email: clientData.email,
      country: clientData.country || 'India',
      currency: clientData.currency || 'INR',
      gstin: clientData.gstin || 'N/A',
      address: clientData.address || '',
      createdAt: clientData.createdAt || new Date().toISOString()
    };

    const existingIndex = this.clients.findIndex(c => c.id === client.id);
    if (existingIndex >= 0) {
      this.clients[existingIndex] = client;
    } else {
      this.clients.push(client);
    }

    Storage.saveClients(this.clients, this.userId);
    return client;
  }

  deleteClient(id) {
    this.clients = this.clients.filter(c => c.id !== id);
    Storage.saveClients(this.clients, this.userId);
  }

  getClientById(id) {
    return this.clients.find(c => c.id === id);
  }

  getAllClients() {
    return this.clients;
  }
}