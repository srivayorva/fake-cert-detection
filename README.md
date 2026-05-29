# 🔐 Fake Certificate Detection System

> Cloud-Based Certificate Verification | KMEC | CSE (AI & ML) | Team No. 15

---

## 📁 Project Structure

```
fake-cert-detection/
├── backend/                   # Node.js + Express API
│   ├── server.js              # Entry point
│   ├── db.js                  # MySQL connection pool
│   ├── database.sql           # Schema + seed data
│   ├── .env.example           # Environment config template
│   ├── middleware/
│   │   └── auth.js            # JWT middleware
│   └── routes/
│       ├── auth.js            # Login / register institution
│       ├── certificates.js    # Upload / manage certs (protected)
│       └── verify.js          # Public verification + stats
│
└── frontend/
    └── public/
        ├── index.html         # Public verification portal
        ├── login.html         # Institution login
        ├── dashboard.html     # Institution dashboard
        ├── css/style.css      # All styles
        └── js/
            ├── api.js         # API helper
            ├── app.js         # Public page logic
            └── dashboard.js   # Dashboard logic
```

---

## ⚙️ Prerequisites

- **Node.js** v18+ — https://nodejs.org
- **MySQL** 8.0+ — https://dev.mysql.com/downloads/

---

## 🚀 Setup Instructions

### Step 1 — Database

Open MySQL shell and run:

```sql
source /path/to/backend/database.sql
```

This creates the `fake_cert_db` database, all tables, and inserts sample data.

### Step 2 — Backend

```bash
cd backend
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your MySQL password and other settings
nano .env

# Start the server
npm start
# or for development with auto-reload:
npm run dev
```

Server starts at: **http://localhost:5000**

### Step 3 — Frontend

Open `frontend/public/index.html` directly in a browser,
**or** serve it with a simple static server:

```bash
# Using Node (from project root)
npx serve frontend/public -p 3000
# or
npx live-server frontend/public --port=3000
```

Open: **http://localhost:3000**

---

## 🔑 API Reference

### Public Endpoints (no auth needed)

| Method | Endpoint                    | Description                        |
|--------|-----------------------------|------------------------------------|
| GET    | `/api/verify/:certId`       | Verify a certificate by ID         |
| POST   | `/api/verify`               | Search by name / roll / cert ID    |
| GET    | `/api/verify/stats/summary` | Global statistics                  |
| GET    | `/api/health`               | Server health check                |

### Institution Endpoints (JWT required)

| Method | Endpoint                            | Description              |
|--------|-------------------------------------|--------------------------|
| POST   | `/api/auth/login`                   | Institution login        |
| POST   | `/api/auth/register`                | Register institution     |
| POST   | `/api/certificates`                 | Upload new certificate   |
| GET    | `/api/certificates`                 | List your certificates   |
| GET    | `/api/certificates/:id/qr`          | Get QR code              |
| PATCH  | `/api/certificates/:id/revoke`      | Revoke a certificate     |
| DELETE | `/api/certificates/:id`             | Delete a certificate     |

---

## 🧪 Demo Credentials

| Field    | Value              |
|----------|--------------------|
| Email    | admin@kmec.ac.in   |
| Password | Admin@123          |

### Sample Certificate IDs to Test

| ID               | Expected Result |
|------------------|-----------------|
| KMEC-2024-001    | ✔ VALID         |
| KMEC-2024-002    | ✔ VALID         |
| KMEC-2024-003    | ✔ VALID         |
| IITB-2023-101    | ✔ VALID         |
| FAKE-0000-000    | ✘ FAKE          |

---

## 🛠 Tech Stack

| Layer     | Technology                           |
|-----------|--------------------------------------|
| Frontend  | HTML5, CSS3, Vanilla JavaScript      |
| Backend   | Node.js, Express.js                  |
| Database  | MySQL 8.0                            |
| Security  | JWT (jsonwebtoken), bcryptjs, Helmet |
| QR Code   | qrcode npm library                   |
| Cloud     | Deployable on AWS / Firebase / GCP   |

---

## 👨‍💻 Team

| Name           | Roll Number    |
|----------------|----------------|
| N S V S Surya  | 245523753052   |
| P. Srivathsav  | 245523753038   |
| K. Gnaneshwar  | 245523753024   |

**Guide:** Mrs. V. Aparna Varalakshmi, Asst. Professor, CSE (AI & ML)

**KMEC | A.Y. 2025–2026**
