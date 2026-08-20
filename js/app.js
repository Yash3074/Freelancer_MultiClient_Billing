import { Storage } from './models/Storage.js';
import { TaxEngine } from './models/TaxEngine.js';
import { FreelancerTaxBenefits } from './models/FreelancerTaxBenefits.js';
import { AuthController } from './controllers/AuthController.js';
import { ClientController } from './controllers/ClientController.js';
import { InvoiceController } from './controllers/InvoiceController.js';
import { Toast } from './utils/Toast.js';

class App {
  constructor() {
    this.auth = new AuthController();
    this.taxEngine = null;
    this.clientController = null;
    this.invoiceController = null;
    this.freelancerTaxBenefits = null;
    this.editingClientId = null;
    this.countries = [];
  }

  async init() {
    let config = Storage.get('fta_tax_config');

    if (!config) {
      const response = await fetch('./js/config/taxSlabs.json');
      config = await response.json();
      Storage.set('fta_tax_config', config);
    }

    const countriesRes = await fetch('./js/config/countries.json');
    this.countries = await countriesRes.json();

    this.taxEngine = new TaxEngine(config);
    this.populateCountrySelects();
    this.bindAuthEvents();

    if (this.auth.isAuthenticated()) {
      this.loadDashboard();
    } else {
      this.showAuthView();
    }
  }

  populateCountrySelects() {
    ['clientCountry', 'profileCountry'].forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;

      select.innerHTML = this.countries
        .map(c => `<option value="${c.name}">${c.name}</option>`)
        .join('');

      if (id === 'clientCountry') {
        select.value = 'India';
      }
    });
  }

  getInitials(name) {
    if (!name) return 'U';

    return name
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  showAuthView() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('appScreen').style.display = 'none';
  }

  loadDashboard() {
    const user = this.auth.getCurrentUser();

    if (!user) {
      this.showAuthView();
      return;
    }

    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'flex';

    const initials = this.getInitials(user.name);

    document.getElementById('navUserName').textContent = user.name;
    document.getElementById('navUserAvatar').textContent = initials;

    this.clientController = new ClientController(user.id);

    this.invoiceController =
      new InvoiceController(this.taxEngine, user.id);

    this.freelancerTaxBenefits =
      new FreelancerTaxBenefits(this.taxEngine);

    this.bindAppEvents();

    this.renderClientSelect();
    this.renderClientsList();
    this.renderInvoicesList();
    this.updateDashboard();
    this.loadProfileForm();

    const today = new Date().toISOString().split('T')[0];

    document.getElementById('invoiceDate').value = today;

    if (
      document.getElementById('lineItemsContainer').children.length === 0
    ) {
      this.addLineItem();
    }
  }

  loadProfileForm() {
    const user = this.auth.getCurrentUser();

    if (!user) return;

    document.getElementById('profileName').value = user.name || '';
    document.getElementById('profileEmail').value = user.email || '';
    document.getElementById('profilePhone').value = user.phone || '';
    document.getElementById('profileBusinessName').value =
      user.businessName || '';
    document.getElementById('profileAddress').value =
      user.address || '';
    document.getElementById('profileCountry').value =
      user.country || 'India';

    document.getElementById('profileCurrentPass').value = '';
    document.getElementById('profileNewPass').value = '';

    document.getElementById('profileDisplayName').textContent =
      user.name;

    document.getElementById('profileDisplayEmail').textContent =
      user.email;

    document.getElementById('profileAvatar').textContent =
      this.getInitials(user.name);
  }

  bindAuthEvents() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotForm = document.getElementById('forgotForm');

    const showLogin = () => {
      signupForm.style.display = 'none';
      forgotForm.style.display = 'none';
      loginForm.style.display = 'block';
    };

    document
      .getElementById('showSignup')
      ?.addEventListener('click', () => {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
      });

    document
      .getElementById('showLogin')
      ?.addEventListener('click', showLogin);

    document
      .getElementById('showLoginFromForgot')
      ?.addEventListener('click', showLogin);

    document
      .getElementById('showForgot')
      ?.addEventListener('click', () => {
        loginForm.style.display = 'none';
        forgotForm.style.display = 'block';
      });

    loginForm?.addEventListener('submit', (e) => {
      e.preventDefault();

      try {
        this.auth.login(
          document.getElementById('loginEmail').value,
          document.getElementById('loginPass').value
        );

        Toast.success('Welcome back!');
        this.loadDashboard();

      } catch (err) {
        Toast.error(err.message);
      }
    });

    signupForm?.addEventListener('submit', (e) => {
      e.preventDefault();

      try {
        this.auth.signup(
          document.getElementById('signupName').value,
          document.getElementById('signupEmail').value,
          document.getElementById('signupPass').value
        );

        Toast.success('Account created successfully!');
        this.loadDashboard();

      } catch (err) {
        Toast.error(err.message);
      }
    });

    forgotForm?.addEventListener('submit', (e) => {
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

    document
      .getElementById('btnLogout')
      ?.addEventListener('click', () => {
        this.auth.logout();
        Toast.info('Logged out successfully.');
        this.showAuthView();
      });
  }

  bindAppEvents() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.onclick = () => {
        document
          .querySelectorAll('.nav-btn')
          .forEach(b => b.classList.remove('active'));

        document
          .querySelectorAll('.tab-content')
          .forEach(t => t.classList.remove('active'));

        btn.classList.add('active');

        document
          .getElementById(btn.dataset.tab)
          .classList.add('active');

        document
          .getElementById('sidebar')
          ?.classList.remove('open');
      };
    });

    document
      .getElementById('sidebarToggle')
      ?.addEventListener('click', () => {
        document
          .getElementById('sidebar')
          ?.classList.toggle('open');
      });

    const clientForm = document.getElementById('clientForm');

    clientForm.onsubmit = (e) => {
      e.preventDefault();

      this.clientController.addClient({
        id: this.editingClientId,
        name: document.getElementById('clientName').value,
        email: document.getElementById('clientEmail').value,
        country: document.getElementById('clientCountry').value,
        currency: document.getElementById('clientCurrency').value,
        gstin: document.getElementById('clientGSTIN').value,
        address: document.getElementById('clientAddress').value
      });

      Toast.success(
        this.editingClientId
          ? 'Client updated!'
          : 'Client added!'
      );

      this.resetClientForm();
      this.renderClientSelect();
      this.renderClientsList();
    };

    document
      .getElementById('btnCancelClientEdit')
      ?.addEventListener('click', () => {
        this.resetClientForm();
      });

    document.getElementById('addItemBtn').onclick = () =>
      this.addLineItem();

    const invoiceForm = document.getElementById('invoiceForm');

    invoiceForm.onsubmit = (e) => {
      e.preventDefault();

      const clientId =
        document.getElementById('invoiceClientSelect').value;

      const client =
        this.clientController.getClientById(clientId);

      if (!client) {
        return Toast.error('Please select a client.');
      }

      const invoiceDateVal =
        document.getElementById('invoiceDate').value;

      const dueDateVal =
        document.getElementById('dueDate').value;

      if (!invoiceDateVal) {
        return Toast.error('Please enter an invoice date.');
      }

      if (!dueDateVal) {
        return Toast.error('Please enter a due date.');
      }

      const items = [];

      document
        .querySelectorAll('.line-item-row')
        .forEach(row => {
          const desc =
            row.querySelector('.item-desc').value;

          const qty =
            parseFloat(
              row.querySelector('.item-qty').value
            ) || 0;

          const rate =
            parseFloat(
              row.querySelector('.item-rate').value
            ) || 0;

          if (desc && qty && rate) {
            items.push({
              description: desc,
              quantity: qty,
              rate: rate
            });
          }
        });

      if (items.length === 0) {
        return Toast.error(
          'Please enter at least one line item.'
        );
      }

      const status =
        document.getElementById('invoiceInitialStatus').value;

      const initialPaid =
        parseFloat(
          document.getElementById('invoiceInitialPaid').value
        ) || 0;

      this.invoiceController.createInvoice(
        client,
        items,
        document.getElementById('invoiceDate').value,
        document.getElementById('dueDate').value,
        document.getElementById('invoiceNotes').value,
        status,
        initialPaid
      );

      Toast.success('Invoice generated and saved!');

      invoiceForm.reset();

      document.getElementById(
        'lineItemsContainer'
      ).innerHTML = '';

      this.addLineItem();
      this.updateInvoicePreview();
      this.renderInvoicesList();
      this.updateDashboard();

      document
        .querySelector('[data-tab="tab-invoices"]')
        .click();
    };

    document.getElementById('invoiceInitialStatus').onchange =
      (e) => {
        document.getElementById(
          'invoiceInitialPaidGroup'
        ).style.display =
          e.target.value === 'Partially Paid'
            ? 'block'
            : 'none';
      };

    document
      .getElementById('invoiceClientSelect')
      ?.addEventListener(
        'change',
        () => this.updateInvoicePreview()
      );

    /*
     * ------------------------------------------------------
     * Freelancer Tax Benefits controls
     * Added by Yashit3075
     * ------------------------------------------------------
     */

    document
      .getElementById('freelancerProfession')
      ?.addEventListener('change', () => {
        this.updateDashboard();
      });

    document
      .getElementById('freelancerCashReceipts')
      ?.addEventListener('input', () => {
        this.updateDashboard();
      });

    /*
     * ------------------------------------------------------
     * Profile form
     * ------------------------------------------------------
     */

    document
      .getElementById('profileForm')
      ?.addEventListener('submit', (e) => {
        e.preventDefault();

        const user = this.auth.getCurrentUser();

        if (!user) return;

        try {
          const updates = {
            name:
              document.getElementById('profileName').value,

            email:
              document.getElementById('profileEmail').value,

            phone:
              document.getElementById('profilePhone').value,

            businessName:
              document.getElementById(
                'profileBusinessName'
              ).value,

            country:
              document.getElementById(
                'profileCountry'
              ).value,

            address:
              document.getElementById(
                'profileAddress'
              ).value
          };

          const currentPass =
            document.getElementById(
              'profileCurrentPass'
            ).value;

          const newPass =
            document.getElementById(
              'profileNewPass'
            ).value;

          if (currentPass || newPass) {
            updates.currentPassword = currentPass;
            updates.newPassword = newPass;
          }

          this.auth.updateProfile(
            user.id,
            updates
          );

          Toast.success(
            'Profile updated successfully!'
          );

          document.getElementById(
            'navUserName'
          ).textContent = updates.name;

          document.getElementById(
            'navUserAvatar'
          ).textContent =
            this.getInitials(updates.name);

          this.loadProfileForm();

        } catch (err) {
          Toast.error(err.message);
        }
      });
  }

  resetClientForm() {
    this.editingClientId = null;

    document.getElementById(
      'clientFormTitle'
    ).textContent = 'Add New Client';

    document.getElementById(
      'btnSaveClient'
    ).textContent = 'Save Client';

    document.getElementById(
      'btnCancelClientEdit'
    ).style.display = 'none';

    document.getElementById(
      'clientForm'
    ).reset();

    document.getElementById(
      'clientCountry'
    ).value = 'India';
  }

  addLineItem() {
    const container =
      document.getElementById(
        'lineItemsContainer'
      );

    const row =
      document.createElement('div');

    row.className =
      'line-item-rowGrid line-item-row';

    row.innerHTML = `
      <input
        type="text"
        class="item-desc"
        placeholder="Service description..."
        required
      >

      <input
        type="number"
        class="item-qty"
        placeholder="Qty"
        min="1"
        value="1"
        required
      >

      <input
        type="number"
        class="item-rate"
        placeholder="Rate"
        min="0"
        step="0.01"
        required
      >

      <button
        type="button"
        class="btn-remove"
        title="Remove"
      >
        &times;
      </button>
    `;

    const updatePreview =
      () => this.updateInvoicePreview();

    row
      .querySelectorAll('input')
      .forEach(inp =>
        inp.addEventListener(
          'input',
          updatePreview
        )
      );

    row
      .querySelector('.btn-remove')
      .onclick = () => {
        if (container.children.length > 1) {
          row.remove();
          this.updateInvoicePreview();
        }
      };

    container.appendChild(row);
  }

  updateInvoicePreview() {
    const clientId =
      document.getElementById(
        'invoiceClientSelect'
      )?.value;

    const client =
      clientId
        ? this.clientController.getClientById(
            clientId
          )
        : null;

    const currency =
      client?.currency || 'INR';

    let subtotal = 0;

    document
      .querySelectorAll('.line-item-row')
      .forEach(row => {
        const qty =
          parseFloat(
            row.querySelector(
              '.item-qty'
            ).value
          ) || 0;

        const rate =
          parseFloat(
            row.querySelector(
              '.item-rate'
            ).value
          ) || 0;

        subtotal += qty * rate;
      });

    const isInternational =
      client
        ? (
            client.currency !== 'INR' ||
            client.country !== 'India'
          )
        : false;

    const gstInfo =
      this.taxEngine.calculateGST(
        subtotal,
        isInternational
      );

    const total =
      subtotal + gstInfo.gstAmount;

    const fmt = (n) =>
      `${currency} ${n.toLocaleString(
        undefined,
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )}`;

    document.getElementById(
      'previewSubtotal'
    ).textContent =
      subtotal > 0
        ? fmt(subtotal)
        : '—';

    document.getElementById(
      'previewGST'
    ).textContent =
      subtotal > 0
        ? `${fmt(gstInfo.gstAmount)} (${gstInfo.rate}%)`
        : '—';

    document.getElementById(
      'previewTotal'
    ).textContent =
      subtotal > 0
        ? fmt(total)
        : '—';
  }

  renderClientSelect() {
    const select =
      document.getElementById(
        'invoiceClientSelect'
      );

    select.innerHTML =
      '<option value="">-- Select Client --</option>';

    this.clientController
      .getAllClients()
      .forEach(c => {
        const opt =
          document.createElement(
            'option'
          );

        opt.value = c.id;

        opt.textContent =
          `${c.name} (${c.currency} · ${c.country})`;

        select.appendChild(opt);
      });
  }

  renderClientsList() {
    const list =
      document.getElementById(
        'clientsList'
      );

    list.innerHTML = '';

    const clients =
      this.clientController.getAllClients();

    if (clients.length === 0) {
      list.innerHTML = `
        <div class="empty-state card">
          <div class="empty-state-icon">👥</div>
          <p>
            No clients registered yet.
            Add your first client above.
          </p>
        </div>
      `;

      return;
    }

    clients.forEach(c => {
      const card =
        document.createElement('div');

      card.className = 'card';

      card.innerHTML = `
        <div class="card-header">
          <h3>${c.name}</h3>

          <div>
            <button
              class="btn-edit"
              data-id="${c.id}"
            >
              Edit
            </button>

            <button
              class="btn-delete"
              data-id="${c.id}"
            >
              Delete
            </button>
          </div>
        </div>

        <div class="client-meta">
          <span>
            <strong>Email:</strong>
            ${c.email}
          </span>

          <span>
            <strong>Location:</strong>
            ${c.country}
          </span>

          <span>
            <strong>Currency:</strong>
            ${c.currency}
          </span>

          <span>
            <strong>GSTIN:</strong>
            ${c.gstin || 'N/A'}
          </span>
        </div>

        <p
          style="
            margin-top: 0.75rem;
            font-size: 0.88rem;
            color: var(--text-muted);
          "
        >
          <strong
            style="color: var(--text-main);"
          >
            Address:
          </strong>
          ${c.address}
        </p>
      `;

      card
        .querySelector('.btn-delete')
        .onclick = () => {
          this.clientController.deleteClient(
            c.id
          );

          Toast.info(
            'Client removed.'
          );

          this.renderClientSelect();
          this.renderClientsList();
        };

      card
        .querySelector('.btn-edit')
        .onclick = () => {
          this.editingClientId =
            c.id;

          document.getElementById(
            'clientName'
          ).value = c.name;

          document.getElementById(
            'clientEmail'
          ).value = c.email;

          document.getElementById(
            'clientCountry'
          ).value = c.country;

          document.getElementById(
            'clientCurrency'
          ).value = c.currency;

          document.getElementById(
            'clientGSTIN'
          ).value =
            c.gstin === 'N/A'
              ? ''
              : c.gstin;

          document.getElementById(
            'clientAddress'
          ).value = c.address;

          document.getElementById(
            'clientFormTitle'
          ).textContent =
            `Edit Client — ${c.name}`;

          document.getElementById(
            'btnSaveClient'
          ).textContent =
            'Update Client';

          document.getElementById(
            'btnCancelClientEdit'
          ).style.display =
            'inline-block';

          document
            .querySelector(
              '[data-tab="tab-clients"]'
            )
            .click();

          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        };

      list.appendChild(card);
    });
  }

  renderInvoicesList() {
    const list =
      document.getElementById(
        'invoicesList'
      );

    list.innerHTML = '';

    const invoices =
      this.invoiceController.getAllInvoices();

    document.getElementById(
      'invoiceCount'
    ).textContent =
      `${invoices.length} invoice${
        invoices.length !== 1
          ? 's'
          : ''
      }`;

    if (invoices.length === 0) {
      list.innerHTML = `
        <div class="empty-state card">
          <div class="empty-state-icon">📄</div>

          <p>
            No invoices generated yet.
            Create your first invoice
            to get started.
          </p>
        </div>
      `;

      return;
    }

    invoices.forEach(inv => {
      const card =
        document.createElement('div');

      card.className = 'card';

      const badgeClass =
        inv.status === 'Fully Paid'
          ? 'badge-paid'
          : inv.status === 'Partially Paid'
            ? 'badge-partial'
            : 'badge-unpaid';

      card.innerHTML = `
        <div class="card-header">

          <h3>
            Invoice #${inv.id} —
            ${inv.client.name}
          </h3>

          <span
            class="badge ${badgeClass}"
          >
            ${inv.status}
          </span>

        </div>

        <div class="client-meta">

          <span>
            <strong>Date:</strong>
            ${inv.invoiceDate || '—'}
          </span>

          <span>
            <strong>Due:</strong>
            ${inv.dueDate || '—'}
          </span>

          <span>
            <strong>Total:</strong>
            ${inv.currency}
            ${inv.totalAmount.toLocaleString()}
          </span>

          <span>
            <strong>INR Value:</strong>
            ₹${inv.totalINR.toLocaleString(
              'en-IN'
            )}
          </span>

        </div>

        <p
          style="
            margin-top: 0.75rem;
            font-size: 0.88rem;
            color: var(--text-muted);
          "
        >
          <strong
            style="color: var(--text-main);"
          >
            Collected:
          </strong>

          ${inv.currency}
          ${inv.amountPaid.toLocaleString()}

          (
            ₹${inv.amountPaidINR.toLocaleString(
              'en-IN'
            )}
          )
        </p>

        <div class="payment-control-box">

          <label>
            <strong>
              Update Payment Status
            </strong>
          </label>

          <div class="payment-controls">

            <select
              class="status-select"
              data-id="${inv.id}"
            >
              <option
                value="Unpaid"
                ${
                  inv.status === 'Unpaid'
                    ? 'selected'
                    : ''
                }
              >
                Unpaid
              </option>

              <option
                value="Partially Paid"
                ${
                  inv.status === 'Partially Paid'
                    ? 'selected'
                    : ''
                }
              >
                Partially Paid
              </option>

              <option
                value="Fully Paid"
                ${
                  inv.status === 'Fully Paid'
                    ? 'selected'
                    : ''
                }
              >
                Fully Paid
              </option>
            </select>

            <input
              type="number"
              class="partial-amount-input"
              data-id="${inv.id}"
              placeholder="Amount Paid"
              value="${inv.amountPaid}"
              style="
                display:
                ${
                  inv.status === 'Partially Paid'
                    ? 'inline-block'
                    : 'none'
                };
              "
            >

            <button
              class="btn-gradient btn-update-payment"
              data-id="${inv.id}"
              style="
                padding: 0.45rem 1rem;
                font-size: 0.85rem;
              "
            >
              Save Status
            </button>

          </div>

        </div>

        <div class="card-actions">

          <button
            class="btn-print"
            data-id="${inv.id}"
          >
            Print Invoice
          </button>

          <button
            class="btn-delete"
            data-id="${inv.id}"
          >
            Delete
          </button>

        </div>
      `;

      const statusSelect =
        card.querySelector(
          '.status-select'
        );

      const partialInput =
        card.querySelector(
          '.partial-amount-input'
        );

      statusSelect.onchange =
        (e) => {
          partialInput.style.display =
            e.target.value ===
            'Partially Paid'
              ? 'inline-block'
              : 'none';
        };

      card
        .querySelector(
          '.btn-update-payment'
        )
        .onclick = () => {

          this.invoiceController
            .updatePaymentStatus(
              inv.id,
              statusSelect.value,
              parseFloat(
                partialInput.value
              ) || 0
            );

          Toast.success(
            'Payment status updated.'
          );

          this.renderInvoicesList();
          this.updateDashboard();
        };

      card
        .querySelector(
          '.btn-delete'
        )
        .onclick = () => {

          this.invoiceController
            .deleteInvoice(inv.id);

          Toast.info(
            'Invoice deleted.'
          );

          this.renderInvoicesList();
          this.updateDashboard();
        };

      card
        .querySelector(
          '.btn-print'
        )
        .onclick = () =>
          this.printInvoice(inv);

      list.appendChild(card);
    });
  }

  updateDashboard() {
    const grossRealizedINR =
      this.invoiceController
        .getRealizedGrossAnnualINR();

    const taxProjection =
      this.taxEngine
        .calculateAnnualIncomeTax(
          grossRealizedINR
        );

    /*
     * ------------------------------------------------------
     * Existing dashboard calculations
     * ------------------------------------------------------
     */

    document.getElementById(
      'dashGrossIncome'
    ).textContent =
      `₹${grossRealizedINR.toLocaleString(
        'en-IN',
        {
          maximumFractionDigits: 0
        }
      )}`;

    document.getElementById(
      'dashTaxLiability'
    ).textContent =
      `₹${taxProjection.totalTaxLiability.toLocaleString(
        'en-IN',
        {
          maximumFractionDigits: 0
        }
      )}`;

    document.getElementById(
      'dashNetIncome'
    ).textContent =
      `₹${(
        grossRealizedINR -
        taxProjection.totalTaxLiability
      ).toLocaleString(
        'en-IN',
        {
          maximumFractionDigits: 0
        }
      )}`;

    const tbody =
      document.getElementById(
        'taxBreakdownBody'
      );

    tbody.innerHTML = '';

    taxProjection.breakdown.forEach(
      row => {
        const tr =
          document.createElement(
            'tr'
          );

        tr.innerHTML = `
          <td>${row.slab}</td>
          <td>${row.rate}%</td>
          <td>
            ₹${row.taxableAmount.toLocaleString(
              'en-IN'
            )}
          </td>
          <td>
            ₹${row.tax.toLocaleString(
              'en-IN'
            )}
          </td>
        `;

        tbody.appendChild(tr);
      }
    );

    document.getElementById(
      'rebateNotice'
    ).style.display =
      taxProjection.rebate87A > 0
        ? 'block'
        : 'none';


    /*
     * ======================================================
     * Freelancer Tax Benefits
     * Added by Yashit3075
     * ======================================================
     *
     * The calculation only uses the invoices already
     * present in the application.
     *
     * No invoice = no freelancer tax benefit calculation.
     */

    const freelancerInvoices =
      this.invoiceController
        .getAllInvoices();


    const professionEligible =
      document.getElementById(
        'freelancerProfession'
      )?.value === 'yes';


    const cashReceiptPercentage =
      Number(
        document.getElementById(
          'freelancerCashReceipts'
        )?.value || 0
      );


    const freelancerTaxResult =
      this.freelancerTaxBenefits.calculate(
        freelancerInvoices,
        {
          isResident: true,

          isSpecifiedProfession:
            professionEligible,

          cashReceiptPercentage:
            cashReceiptPercentage
        }
      );


    this.updateFreelancerTaxUI(
      freelancerTaxResult
    );
  }


  /*
   * ========================================================
   * Update Freelancer Tax Benefits UI
   * Added by Yashit3075
   * ========================================================
   */

  updateFreelancerTaxUI(result) {

    const emptyState =
      document.getElementById(
        'freelancerTaxEmpty'
      );

    const results =
      document.getElementById(
        'freelancerTaxResults'
      );


    /*
     * If the tax-benefit UI isn't present,
     * don't break the rest of the application.
     */

    if (!emptyState || !results) {
      return;
    }


    /*
     * ------------------------------------------------------
     * No invoices
     * ------------------------------------------------------
     */

    if (
      !result.hasInvoices ||
      result.invoiceCount === 0
    ) {

      emptyState.style.display =
        'block';

      results.style.display =
        'none';

      return;
    }


    /*
     * ------------------------------------------------------
     * At least one invoice exists
     * ------------------------------------------------------
     */

    emptyState.style.display =
      'none';

    results.style.display =
      'block';


    /*
     * ------------------------------------------------------
     * Invoice information
     * ------------------------------------------------------
     */

    document.getElementById(
      'freelancerInvoiceCount'
    ).textContent =
      result.invoiceCount;


    document.getElementById(
      'freelancerGrossReceipts'
    ).textContent =
      `₹${result.grossReceipts.toLocaleString(
        'en-IN',
        {
          maximumFractionDigits: 0
        }
      )}`;


    document.getElementById(
      'freelancer44ADALimit'
    ).textContent =
      `₹${result.receiptLimit.toLocaleString(
        'en-IN'
      )}`;


    document.getElementById(
      'freelancerPresumptiveIncome'
    ).textContent =
      `₹${result.presumptiveIncome.toLocaleString(
        'en-IN',
        {
          maximumFractionDigits: 0
        }
      )}`;


    /*
     * ------------------------------------------------------
     * Tax comparison
     * ------------------------------------------------------
     */

    document.getElementById(
      'freelancerTaxWithout'
    ).textContent =
      `₹${result.taxWithout44ADA.toLocaleString(
        'en-IN',
        {
          maximumFractionDigits: 0
        }
      )}`;


    document.getElementById(
      'freelancerTaxWith'
    ).textContent =
      `₹${result.taxWith44ADA.toLocaleString(
        'en-IN',
        {
          maximumFractionDigits: 0
        }
      )}`;


    document.getElementById(
      'freelancerTaxSaving'
    ).textContent =
      `₹${result.estimatedTaxSaving.toLocaleString(
        'en-IN',
        {
          maximumFractionDigits: 0
        }
      )}`;


    /*
     * ------------------------------------------------------
     * 44ADA eligibility badge
     * ------------------------------------------------------
     */

    const status =
      document.getElementById(
        'freelancer44ADAStatus'
      );


    if (result.eligible44ADA) {

      status.textContent =
        'Potentially Eligible';

      status.className =
        'badge badge-paid';

    } else {

      status.textContent =
        'Not Eligible';

      status.className =
        'badge badge-unpaid';
    }


    /*
     * ------------------------------------------------------
     * Explanation
     * ------------------------------------------------------
     */

    document.getElementById(
      'freelancerTaxMessage'
    ).textContent =
      result.message;
  }


  printInvoice(inv) {
    const user =
      this.auth.getCurrentUser();

    const businessName =
      user?.businessName ||
      'TaxPulse Freelancer';

    const printWin =
      window.open(
        '',
        '_blank'
      );

    printWin.document.write(`
      <html>

        <head>

          <title>
            Invoice - ${inv.id}
          </title>

          <style>

            body {
              font-family: 'Segoe UI', sans-serif;
              padding: 40px;
              color: #1e293b;
              max-width: 800px;
              margin: 0 auto;
            }

            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 3px solid #6366f1;
              padding-bottom: 24px;
              margin-bottom: 24px;
            }

            .brand {
              color: #6366f1;
              font-size: 1.5rem;
              font-weight: 700;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 24px;
            }

            th,
            td {
              border: 1px solid #e2e8f0;
              padding: 12px;
              text-align: left;
            }

            th {
              background: #f8fafc;
              font-size: 0.85rem;
              text-transform: uppercase;
              color: #64748b;
            }

            .totals {
              margin-top: 24px;
              text-align: right;
            }

            .totals p {
              margin: 4px 0;
              color: #64748b;
            }

            .totals h3 {
              color: #1e293b;
              margin-top: 12px;
            }

            .paid {
              color: #10b981;
            }

            .meta {
              font-size: 0.9rem;
              color: #64748b;
            }

          </style>

        </head>

        <body>

          <div class="header">

            <div>

              <div class="brand">
                ${businessName}
              </div>

              <p class="meta">
                <strong>
                  Invoice ID:
                </strong>
                ${inv.id}
              </p>

              <p class="meta">
                <strong>
                  Date:
                </strong>
                ${inv.invoiceDate}

                ·

                <strong>
                  Due:
                </strong>
                ${inv.dueDate}
              </p>

              <p class="meta">
                <strong>
                  Status:
                </strong>
                ${inv.status}
              </p>

            </div>

            <div>

              <h3 style="margin-bottom: 8px;">
                Billed To
              </h3>

              <p>
                <strong>
                  ${inv.client.name}
                </strong>
              </p>

              <p class="meta">
                ${inv.client.address}
              </p>

              <p class="meta">
                ${inv.client.country}
              </p>

              <p class="meta">
                GSTIN:
                ${inv.client.gstin || 'N/A'}
              </p>

            </div>

          </div>


          <table>

            <thead>

              <tr>

                <th>
                  Description
                </th>

                <th>
                  Qty
                </th>

                <th>
                  Rate (${inv.currency})
                </th>

                <th>
                  Amount (${inv.currency})
                </th>

              </tr>

            </thead>

            <tbody>

              ${inv.items
                .map(item => `
                  <tr>

                    <td>
                      ${item.description}
                    </td>

                    <td>
                      ${item.quantity}
                    </td>

                    <td>
                      ${item.rate.toLocaleString()}
                    </td>

                    <td>
                      ${(item.quantity * item.rate).toFixed(2)}
                    </td>

                  </tr>
                `)
                .join('')}

            </tbody>

          </table>


          <div class="totals">

            <p>
              Subtotal:
              ${inv.currency}
              ${inv.subtotal.toFixed(2)}
            </p>

            <p>
              GST / Tax (${inv.gstRate}%):
              ${inv.currency}
              ${inv.gstAmount.toFixed(2)}
            </p>

            <h3>
              Total Due:
              ${inv.currency}
              ${inv.totalAmount.toFixed(2)}
            </h3>

            <h2 class="paid">
              Amount Received:
              ${inv.currency}
              ${inv.amountPaid.toFixed(2)}
            </h2>

          </div>


          ${
            inv.notes
              ? `
                <p
                  style="
                    margin-top: 32px;
                    padding-top: 16px;
                    border-top: 1px solid #e2e8f0;
                    color: #64748b;
                    font-size: 0.9rem;
                  "
                >
                  <strong>
                    Notes:
                  </strong>

                  ${inv.notes}
                </p>
              `
              : ''
          }

        </body>

      </html>
    `);

    printWin.document.close();
    printWin.focus();

    setTimeout(
      () => printWin.print(),
      250
    );
  }
}


document.addEventListener(
  'DOMContentLoaded',
  () => {
    const app = new App();
    app.init();
  }
);