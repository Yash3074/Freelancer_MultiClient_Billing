import { authApi, ApiService } from '../services/api.js';

export class AuthController {
  constructor() {
    this.currentUser = ApiService.getStoredUser() || null;
  }

  async signup(name, email, password) {
    const res = await authApi.register({ name, email, password });
    this.currentUser = res.user;
    return this.currentUser;
  }

  async login(email, password) {
    const res = await authApi.login(email, password);
    this.currentUser = res.user;
    return this.currentUser;
  }

  async updateProfile(updates) {
    const updatedUser = await authApi.updateProfile(updates);
    this.currentUser = updatedUser;
    return this.currentUser;
  }

  async uploadLogo(file) {
    const res = await authApi.uploadLogo(file);
    if (this.currentUser) {
      this.currentUser.logoUrl = res.logoUrl;
      ApiService.setStoredUser(this.currentUser);
    }
    return res;
  }

  async syncProfile() {
    try {
      if (this.isAuthenticated()) {
        const user = await authApi.getMe();
        this.currentUser = user;
        return user;
      }
    } catch (e) {
      this.logout();
    }
    return null;
  }

  forgotPassword(email) {
    return `In a production deployment, a reset link is sent to ${email}. For local testing, you can register a new account or sign in.`;
  }

  logout() {
    this.currentUser = null;
    authApi.logout();
  }

  isAuthenticated() {
    return Boolean(ApiService.getToken());
  }

  getCurrentUser() {
    return this.currentUser || ApiService.getStoredUser();
  }
}
