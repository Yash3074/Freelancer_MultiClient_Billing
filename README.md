# Freelancer Multi-Client Billing & Tax Invoice App

## 📌 Project Overview
This is a web-based billing and invoicing application built specifically for freelancers to manage multiple clients, calculate taxes dynamically, and generate professional invoices. 

## 🚀 Key Features
* **Client Management:** Easily add, track, and manage multiple client profiles (`ClientController.js`).
* **Dynamic Tax Engine:** Automatically calculates taxes based on configurable country-specific tax slabs (`TaxEngine.js`, `taxSlabs.json`).
* **Invoice Generation:** Creates detailed, formatted invoices for services rendered (`InvoiceController.js`).
* **Secure Authentication:** Built-in user authentication flow (`AuthController.js`).
* **Local Data Persistence:** Saves client and invoice data locally so progress is never lost (`Storage.js`).

## 🛠️ Tech Stack
* **Frontend:** HTML5, CSS3
* **Logic & Architecture:** Vanilla JavaScript (MVC Pattern)
* **Data Configuration:** JSON (`countries.json`, `taxSlabs.json`)

## 💻 How to Run
Since this is a client-side web application, no server installation is required. Simply clone the repository and open the `index.html` file in any modern web browser to launch the app.