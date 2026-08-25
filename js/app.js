import { Storage }               from './models/Storage.js';
import { TaxEngine }             from './models/TaxEngine.js';
import { FreelancerTaxBenefits } from './models/FreelancerTaxBenefits.js';
import { AuthController }        from './controllers/AuthController.js';
import { ClientController }      from './controllers/ClientController.js';
import { InvoiceController }     from './controllers/InvoiceController.js';
import { ExpenseController }     from './controllers/ExpenseController.js'; 
import { Toast }                 from './utils/Toast.js';

import { DashboardView }  from './views/DashboardView.js';
import { InvoiceView }    from './views/InvoiceView.js';
import { ClientView }     from './views/ClientView.js';
import { ExpenseView }    from './views/ExpenseView.js';
import { AnalyticsView }  from './views/AnalyticsView.js';

class App {
  constructor() {
    this.auth      = new AuthController();
    this.taxEngine = null;
    this.countries = [];
    
    this.clientController   = null;
    this.invoiceController  = null;
    this.expenseController  = null;  
    this.freelancerTaxBenefits = null;

    this.dashboardView  = null;
    this.invoiceView    = null;
    this.clientView     = null;
    this.expenseView    = null;
    this.analyticsView  = null;

    this.editingClientId = null;
  }

  async init() {
  
    let config = Storage.get('fta_tax_config');
    if (!config) {
      const res = await fetch('./js/config/taxSlabs.json');
      config = await res.json();
      Storage.set('fta_tax_config', config);
    }
    
    const countriesRes = await fetch('./js/config/countries.json');
    this.countries = await countriesRes.json();

    this.taxEngine = new TaxEngine(config);
    this._populateCountrySelects();
    this._bindAuthEvents();

    if (this.auth.isAuthenticated()) {
      this._loadDashboard();
    } else {
      this._showAuthView();
    }
  }
  
  _populateCountrySelects() {
    ['clientCountry', 'profileCountry'].forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;

      select.innerHTML = this.countries
        .map(c => `<option value="${c.name}">${c.name}</option>`)
        .join('');

      if (id === 'clientCountry') select.value = 'India';
    });
  }

  _showAuthView() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('appScreen').style.display  = 'none';
  }

  _showAppView() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appScreen').style.display  = 'flex';
  }

  _loadDashboard() {
    const user = this.auth.getCurrentUser();
    if (!user) { this._showAuthView(); return; }

    this._showAppView();

    document.getElementById('navUserName').textContent   = user.name;
    document.getElementById('navUserAvatar').textContent = this._getInitials(user.name);

    this.clientController      = new ClientController(user.id);
    this.invoiceController     = new InvoiceController(this.taxEngine, user.id);
    this.expenseController     = new ExpenseController(user.id);   // BUG FIX
    this.freelancerTaxBenefits = new FreelancerTaxBenefits(this.taxEngine);

    const updateDashboard = () => {
      this.dashboardView?.update();
      this.analyticsView?.update();
    };

    this.dashboardView = new DashboardView(
      this.taxEngine,
      this.invoiceController,
      this.expenseController,     
      this.freelancerTaxBenefits
    );

    this.invoiceView = new InvoiceView(
      this.invoiceController,
      this.clientController,
      this.taxEngine,
      this.auth,
      updateDashboard
    );

    this.clientView = new ClientView(
      this.clientController,
      (client) => {
        this.editingClientId = client.id;
        this.clientView.populateEditForm(client);
      },
      (clientId) => {
        this.clientController.deleteClient(clientId);
        Toast.info('Client removed.');
        this.invoiceView.renderClientSelect();
        this.clientView.renderClientsList();
      }
    );

    this.expenseView = new ExpenseView(
      this.expenseController,
      updateDashboard
    );

    this.analyticsView = new AnalyticsView(
      this.invoiceController,
      this.expenseController
    );

    this._bindAppEvents();

    this.expenseView.populateCategorySelect();   
    this.expenseView.bindExpenseForm(Toast);   

    this.invoiceView.renderClientSelect();
    this.clientView.renderClientsList();
    this.invoiceView.renderInvoicesList();
    this.expenseView.renderExpensesList();  

    this.dashboardView.update();
    this.analyticsView.update();

    this._loadProfileForm();

    const today = new Date().toISOString().split('T')[0];
    const invDateEl = document.getElementById('invoiceDate');
    if (invDateEl) invDateEl.value = today;

    const container = document.getElementById('lineItemsContainer');
    if (container && container.children.length === 0) {
      this.invoiceView.addLineItem();
    }
  }

  _loadProfileForm() {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    this._setVal('profileName',         user.name        || '');
    this._setVal('profileEmail',        user.email       || '');
    this._setVal('profilePhone',        user.phone       || '');
    this._setVal('profileBusinessName', user.businessName || '');
    this._setVal('profileAddress',      user.address     || '');
    this._setVal('profileCountry',      user.country     || 'India');
    this._setVal('profileCurrentPass',  '');
    this._setVal('profileNewPass',      '');

    this._setText('profileDisplayName',  user.name);
    this._setText('profileDisplayEmail', user.email);
    this._setText('profileAvatar',       this._getInitials(user.name));
  }

  _bindAuthEvents() {
    const loginForm  = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotForm = document.getElementById('forgotForm');

    const showLogin = () => {
      signupForm.style.display = 'none';
      forgotForm.style.display = 'none';
      loginForm.style.display  = 'block';
    };

    document.getElementById('showSignup')
      ?.addEventListener('click', () => {
        loginForm.style.display  = 'none';
        signupForm.style.display = 'block';
      });

    document.getElementById('showLogin')
      ?.addEventListener('click', showLogin);

    document.getElementById('showLoginFromForgot')
      ?.addEventListener('click', showLogin);

    document.getElementById('showForgot')
      ?.addEventListener('click', () => {
        loginForm.style.display  = 'none';
        forgotForm.style.display = 'block';
      });

    loginForm?.addEventListener('submit', e => {
      e.preventDefault();
      try {
        this.auth.login(
          document.getElementById('loginEmail').value,
          document.getElementById('loginPass').value
        );
        Toast.success('Welcome back!');
        this._loadDashboard();
      } catch (err) {
        Toast.error(err.message);
      }
    });

    signupForm?.addEventListener('submit', e => {
      e.preventDefault();
      try {
        this.auth.signup(
          document.getElementById('signupName').value,
          document.getElementById('signupEmail').value,
          document.getElementById('signupPass').value
        );
        Toast.success('Account created successfully!');
        this._loadDashboard();
      } catch (err) {
        Toast.error(err.message);
      }
    });

    forgotForm?.addEventListener('submit', e => {
      e.preventDefault();
      try {
        const msg = this.auth.forgotPassword(
          document.getElementById('forgotEmail').value
        );
        Toast.info(msg);
      } catch (err) {
        Toast.error(err.message);
      }
    });

    document.getElementById('btnLogout')
      ?.addEventListener('click', () => {
        this.auth.logout();
        Toast.info('Logged out successfully.');
        this._showAuthView();
      });
  }
  _bindAppEvents() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.nav-btn')
          .forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content')
          .forEach(t => t.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(btn.dataset.tab)?.classList.add('active');
        document.getElementById('sidebar')?.classList.remove('open');

        if (btn.dataset.tab === 'tab-analytics') {
          this.analyticsView?.update();
        }
      };
    });

    document.getElementById('sidebarToggle')
      ?.addEventListener('click', () => {
        document.getElementById('sidebar')?.classList.toggle('open');
      });

    document.getElementById('clientForm').onsubmit = e => {
      e.preventDefault();
      this.clientController.addClient({
        id:       this.editingClientId,
        name:     this._getVal('clientName'),
        email:    this._getVal('clientEmail'),
        country:  this._getVal('clientCountry'),
        currency: this._getVal('clientCurrency'),
        gstin:    this._getVal('clientGSTIN'),
        address:  this._getVal('clientAddress')
      });

      Toast.success(this.editingClientId ? 'Client updated!' : 'Client added!');
      this.editingClientId = null;
      this.clientView.resetClientForm();
      this.invoiceView.renderClientSelect();
      this.clientView.renderClientsList();
    };

    document.getElementById('btnCancelClientEdit')
      ?.addEventListener('click', () => {
        this.editingClientId = null;
        this.clientView.resetClientForm();
      });

    document.getElementById('addItemBtn').onclick = () =>
      this.invoiceView.addLineItem();

    document.getElementById('invoiceForm').onsubmit = e => {
      e.preventDefault();
      this._handleInvoiceSubmit();
    };

    document.getElementById('invoiceInitialStatus').onchange = e => {
      document.getElementById('invoiceInitialPaidGroup').style.display =
        e.target.value === 'Partially Paid' ? 'block' : 'none';
    };

    document.getElementById('invoiceClientSelect')
      ?.addEventListener('change', () => this.invoiceView.updateInvoicePreview());

    document.getElementById('freelancerProfession')
      ?.addEventListener('change', () => this.dashboardView?.update());

    document.getElementById('freelancerCashReceipts')
      ?.addEventListener('input',  () => this.dashboardView?.update());

    document.getElementById('profileForm')
      ?.addEventListener('submit', e => {
        e.preventDefault();
        this._handleProfileSubmit();
      });
  }

  _handleInvoiceSubmit() {
    const clientId = document.getElementById('invoiceClientSelect').value;
    const client   = this.clientController.getClientById(clientId);
    if (!client)               return Toast.error('Please select a client.');

    const invoiceDateVal = this._getVal('invoiceDate');
    const dueDateVal     = this._getVal('dueDate');
    if (!invoiceDateVal) return Toast.error('Please enter an invoice date.');
    if (!dueDateVal)     return Toast.error('Please enter a due date.');

    const items = [];
    document.querySelectorAll('.line-item-row').forEach(row => {
      const desc = row.querySelector('.item-desc').value;
      const qty  = parseFloat(row.querySelector('.item-qty').value)  || 0;
      const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
      if (desc && qty && rate) items.push({ description: desc, quantity: qty, rate });
    });

    if (items.length === 0) return Toast.error('Please enter at least one line item.');

    const status      = this._getVal('invoiceInitialStatus');
    const initialPaid = parseFloat(this._getVal('invoiceInitialPaid')) || 0;

    this.invoiceController.createInvoice(
      client, items, invoiceDateVal, dueDateVal,
      this._getVal('invoiceNotes'), status, initialPaid
    );

    Toast.success('Invoice generated and saved!');
    document.getElementById('invoiceForm').reset();
    document.getElementById('lineItemsContainer').innerHTML = '';
    this.invoiceView.addLineItem();
    this.invoiceView.updateInvoicePreview();
    this.invoiceView.renderInvoicesList();
    this.dashboardView?.update();
    this.analyticsView?.update();

    document.querySelector('[data-tab="tab-invoices"]')?.click();
  }

  _handleProfileSubmit() {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    try {
      const updates = {
        name:         this._getVal('profileName'),
        email:        this._getVal('profileEmail'),
        phone:        this._getVal('profilePhone'),
        businessName: this._getVal('profileBusinessName'),
        country:      this._getVal('profileCountry'),
        address:      this._getVal('profileAddress')
      };

      const currentPass = this._getVal('profileCurrentPass');
      const newPass     = this._getVal('profileNewPass');
      if (currentPass || newPass) {
        updates.currentPassword = currentPass;
        updates.newPassword     = newPass;
      }

      this.auth.updateProfile(user.id, updates);
      Toast.success('Profile updated successfully!');

      this._setText('navUserName',   updates.name);
      this._setText('navUserAvatar', this._getInitials(updates.name));
      this._loadProfileForm();
    } catch (err) {
      Toast.error(err.message);
    }
  }

  _getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  _getVal(id) {
    return document.getElementById(id)?.value ?? '';
  }

  _setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  _setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
