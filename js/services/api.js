// TaxPulse Pro API Client Service Layer
const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location) {
    const port = window.location.port;
    const protocol = window.location.protocol;
    // When served via Live Server (port 5500), file://, or other dev servers, target port 5000
    if (protocol === 'file:' || (port && port !== '5000')) {
      return 'http://localhost:5000/api/v1';
    }
  }
  return '/api/v1';
};

const API_BASE = getApiBase();

class ApiService {
  static getToken() {
    return localStorage.getItem('taxpulse_token');
  }

  static setToken(token) {
    if (token) {
      localStorage.setItem('taxpulse_token', token);
    } else {
      localStorage.removeItem('taxpulse_token');
    }
  }

  static getStoredUser() {
    const u = localStorage.getItem('taxpulse_user');
    return u ? JSON.parse(u) : null;
  }

  static setStoredUser(user) {
    if (user) {
      localStorage.setItem('taxpulse_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('taxpulse_user');
    }
  }

  static clearSession() {
    localStorage.removeItem('taxpulse_token');
    localStorage.removeItem('taxpulse_user');
  }

  static async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = options.headers || {};

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers,
    };

    try {
      let response;
      try {
        response = await fetch(url, config);
      } catch (networkErr) {
        throw new Error(
          'Cannot connect to TaxPulse backend. Ensure the server is running on http://localhost:5000'
        );
      }

      let data = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text || `Request failed with status ${response.status}` };
      }

      if (!response.ok) {
        if (response.status === 401) {
          this.clearSession();
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err.message);
      throw err;
    }
  }
}

export const authApi = {
  login: async (email, password) => {
    const res = await ApiService.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      ApiService.setToken(res.token);
      ApiService.setStoredUser(res.user);
    }
    return res;
  },

  register: async (data) => {
    const res = await ApiService.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) {
      ApiService.setToken(res.token);
      ApiService.setStoredUser(res.user);
    }
    return res;
  },

  getMe: async () => {
    const res = await ApiService.request('/auth/me');
    if (res.user) ApiService.setStoredUser(res.user);
    return res.user;
  },

  updateProfile: async (data) => {
    const res = await ApiService.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res.user) ApiService.setStoredUser(res.user);
    return res.user;
  },

  uploadLogo: async (file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return await ApiService.request('/auth/logo', {
      method: 'POST',
      body: formData,
    });
  },

  logout: () => {
    ApiService.clearSession();
  },
};

export const clientApi = {
  getAll: async () => {
    const res = await ApiService.request('/clients');
    return res.clients || [];
  },

  getById: async (id) => {
    const res = await ApiService.request(`/clients/${id}`);
    return res.client;
  },

  create: async (data) => {
    const res = await ApiService.request('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.client;
  },

  update: async (id, data) => {
    const res = await ApiService.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.client;
  },

  delete: async (id) => {
    return await ApiService.request(`/clients/${id}`, {
      method: 'DELETE',
    });
  },
};

export const invoiceApi = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const res = await ApiService.request(`/invoices${params ? `?${params}` : ''}`);
    return res.invoices || [];
  },

  getById: async (id) => {
    return await ApiService.request(`/invoices/${id}`);
  },

  create: async (data) => {
    const res = await ApiService.request('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.invoice;
  },

  updateStatus: async (id, status, amountPaid) => {
    const res = await ApiService.request(`/invoices/${id}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ status, amountPaid }),
    });
    return res.invoice;
  },

  delete: async (id) => {
    return await ApiService.request(`/invoices/${id}`, {
      method: 'DELETE',
    });
  },

  getPublic: async (token) => {
    return await ApiService.request(`/invoices/public/${token}`);
  },
};

export const expenseApi = {
  getAll: async (category = '') => {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    const res = await ApiService.request(`/expenses${q}`);
    return res.expenses || [];
  },

  create: async (formData) => {
    const res = await ApiService.request('/expenses', {
      method: 'POST',
      body: formData,
    });
    return res.expense;
  },

  update: async (id, formData) => {
    const res = await ApiService.request(`/expenses/${id}`, {
      method: 'PUT',
      body: formData,
    });
    return res.expense;
  },

  delete: async (id) => {
    return await ApiService.request(`/expenses/${id}`, {
      method: 'DELETE',
    });
  },

  getSummary: async () => {
    return await ApiService.request('/expenses/summary');
  },
};

export const taxApi = {
  getDashboard: async (cashPercent = 0) => {
    const res = await ApiService.request(`/tax/dashboard?cashPercent=${cashPercent}`);
    return res;
  },
};

export const aiApi = {
  categorizeExpense: async (description) => {
    return await ApiService.request('/ai/categorize-expense', {
      method: 'POST',
      body: JSON.stringify({ description }),
    });
  },

  predictClientRisk: async (clientId) => {
    return await ApiService.request(`/ai/client-risk/${clientId}`);
  },
};

export { ApiService };
