import { Storage } from '../models/Storage.js';

export class AuthController {
  constructor() {
    this.currentUser = Storage.get('fta_session') || null;
  }

  signup(name, email, password) {
    const users = Storage.get('fta_users') || [];
    if (users.some(u => u.email === email)) {
      throw new Error('User with this email already exists.');
    }
    const newUser = {
      id: 'USR-' + Date.now(),
      name,
      email,
      password,
      phone: '',
      businessName: '',
      country: 'India',
      address: '',
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    Storage.set('fta_users', users);
    this.login(email, password);
    return newUser;
  }

  login(email, password) {
    const users = Storage.get('fta_users') || [];
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      throw new Error('Invalid email or password.');
    }
    this.currentUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      businessName: user.businessName || '',
      country: user.country || 'India',
      address: user.address || ''
    };
    Storage.set('fta_session', this.currentUser);
    return this.currentUser;
  }

  updateProfile(userId, updates) {
    const users = Storage.get('fta_users') || [];
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('User not found.');

    const current = users[index];

    if (updates.email && updates.email !== current.email) {
      if (users.some(u => u.email === updates.email && u.id !== userId)) {
        throw new Error('Another account already uses this email.');
      }
    }

    if (updates.currentPassword && updates.newPassword) {
      if (current.password !== updates.currentPassword) {
        throw new Error('Current password is incorrect.');
      }
      if (updates.newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters.');
      }
      current.password = updates.newPassword;
    }

    if (updates.name !== undefined) current.name = updates.name.trim();
    if (updates.email !== undefined) current.email = updates.email.trim();
    if (updates.phone !== undefined) current.phone = updates.phone.trim();
    if (updates.businessName !== undefined) current.businessName = updates.businessName.trim();
    if (updates.country !== undefined) current.country = updates.country;
    if (updates.address !== undefined) current.address = updates.address.trim();

    users[index] = current;
    Storage.set('fta_users', users);

    this.currentUser = {
      id: current.id,
      name: current.name,
      email: current.email,
      phone: current.phone || '',
      businessName: current.businessName || '',
      country: current.country || 'India',
      address: current.address || ''
    };
    Storage.set('fta_session', this.currentUser);
    return this.currentUser;
  }

  getFullUser(userId) {
    const users = Storage.get('fta_users') || [];
    return users.find(u => u.id === userId) || null;
  }

  forgotPassword(email) {
    const users = Storage.get('fta_users') || [];
    const user = users.find(u => u.email === email);
    if (!user) {
      throw new Error('No account found with this email address.');
    }
    return `Password reset link sent to ${email} (Demo Note: Your account password is "${user.password}")`;
  }

  logout() {
    this.currentUser = null;
    Storage.remove('fta_session');
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  getCurrentUser() {
    return this.currentUser;
  }
}