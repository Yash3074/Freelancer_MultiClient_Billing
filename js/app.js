import { Storage } from './models/Storage.js';
import { TaxEngine } from './models/TaxEngine.js';
import { FreelancerTaxBenefits } from './models/FreelancerTaxBenefits.js';
import { AuthController } from './controllers/AuthController.js';
import { ClientController } from './controllers/ClientController.js';
import { InvoiceController } from './controllers/InvoiceController.js';
import { ExpenseController } from './controllers/ExpenseController.js';
import { Toast } from './utils/Toast.js';

import { DashboardView } from './views/DashboardView.js';
import { InvoiceView } from './views/InvoiceView.js';
import { ClientView } from './views/ClientView.js';
import { ExpenseView } from './views/ExpenseView.js';
import { AnalyticsView } from './views/AnalyticsView.js';

class App {
  constructor() {
    this.auth = new AuthController();
    this.taxEngine = null;
    this.countries = [];

    this.clientController = null;
    this.invoiceController = null;
    this.expenseController = null;
    this.freelancerTaxBenefits = null;

    this.dashboardView = null;
    this.invoiceView = null;
    this.clientView = null;
    this.expenseView = null;
    this.analyticsView = null;

    this.editingClientId = null;
    this.socket = null;
  }

  async init() {
    // Listen for custom toast events
    window.addEventListener('toast:success', e => Toast.success(e.detail));
    window.addEventListener('toast:error', e => Toast.error(e.detail));
    window.addEventListener('toast:info', e => Toast.info(e.detail));
    window.addEventListener('auth:expired', () => {
      Toast.error('Session expired. Please sign in again.');
      this._showAuthView();
    });

    let config = Storage.get('fta_tax_config');
    if (!config) {
      try {
        const res = await fetch('./js/config/taxSlabs.json');
        config = await res.json();
        Storage.set('fta_tax_config', config);
      } catch (e) {
        config = { exchange_rates: {}, gst: { standard_rate_percent: 18 } };
      }
    }

    try {
      const countriesRes = await fetch('./js/config/countries.json');
      this.countries = await countriesRes.json();
    } catch (e) {
      this.countries = [{ name: 'India', currency: 'INR' }, { name: 'United States', currency: 'USD' }];
    }

    this.taxEngine = new TaxEngine(config);
    this._populateCountrySelects();
    this._bindAuthEvents();
    this._bindLandingEvents();

    if (this.auth.isAuthenticated()) {
      await this._loadDashboard();
    } else {
      this._showLandingView();
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

  _showLandingView() {
    const landing = document.getElementById('landingScreen');
    const auth = document.getElementById('authScreen');
    const app = document.getElementById('appScreen');
    if (landing) landing.style.display = 'block';
    if (auth) {
      auth.classList.remove('modal-open');
      auth.style.display = 'none';
    }
    if (app) app.style.display = 'none';

    // Update buttons in landing navbar depending on auth state
    const isAuth = this.auth?.isAuthenticated();
    const btnDash = document.getElementById('btnLandingDashboard');
    const btnSignIn = document.getElementById('btnLandingSignIn');
    const btnGetStarted = document.getElementById('btnLandingGetStarted');
    if (btnDash && btnSignIn && btnGetStarted) {
      if (isAuth) {
        btnDash.style.display = 'inline-flex';
        btnSignIn.style.display = 'none';
        btnGetStarted.style.display = 'none';
      } else {
        btnDash.style.display = 'none';
        btnSignIn.style.display = 'inline-flex';
        btnGetStarted.style.display = 'inline-flex';
        btnGetStarted.textContent = 'Get Started Free →';
      }
    }

    const btnMobileSignIn = document.getElementById('btnMobileSignIn');
    const btnMobileGetStarted = document.getElementById('btnMobileGetStarted');
    if (btnMobileSignIn && btnMobileGetStarted) {
      if (isAuth) {
        btnMobileSignIn.style.display = 'none';
        btnMobileGetStarted.textContent = 'Go to Dashboard →';
      } else {
        btnMobileSignIn.style.display = 'block';
        btnMobileGetStarted.textContent = 'Get Started Free →';
      }
    }
  }

  _showAuthModal(mode = 'login') {
    const authModal = document.getElementById('authScreen');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotForm = document.getElementById('forgotForm');
    if (!authModal) return;

    if (mode === 'signup') {
      if (loginForm) loginForm.style.display = 'none';
      if (forgotForm) forgotForm.style.display = 'none';
      if (signupForm) signupForm.style.display = 'block';
    } else {
      if (signupForm) signupForm.style.display = 'none';
      if (forgotForm) forgotForm.style.display = 'none';
      if (loginForm) loginForm.style.display = 'block';
    }

    authModal.style.display = 'flex';
    authModal.classList.add('modal-open');
  }

  _closeAuthModal() {
    const authModal = document.getElementById('authScreen');
    if (authModal) {
      authModal.classList.remove('modal-open');
      authModal.style.display = 'none';
    }
  }

  _showAuthView() {
    this._showAuthModal('login');
  }

  _showAppView() {
    const landing = document.getElementById('landingScreen');
    const auth = document.getElementById('authScreen');
    const app = document.getElementById('appScreen');
    if (landing) landing.style.display = 'none';
    if (auth) {
      auth.classList.remove('modal-open');
      auth.style.display = 'none';
    }
    if (app) app.style.display = 'flex';
  }

  async _loadDashboard() {
    try {
      let user = this.auth.getCurrentUser();
      if (!user) {
        this._showLandingView();
        return;
      }

      // Refresh profile in background
      try {
        const refreshedUser = await this.auth.syncProfile();
        if (refreshedUser) {
          user = refreshedUser;
        } else if (!this.auth.isAuthenticated()) {
          this._showLandingView();
          return;
        }
      } catch (e) {
        console.warn('Profile sync fallback to cached user:', e.message);
      }

      this._showAppView();

      document.getElementById('navUserName').textContent = user.name || 'User';
      document.getElementById('navUserAvatar').textContent = this._getInitials(user.name);
      if (user.profession) {
        const roleEl = document.getElementById('navUserRole');
        if (roleEl) roleEl.textContent = user.businessName || user.profession;
      }

      this.clientController = new ClientController();
      this.invoiceController = new InvoiceController(this.taxEngine);
      this.expenseController = new ExpenseController();
      this.freelancerTaxBenefits = new FreelancerTaxBenefits(this.taxEngine);

      const updateDashboard = async () => {
        await this.dashboardView?.update();
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
          this.editingClientId = client._id || client.id;
          this.clientView.populateEditForm(client);
        },
        async (clientId) => {
          try {
            await this.clientController.deleteClient(clientId);
            Toast.info('Client removed.');
            this.invoiceView.renderClientSelect();
            await this.clientView.renderClientsList();
          } catch (err) {
            Toast.error(err.message);
          }
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

      // Load initial data from MongoDB Atlas via REST APIs
      try {
        await Promise.all([
          this.clientController.loadClients(),
          this.invoiceController.loadInvoices(),
          this.expenseController.loadExpenses(),
        ]);
      } catch (syncErr) {
        console.warn('Initial data sync warning:', syncErr.message);
      }

      this.expenseView.populateCategorySelect();
      this.expenseView.bindExpenseForm(Toast);

      this.invoiceView.renderClientSelect();
      await this.clientView.renderClientsList();
      this.invoiceView.renderInvoicesList();
      this.expenseView.renderExpensesList();

      await updateDashboard();
      this._loadProfileForm();
      this._initSocket(user.id || user._id);

      const today = new Date().toISOString().split('T')[0];
      const invDateEl = document.getElementById('invoiceDate');
      if (invDateEl) invDateEl.value = today;

      const container = document.getElementById('lineItemsContainer');
      if (container && container.children.length === 0) {
        this.invoiceView.addLineItem();
      }
    } catch (err) {
      console.error('Error in _loadDashboard:', err);
      Toast.error('Could not initialize dashboard: ' + err.message);
    }
  }

  _initSocket(userId) {
    if (typeof window.io === 'function' && !this.socket) {
      try {
        const socketUrl = (window.location.port && window.location.port !== '5000') ? 'http://localhost:5000' : undefined;
        this.socket = window.io(socketUrl);
        this.socket.emit('join_user_room', userId);

        this.socket.on('invoice:created', async (newInv) => {
          await this.invoiceController.loadInvoices();
          this.invoiceView.renderInvoicesList();
          this.dashboardView?.update();
          this.analyticsView?.update();
        });

        this.socket.on('invoice:updated', async () => {
          await this.invoiceController.loadInvoices();
          this.invoiceView.renderInvoicesList();
          this.dashboardView?.update();
          this.analyticsView?.update();
        });

        this.socket.on('expense:created', async () => {
          await this.expenseController.loadExpenses();
          this.expenseView.renderExpensesList();
          this.dashboardView?.update();
        });
      } catch (e) {
        console.warn('Socket.IO connection skipped:', e.message);
      }
    }
  }

  _loadProfileForm() {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    this._setVal('profileName', user.name || '');
    this._setVal('profileEmail', user.email || '');
    this._setVal('profilePhone', user.phone || '');
    this._setVal('profileBusinessName', user.businessName || '');
    this._setVal('profileAddress', user.address || '');
    this._setVal('profileCountry', user.country || 'India');
    this._setVal('profileUpiId', user.upiId || '');
    this._setVal('profileBankName', user.bankDetails?.bankName || '');
    this._setVal('profileAccountNum', user.bankDetails?.accountNumber || '');
    this._setVal('profileIfsc', user.bankDetails?.ifscCode || '');
    this._setVal('profilePan', user.pan || '');
    this._setVal('profileGstin', user.gstin || '');
    this._setVal('profileNewPass', '');

    this._setText('profileDisplayName', user.name || 'User');
    this._setText('profileDisplayEmail', user.email || '');
    this._setText('profileAvatar', this._getInitials(user.name));
  }

  _bindAuthEvents() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotForm = document.getElementById('forgotForm');

    const showLogin = () => {
      signupForm.style.display = 'none';
      forgotForm.style.display = 'none';
      loginForm.style.display = 'block';
    };

    document.getElementById('showSignup')?.addEventListener('click', () => {
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
    });

    document.getElementById('showLogin')?.addEventListener('click', showLogin);
    document.getElementById('showLoginFromForgot')?.addEventListener('click', showLogin);

    document.getElementById('showForgot')?.addEventListener('click', () => {
      loginForm.style.display = 'none';
      forgotForm.style.display = 'block';
    });

    loginForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : 'Sign In';
      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Signing in...';
        }
        const email = (document.getElementById('loginEmail')?.value || '').trim();
        const pass = document.getElementById('loginPass')?.value || '';
        await this.auth.login(email, pass);
        Toast.success('Welcome back!');
        this._closeAuthModal();
        await this._loadDashboard();
      } catch (err) {
        Toast.error(err.message || 'Login failed. Please check your credentials.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });

    signupForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : 'Create Account';
      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Creating account...';
        }
        const name = (document.getElementById('signupName')?.value || '').trim();
        const email = (document.getElementById('signupEmail')?.value || '').trim();
        const pass = document.getElementById('signupPass')?.value || '';
        await this.auth.signup(name, email, pass);
        Toast.success('Account created on MongoDB Atlas!');
        this._closeAuthModal();
        await this._loadDashboard();
      } catch (err) {
        Toast.error(err.message || 'Account creation failed. Please try again.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });

    forgotForm?.addEventListener('submit', e => {
      e.preventDefault();
      const msg = this.auth.forgotPassword(document.getElementById('forgotEmail').value);
      Toast.info(msg);
    });

    document.getElementById('btnLogout')?.addEventListener('click', () => {
      this.auth.logout();
      Toast.info('Logged out securely.');
      this._showLandingView();
    });

    // Close button for auth modal
    document.getElementById('btnCloseAuth')?.addEventListener('click', () => {
      this._closeAuthModal();
    });

    // Backdrop click to close auth modal
    document.getElementById('authScreen')?.addEventListener('click', (e) => {
      if (e.target.id === 'authScreen') {
        this._closeAuthModal();
      }
    });
  }

  _bindLandingEvents() {
    const openLogin = () => this._showAuthModal('login');
    const openSignup = () => this._showAuthModal('signup');

    document.getElementById('btnLandingSignIn')?.addEventListener('click', openLogin);
    document.getElementById('btnLandingGetStarted')?.addEventListener('click', () => {
      if (this.auth.isAuthenticated()) {
        this._showAppView();
      } else {
        openSignup();
      }
    });

    document.getElementById('btnLandingDashboard')?.addEventListener('click', () => {
      this._showAppView();
    });

    document.getElementById('btnHeroGetStarted')?.addEventListener('click', openSignup);
    document.getElementById('btnMobileSignIn')?.addEventListener('click', openLogin);
    document.getElementById('btnMobileGetStarted')?.addEventListener('click', openSignup);
    document.getElementById('btnBannerGetStarted')?.addEventListener('click', openSignup);
    document.getElementById('btnBannerSignIn')?.addEventListener('click', openLogin);
    document.getElementById('btnCalcCTA')?.addEventListener('click', openSignup);
    document.getElementById('footerLinkSignIn')?.addEventListener('click', (e) => {
      e.preventDefault();
      openLogin();
    });
    document.getElementById('footerLinkSignUp')?.addEventListener('click', (e) => {
      e.preventDefault();
      openSignup();
    });

    // Pricing tier buttons
    document.querySelectorAll('.btn-pricing').forEach(btn => {
      btn.addEventListener('click', () => {
        openSignup();
      });
    });

    // Mobile nav toggle
    const mobileToggle = document.getElementById('landingMobileToggle');
    const mobileMenu = document.getElementById('landingMobileMenu');
    mobileToggle?.addEventListener('click', () => {
      mobileMenu?.classList.toggle('open');
    });

    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu?.classList.remove('open');
      });
    });

    // Sidebar "Public Landing Page" button
    document.getElementById('btnSidebarLanding')?.addEventListener('click', () => {
      this._showLandingView();
    });

    // Interactive Section 44ADA Calculator
    this._initTaxCalculator();

    // Pricing Billing Toggle (Monthly / Annual)
    const billingToggle = document.getElementById('pricingBillingToggle');
    billingToggle?.addEventListener('change', (e) => {
      const isAnnual = e.target.checked;
      document.querySelectorAll('.price-val').forEach(el => {
        const price = isAnnual ? el.dataset.yearly : el.dataset.monthly;
        el.textContent = price;
      });
      document.getElementById('labelMonthly')?.classList.toggle('active', !isAnnual);
      document.getElementById('labelYearly')?.classList.toggle('active', isAnnual);
    });

    // FAQ Accordion
    document.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.parentElement;
        const isOpen = item.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
        if (!isOpen) {
          item.classList.add('active');
        }
      });
    });
  }

  _initTaxCalculator() {
    const slider = document.getElementById('calcRevenueSlider');
    const displayVal = document.getElementById('calcDisplayRevenue');
    const normalTaxable = document.getElementById('calcNormalTaxable');
    const normalTax = document.getElementById('calcNormalTax');
    const normalRate = document.getElementById('calcNormalRate');
    const adaTaxable = document.getElementById('calc44ADATaxable');
    const adaTax = document.getElementById('calc44ADATax');
    const adaRate = document.getElementById('calc44ADARate');
    const note87A = document.getElementById('calc87ANote');
    const taxSavings = document.getElementById('calcTaxSavings');
    const percentSaved = document.getElementById('calcPercentSaved');
    const savingsDesc = document.getElementById('calcSavingsDesc');

    if (!slider || !this.taxEngine) return;

    const formatINR = (val) => '₹' + Math.round(val).toLocaleString('en-IN');

    const updateCalc = (revenue) => {
      const gross = parseFloat(revenue) || 0;
      if (displayVal) displayVal.textContent = formatINR(gross);

      // Normal regime calculation
      const normalRes = this.taxEngine.calculateAnnualIncomeTax(gross, false);
      const nTax = normalRes.totalTaxLiability;
      const nRate = gross > 0 ? ((nTax / gross) * 100).toFixed(1) : '0.0';

      if (normalTaxable) normalTaxable.textContent = formatINR(gross);
      if (normalTax) normalTax.textContent = formatINR(nTax);
      if (normalRate) normalRate.textContent = `${nRate}%`;

      // 44ADA 50% presumptive profit calculation
      const presumptiveIncome = gross * 0.50;
      const adaRes = this.taxEngine.calculateAnnualIncomeTax(presumptiveIncome, false);
      const aTax = adaRes.totalTaxLiability;
      const aRate = gross > 0 ? ((aTax / gross) * 100).toFixed(1) : '0.0';

      if (adaTaxable) adaTaxable.textContent = formatINR(presumptiveIncome);
      if (adaTax) adaTax.textContent = formatINR(aTax);
      if (adaRate) adaRate.textContent = `${aRate}%`;

      if (note87A) {
        if (presumptiveIncome <= 1200000) {
          note87A.textContent = '✅ 100% full tax rebate applied under Section 87A!';
          note87A.style.color = '#34d399';
        } else {
          note87A.textContent = '⚡ 50% flat standard expense deduction legally applied.';
          note87A.style.color = '#94a3b8';
        }
      }

      // Savings
      const savings = Math.max(0, nTax - aTax);
      const pSaved = nTax > 0 ? Math.round((savings / nTax) * 100) : 0;

      if (taxSavings) taxSavings.textContent = formatINR(savings);
      if (percentSaved) percentSaved.textContent = `${pSaved}% Tax Cut`;
      if (savingsDesc) {
        savingsDesc.textContent = `By declaring presumptive income under Section 44ADA, you keep ${formatINR(savings)} in your bank account every year instead of sending it to the tax department!`;
      }
    };

    slider.addEventListener('input', (e) => {
      updateCalc(e.target.value);
      document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === e.target.value);
      });
    });

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.value;
        slider.value = val;
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateCalc(val);
      });
    });

    // Run initial calculation with default value (₹24,00,000)
    updateCalc(slider.value || 2400000);
  }

  _bindAppEvents() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(btn.dataset.tab)?.classList.add('active');
        document.getElementById('sidebar')?.classList.remove('open');

        if (btn.dataset.tab === 'tab-analytics') {
          this.analyticsView?.update();
        }
      };
    });

    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('open');
    });

    // Invoices Filter & Search
    document.querySelectorAll('#invoiceFilterPills .pill').forEach(pill => {
      pill.onclick = () => {
        document.querySelectorAll('#invoiceFilterPills .pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.invoiceView._statusFilter = pill.dataset.filter;
        this.invoiceView.renderInvoicesList();
      };
    });

    document.getElementById('invoiceSearchInput')?.addEventListener('input', e => {
      this.invoiceView._searchQuery = e.target.value.trim();
      this.invoiceView.renderInvoicesList();
    });

    // Client Form Submit
    document.getElementById('clientForm').onsubmit = async e => {
      e.preventDefault();
      try {
        await this.clientController.addClient({
          id: this.editingClientId,
          name: this._getVal('clientName'),
          company: this._getVal('clientCompany'),
          email: this._getVal('clientEmail'),
          country: this._getVal('clientCountry'),
          currency: this._getVal('clientCurrency'),
          gstin: this._getVal('clientGSTIN'),
          address: this._getVal('clientAddress'),
        });

        Toast.success(this.editingClientId ? 'Client updated on cloud!' : 'Client saved to database!');
        this.editingClientId = null;
        this.clientView.resetClientForm();
        this.invoiceView.renderClientSelect();
        await this.clientView.renderClientsList();
      } catch (err) {
        Toast.error(err.message);
      }
    };

    document.getElementById('btnCancelClientEdit')?.addEventListener('click', () => {
      this.editingClientId = null;
      this.clientView.resetClientForm();
    });

    document.getElementById('addItemBtn').onclick = () => this.invoiceView.addLineItem();

    document.getElementById('invoiceForm').onsubmit = async e => {
      e.preventDefault();
      await this._handleInvoiceSubmit();
    };

    document.getElementById('invoiceInitialStatus').onchange = e => {
      document.getElementById('invoiceInitialPaidGroup').style.display =
        e.target.value === 'Partially Paid' ? 'block' : 'none';
    };

    document.getElementById('invoiceClientSelect')?.addEventListener('change', () => {
      this.invoiceView.updateInvoicePreview();
    });

    document.getElementById('freelancerProfession')?.addEventListener('change', () => {
      this.dashboardView?.update();
    });

    document.getElementById('freelancerCashReceipts')?.addEventListener('input', () => {
      this.dashboardView?.update();
    });

    document.getElementById('profileForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      await this._handleProfileSubmit();
    });
  }

  async _handleInvoiceSubmit() {
    const clientId = document.getElementById('invoiceClientSelect').value;
    if (!clientId) return Toast.error('Please select a client.');

    const invoiceDateVal = this._getVal('invoiceDate');
    const dueDateVal = this._getVal('dueDate');
    if (!invoiceDateVal) return Toast.error('Please enter an invoice date.');
    if (!dueDateVal) return Toast.error('Please enter a due date.');

    const items = [];
    document.querySelectorAll('.line-item-row').forEach(row => {
      const desc = row.querySelector('.item-desc').value;
      const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
      const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
      if (desc && qty && rate) items.push({ description: desc, quantity: qty, rate });
    });

    if (items.length === 0) return Toast.error('Please enter at least one line item.');

    const status = this._getVal('invoiceInitialStatus');
    const initialPaid = parseFloat(this._getVal('invoiceInitialPaid')) || 0;

    try {
      await this.invoiceController.createInvoice(
        clientId,
        items,
        invoiceDateVal,
        dueDateVal,
        this._getVal('invoiceNotes'),
        status,
        initialPaid
      );

      Toast.success('Invoice generated and synced to MongoDB!');
      document.getElementById('invoiceForm').reset();
      document.getElementById('lineItemsContainer').innerHTML = '';
      this.invoiceView.addLineItem();
      this.invoiceView.updateInvoicePreview();
      this.invoiceView.renderInvoicesList();
      await this.dashboardView?.update();
      this.analyticsView?.update();

      document.querySelector('[data-tab="tab-invoices"]')?.click();
    } catch (err) {
      Toast.error(err.message);
    }
  }

  async _handleProfileSubmit() {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    try {
      const updates = {
        name: this._getVal('profileName'),
        email: this._getVal('profileEmail'),
        phone: this._getVal('profilePhone'),
        businessName: this._getVal('profileBusinessName'),
        country: this._getVal('profileCountry'),
        address: this._getVal('profileAddress'),
        upiId: this._getVal('profileUpiId'),
        pan: this._getVal('profilePan'),
        gstin: this._getVal('profileGstin'),
        bankDetails: {
          bankName: this._getVal('profileBankName'),
          accountNumber: this._getVal('profileAccountNum'),
          ifscCode: this._getVal('profileIfsc'),
        },
      };

      const newPass = this._getVal('profileNewPass');
      if (newPass && newPass.length >= 6) {
        updates.password = newPass;
      }

      // Check if logo is being uploaded
      const logoInput = document.getElementById('profileLogo');
      if (logoInput && logoInput.files && logoInput.files[0]) {
        await this.auth.uploadLogo(logoInput.files[0]);
      }

      const updated = await this.auth.updateProfile(updates);
      Toast.success('Profile and Banking details saved!');

      this._setText('navUserName', updated.name);
      this._setText('navUserAvatar', this._getInitials(updated.name));
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

const startApp = () => {
  const app = new App();
  app.init();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
