# ⚡ TaxPulse Pro — Freelancer Multi-Client Billing & Tax Portal

> **Subject:** Back End Engineering (`24CAI0303`) — Chitkara University  
> **Course Batch:** 5th Semester | B.E. Computer Science & Engineering (AI & ML)  
> **Assessment Focus:** Continuous Assessment 2 (Lectures 25–48) + Pilot Cloud Deployment  

[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-lightgrey.svg)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas_Cloud-brightgreen.svg)](https://www.mongodb.com/atlas)
[![Socket.IO](https://img.shields.io/badge/Real--Time-Socket.IO-black.svg)](https://socket.io/)
[![Postman](https://img.shields.io/badge/API_Testing-Postman_Collection-orange.svg)](https://www.postman.com/)

---

## 📌 1. Project Overview

**TaxPulse Pro** is an end-to-end Freelancer Financial Operating System designed specifically for independent software consultants, engineers, and digital agencies managing international and domestic clients.

It bridges real-world client invoicing with the Indian Income Tax framework (Section 44ADA Presumptive Taxation & New Tax Regime) and incorporates intelligent NLP automation to simplify tax deductions.

---

## 🚀 2. Key Features

### 🏢 Multi-Client & Global Invoicing
- **Multi-Currency Billing:** Auto-converts USD, EUR, GBP, AED, CAD, and SGD into INR using dynamic exchange rates.
- **Automated GST & Export Logic:** Distinguishes domestic Indian billing (18% GST) from 0% Zero-Rated export of services.
- **Dynamic UPI Payment QR Codes:** Invoices generate an on-the-fly UPI QR code enabling domestic clients to scan and pay via GPay / PhonePe / Paytm directly from their screen.
- **Client Portal & Shareable Links:** Public shareable invoice links allowing clients to view and verify invoices online without account credentials.
- **High-Resolution Studio PDF Invoicing:** Professional print-ready invoices complete with business letterheads, company logos, bank wire details (IFSC, SWIFT), and itemized tables.

### 🏛️ Tax Optimization & Section 44ADA Engine
- **Progressive Slab Engine:** Live calculation according to FY 2026–27 New Tax Regime brackets.
- **Section 87A Full Tax Rebate:** Auto-detects eligibility when taxable income is $\le$ ₹12 Lakhs.
- **Section 44ADA Presumptive Taxation Simulator:** Computes tax liability declaring 50% of gross professional receipts as taxable income vs the normal regime, highlighting estimated tax savings in real-time.
- **One-Click Financial Export:** Instant CSV export of all invoices and expenses for Chartered Accountants (CA) and tax audits.

### 🧾 Business Expense Tracker with Multer File Attachments
- **Multer File Storage:** Attach physical bills, receipts, and invoices (JPEG, PNG, PDF) directly to expenses.
- **In-App Receipt Viewer Modal:** Interactive document viewer for instant audit verification.
- **Deductible Categorization:** Breakdown by Software, Hardware Equipment, Rent, Travel, Marketing, and Professional Fees.

### 🤖 CSE-AIML Smart Features
- **Smart AI Expense Categorizer:** NLP heuristic model classifying expense descriptions (e.g. *"AWS EC2 hosting"* $\rightarrow$ *Software & Subscriptions*, *"Uber to client meeting"* $\rightarrow$ *Travel*) with confidence scoring.
- **Client Payment Reliability & Risk Predictor:** Evaluates client payment terms, overdue rates, and settlement history to compute a reliability score (0–100) and risk recommendation.

### 📡 Real-time WebSockets with Socket.IO
- Instant live updates across browser tabs and devices when invoices are created, settled, or deleted.

---

## 🛠️ 3. Tech Stack & Architecture

- **Backend:** Node.js, Express.js (ES Modules, RESTful Architecture, MVC Pattern)
- **Database:** MongoDB Atlas (Cloud Database Cluster with Mongoose ODM)
- **Authentication:** JSON Web Tokens (JWT) & Salted Password Hashing (`bcryptjs`)
- **File Handling:** Multer Storage Engine
- **Real-Time:** WebSockets via Socket.IO
- **Frontend:** Modern Semantic HTML5, CSS3 (Glassmorphism & SaaS Design), Vanilla ES6+ JavaScript, Chart.js
- **API Testing:** Postman Test Suite (`TaxPulse_Pro_Postman_Collection.json`)

---

## 💻 4. How to Run on Any Laptop (Team Guide)

### Prerequisites
- [Node.js](https://nodejs.org/) (Version 18 or higher)
- Internet connection (to connect to MongoDB Atlas)

### Step 1: Clone or Extract the Project
Open terminal / command prompt inside the project folder:
```bash
cd Freelancer_MultiClient_Billing-main
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment (`.env`)
Create a `.env` file in the root folder (or copy `.env.example`):
```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string_here
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5000
```
*(The MongoDB Atlas cluster has IP `0.0.0.0/0` whitelisted, so it connects immediately on all 3 members' laptops).*

### Step 4: Launch the Server
```bash
npm start
```
*Or for development auto-reload:*
```bash
npm run dev
```

### Step 5: Open in Browser
Open your browser and navigate to:
```
http://localhost:5000
```
---

## 🧪 5. API Endpoints Reference

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new freelancer account | Public |
| `POST` | `/api/v1/auth/login` | Authenticate user & retrieve JWT | Public |
| `GET` | `/api/v1/auth/me` | Fetch authenticated profile | Private |
| `PUT` | `/api/v1/auth/profile` | Update profile, bank details & UPI ID | Private |
| `POST` | `/api/v1/auth/logo` | Upload business logo (Multer) | Private |
| `GET` | `/api/v1/clients` | Retrieve all clients for user | Private |
| `POST` | `/api/v1/clients` | Create client record | Private |
| `PUT` | `/api/v1/clients/:id` | Update client | Private |
| `DELETE`| `/api/v1/clients/:id` | Remove client | Private |
| `GET` | `/api/v1/invoices` | List invoices (with filters) | Private |
| `POST` | `/api/v1/invoices` | Generate invoice with tax calculations | Private |
| `PATCH`| `/api/v1/invoices/:id/payment`| Update invoice payment status | Private |
| `GET` | `/api/v1/invoices/public/:token` | Public view of invoice for clients | Public |
| `GET` | `/api/v1/expenses` | Retrieve logged expenses | Private |
| `POST` | `/api/v1/expenses` | Log expense with receipt upload (Multer) | Private |
| `DELETE`| `/api/v1/expenses/:id` | Delete expense and receipt file | Private |
| `GET` | `/api/v1/tax/dashboard` | Dashboard financials & 44ADA simulation | Private |
| `POST` | `/api/v1/ai/categorize-expense`| Smart AI NLP expense categorizer | Private |
| `GET` | `/api/v1/ai/client-risk/:clientId`| AI client payment health predictor | Private |

---

