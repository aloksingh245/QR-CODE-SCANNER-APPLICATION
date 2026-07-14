# 🎟️ Real-Time Event Entry & QR Verification System

> **A high-concurrency, real-time ticket scanning and verification registry that secures event entry against double-scans using pessimistic database locks and live WebSocket dashboards.**

---

## ⚡ Try It Out (Example QR Codes)

Scan any of the **5 active event tickets** below using the Scanner interface (`/scanner`) to test verification states, database triggers, and live stats updates:

| Ticket T-001 (Valid) | Ticket T-002 (Valid) | Ticket T-003 (Valid) | Ticket T-004 (Valid) | Ticket T-005 (Valid) |
| :---: | :---: | :---: | :---: | :---: |
| ![T-001](example_qrcode_image/T-001.png) | ![T-002](example_qrcode_image/T-002.png) | ![T-003](example_qrcode_image/T-003.png) | ![T-004](example_qrcode_image/T-004.png) | ![T-005](example_qrcode_image/T-005.png) |
| `Scan to Approve` | `Scan to Approve` | `Scan to Approve` | `Scan to Approve` | `Scan to Approve` |

*Note: Scanning a code a second time triggers an immediate **DUPLICATE** rejection, while any unrecognized code returns **INVALID**.*

---

## 🏗️ Design & Architecture

The system is designed with safety, speed, and real-time synchronicity at its core:

1. **Race-Condition Safety**: Multiple physical scanners at event gates could scan the same ticket at the exact same millisecond. To prevent double-entry, the backend implements **Serializable Transaction Isolation** paired with **Pessimistic Row Locking** (`SELECT ... FOR UPDATE` via Sequelize). The ticket is locked at database level during lookup, making double-scans mathematically impossible.
2. **Real-Time Dashboards**: Any scan updates (success or failure) are instantly broadcasted using **Socket.IO** to the admin panel. Ticket tables and visual counters update live without manual page refreshes.
3. **Local HTTPS & Security**: The frontend runs using HTTPS natively in development, which is required by modern mobile browsers to access camera feeds for barcode/QR reading.

---

## 📁 File Structure & Code Definitions

The project is cleanly decoupled into `backend` and `frontend` environments.

```
event/
├── example_qrcode_image/    # Standard QR Code assets for demonstration and testing
├── backend/                 # Express API server, models, and CLI generation utilities
│   ├── config/
│   │   └── db.js            # Configures MySQL connection and matches SQL session timezone dynamically
│   ├── controllers/
│   │   ├── authController.js# Authenticates user credentials and signs JWT tokens (8-hour expiration)
│   │   ├── dashboardController.js # Aggregates registry metadata (total, scanned, remaining counts)
│   │   ├── scanController.js# Validates QR scans under Serializable locks; broadcasts socket updates
│   │   └── ticketController.js # Handles ticket pagination, searches, status resets, and Excel creation
│   ├── middleware/
│   │   ├── auth.js          # Extracts and verifies authorization Bearer JWT tokens
│   │   └── role.js          # Authorizes endpoints according to roles ('ADMIN', 'SCANNER')
│   ├── models/
│   │   ├── ScanLog.js       # Database model tracking scan histories (SUCCESS, DUPLICATE, INVALID)
│   │   ├── Ticket.js        # Database model tracking ticket identifiers and scanning states
│   │   └── User.js          # Database model storing system users and access roles
│   ├── routes/
│   │   ├── auth.js          # Defines routing rules for auth and session creation
│   │   ├── dashboard.js     # Defines routing rules for aggregate telemetry stats
│   │   ├── scan.js          # API route targeting ticket scan verification
│   │   └── tickets.js       # Admin routes for table feeds, resets, and Excel spreadsheet exports
│   ├── scripts/
│   │   ├── generateQR.js    # CLI utility creating random database tickets, PNG files, and PDF grids
│   │   └── seedUsers.js     # CLI utility seeding default admin/scanner credentials
│   ├── server.js            # Main backend entrypoint syncing databases, booting Express and WebSockets
│   ├── package.json         # Node.js backend dependencies (Sequelize, ExcelJS, PDFKit, Socket.IO)
│   └── .env.example         # Template file defining environment parameters
│
└── frontend/                # React Vite frontend client
    ├── src/
    │   ├── components/
    │   │   ├── ProtectedRoute.jsx # Enforces route-level auth checks and redirects unauthorized users
    │   │   ├── StatsCard.jsx   # Styled panels displaying real-time ticket counters
    │   │   └── TicketTable.jsx # Admin grid displaying paginated records with search and reset actions
    │   ├── context/
    │   │   └── AuthContext.jsx # Context provider caching user metadata and Axios headers in memory
    │   ├── pages/
    │   │   ├── Dashboard.jsx   # Admin panel providing live dashboards, sync charts, and registry options
    │   │   ├── Login.jsx       # Interface capturing user sessions
    │   │   └── Scanner.jsx     # Live camera scanning page using html5-qrcode and overlay animations
    │   ├── services/
    │   │   └── api.js          # Axiom instance configuring central API paths and interceptors
    │   ├── App.jsx             # React component declaring routes and view layouts
    │   └── main.jsx            # Application root booting React and binding stylesheets
    ├── vite.config.js       # Configures Vite bundler, local dev proxies, and SSL certificates
    └── package.json         # React client dependencies (React 19, Tailwind CSS v4, html5-qrcode)
```

---

## 🚀 Setup & Execution Guide

### 1. Database Configuration
Create a new MySQL database named `qr_entry`. Update the database connection variables in `backend/.env` (referencing `backend/.env.example`).

### 2. Backend Initialization
```bash
cd backend
npm install

# Seed default admin/scanner users
node scripts/seedUsers.js

# Generate demo ticket keys, PNGs, and a print-ready PDF grid
node scripts/generateQR.js 240

# Start Express server
npm run start
```
*Default Credentials Created:*
- **Admin**: Username `admin`, Password `admin123`
- **Scanner**: Username `scanner`, Password `scanner123`

### 3. Frontend Initialization
```bash
cd ../frontend
npm install

# Start Vite server with local SSL support
npm run dev
```

*Note: Access the frontend via the HTTPS URL provided in your console (e.g. `https://localhost:5173`) to allow camera capture for scanning.*
