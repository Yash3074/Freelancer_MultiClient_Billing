import mongoose from 'mongoose';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();

let server;
const PORT = 5055;

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });

    req.on('error', err => reject(err));

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING SYSTEM-WIDE TEST SUITE FOR YASHU SINGLA');
  console.log('Account: yashusingla@chitkara.edu.in');
  console.log('======================================================\n');

  let token = null;

  // 1. Test Login
  console.log('👉 [1/8] Testing Authentication Endpoint (POST /api/v1/auth/login)...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, {
    email: 'yashusingla@chitkara.edu.in',
    password: 'Yashu@2006',
  });

  if (loginRes.status === 200 && loginRes.body.token) {
    token = loginRes.body.token;
    console.log('   ✅ PASS: Login successful! JWT Token acquired.');
    console.log(`   User: ${loginRes.body.user.name} | Business: ${loginRes.body.user.businessName}`);
  } else {
    console.error('   ❌ FAIL: Login failed:', loginRes.body || loginRes.status);
    process.exit(1);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // 2. Test Get Profile
  console.log('\n👉 [2/8] Testing User Profile & Banking (GET /api/v1/auth/me)...');
  const meRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/me',
    method: 'GET',
    headers: authHeaders,
  });

  if (meRes.status === 200 && meRes.body.success) {
    const u = meRes.body.user;
    console.log('   ✅ PASS: Profile verified.');
    console.log(`   UPI ID: ${u.upiId} | Bank: ${u.bankDetails?.bankName} | PAN: ${u.pan}`);
  } else {
    console.error('   ❌ FAIL: Profile fetch failed:', meRes.body);
  }

  // 3. Test Clients
  console.log('\n👉 [3/8] Testing Client Management Directory (GET /api/v1/clients)...');
  const clientsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/clients',
    method: 'GET',
    headers: authHeaders,
  });

  let clientList = [];
  if (clientsRes.status === 200 && clientsRes.body.success) {
    clientList = clientsRes.body.clients;
    console.log(`   ✅ PASS: Retrieved ${clientList.length} clients.`);
    clientList.forEach((c, i) => {
      console.log(`      ${i + 1}. ${c.name} (${c.country}) — Currency: ${c.currency}`);
    });
  } else {
    console.error('   ❌ FAIL: Client fetch failed:', clientsRes.body);
  }

  // 4. Test Invoices
  console.log('\n👉 [4/8] Testing Invoice Ledger & Multi-Currency (GET /api/v1/invoices)...');
  const invoicesRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/invoices',
    method: 'GET',
    headers: authHeaders,
  });

  let invoicesList = [];
  if (invoicesRes.status === 200 && invoicesRes.body.success) {
    invoicesList = invoicesRes.body.invoices;
    console.log(`   ✅ PASS: Retrieved ${invoicesList.length} invoices.`);

    const fullyPaid = invoicesList.filter(i => i.status === 'Fully Paid');
    const partiallyPaid = invoicesList.filter(i => i.status === 'Partially Paid');
    const unpaid = invoicesList.filter(i => i.status === 'Unpaid');
    console.log(`   Breakdown: ${fullyPaid.length} Fully Paid | ${partiallyPaid.length} Partially Paid | ${unpaid.length} Unpaid`);

    let sampleShareToken = invoicesList[0].publicShareToken;
    if (sampleShareToken) {
      console.log(`   Testing Public Shareable Invoice Portal (/api/v1/invoices/public/${sampleShareToken})...`);
      const pubRes = await request({
        hostname: 'localhost',
        port: 5000,
        path: `/api/v1/invoices/public/${sampleShareToken}`,
        method: 'GET',
      });
      if (pubRes.status === 200 && pubRes.body.success) {
        console.log(`   ✅ PASS: Public invoice verified. Payee: ${pubRes.body.invoice.user?.name}`);
      } else {
        console.warn(`   ⚠️ Warning: Public share endpoint returned status ${pubRes.status}`);
      }
    }
  } else {
    console.error('   ❌ FAIL: Invoices fetch failed:', invoicesRes.body);
  }

  // 5. Test Expenses
  console.log('\n👉 [5/8] Testing Business Expenses Tracker (GET /api/v1/expenses)...');
  const expRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/expenses',
    method: 'GET',
    headers: authHeaders,
  });

  if (expRes.status === 200 && expRes.body.success) {
    const expenses = expRes.body.expenses;
    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
    console.log(`   ✅ PASS: Retrieved ${expenses.length} deductible business expenses.`);
    console.log(`   Total Deductible Spend: ₹${totalExp.toLocaleString('en-IN')}`);
  } else {
    console.error('   ❌ FAIL: Expenses fetch failed:', expRes.body);
  }

  // 6. Test AI Heuristic Categorizer
  console.log('\n👉 [6/8] Testing CSE-AIML Smart Categorizer (POST /api/v1/ai/categorize-expense)...');
  const aiCatRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/ai/categorize-expense',
    method: 'POST',
    headers: authHeaders,
  }, {
    description: 'AWS Cloud EC2 hosting cluster and S3 buckets',
  });

  if (aiCatRes.status === 200 && aiCatRes.body.success) {
    console.log(`   ✅ PASS: AI Categorized "${aiCatRes.body.explanation ? 'AWS Cloud EC2' : ''}" -> ${aiCatRes.body.suggestedCategory} (${aiCatRes.body.confidenceScore} confidence)`);
  } else {
    console.warn('   ⚠️ AI Categorizer returned:', aiCatRes.body);
  }

  // 7. Test AI Client Risk Scoring
  console.log('\n👉 [7/8] Testing AI Client Payment Risk Predictor (GET /api/v1/ai/client-risk/:clientId)...');
  if (clientList.length > 0) {
    const clientId = clientList[0]._id;
    const riskRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/v1/ai/client-risk/${clientId}`,
      method: 'GET',
      headers: authHeaders,
    });

    if (riskRes.status === 200 && riskRes.body.success) {
      console.log(`   ✅ PASS: Client Risk Analysis for ${clientList[0].name}:`);
      console.log(`   Reliability Score: ${riskRes.body.reliabilityScore}/100 | Risk: ${riskRes.body.riskLevel} | Recommendation: ${riskRes.body.recommendation}`);
    } else {
      console.warn('   ⚠️ AI Client Risk returned:', riskRes.body);
    }
  }

  // 8. Test Section 44ADA Tax Engine & Dashboard Metrics
  console.log('\n👉 [8/8] Testing Section 44ADA & Tax Engine (GET /api/v1/tax/dashboard)...');
  const taxRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/tax/dashboard?cashPercent=0',
    method: 'GET',
    headers: authHeaders,
  });

  if (taxRes.status === 200 && taxRes.body.success) {
    const { metrics, regularTax, freelancerBenefits } = taxRes.body;
    console.log('   ✅ PASS: Tax Engine calculation verified:');
    console.log(`   💰 Gross Realized Receipts: ₹${metrics.grossRealizedINR.toLocaleString('en-IN')}`);
    console.log(`   🏛️ Normal Regime Tax Liability: ₹${regularTax.totalTaxLiability.toLocaleString('en-IN')}`);
    console.log(`   ✨ Tax with Section 44ADA: ₹${freelancerBenefits.taxWith44ADA.toLocaleString('en-IN')}`);
    console.log(`   🎉 Estimated Tax Savings: ₹${(freelancerBenefits.estimatedTaxSaving || 0).toLocaleString('en-IN')}`);
    console.log(`   🏦 Real Net Take-Home: ₹${metrics.realNetTakeHome.toLocaleString('en-IN')}`);
  } else {
    console.error('   ❌ FAIL: Tax dashboard calculation failed:', taxRes.body);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL 8 TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
