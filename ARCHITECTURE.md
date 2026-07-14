# 🎟️ Real-Time Event Entry & QR Verification System — Architecture

This document outlines the architecture, data flows, and concurrency handling in this project.

---

## 🏗️ Architecture Flow Diagram

```mermaid
graph TD
    %% Define Classes for Styling
    classDef client fill:#f4f9ff,stroke:#2b7de9,stroke-width:2px;
    classDef frontend fill:#f0fff4,stroke:#38a169,stroke-width:2px;
    classDef backend fill:#fffaf0,stroke:#dd6b20,stroke-width:2px;
    classDef database fill:#faf5ff,stroke:#805ad5,stroke-width:2px;

    %% Subgraphs
    subgraph Users ["Actors & Clients"]
        Scanner["Mobile Gate Scanner (SCANNER role)"]
        Admin["Admin Web Dashboard (ADMIN role)"]
    end
    
    subgraph FE ["React Frontend (Vite + HTTPS)"]
        App["App.jsx"]
        AuthCtx["AuthContext.jsx"]
        ScannerPage["Scanner.jsx (Camera feed via html5-qrcode)"]
        DashPage["Dashboard.jsx (Real-time stats)"]
        APIClient["api.js (Axios Client)"]
        SocketClient["Socket.io-client"]
    end

    subgraph BE ["Express Backend & Socket.IO (Node.js)"]
        Server["server.js"]
        AuthMW["auth.js & role.js (Middlewares)"]
        ScanCtrl["scanController.js"]
        TicketCtrl["ticketController.js"]
        SocketServer["Socket.IO Server"]
    end

    subgraph DB ["Database (MySQL + Sequelize)"]
        MySQL[("MySQL Server")]
        TxLock["Serializable Transaction + Pessimistic Row Lock"]
    end

    %% Client Interactions
    Scanner -->|Camera Scan| ScannerPage
    Admin -->|Desktop View| DashPage

    %% Frontend Internal
    ScannerPage -->|Request Scan| APIClient
    DashPage -->|Fetch Stats / Reset| APIClient
    DashPage -->|Subscribes| SocketClient

    %% Auth Flow
    App --> AuthCtx
    APIClient -->|Attach JWT| AuthMW

    %% Frontend to Backend Connections
    APIClient -->|HTTP REST Requests| Server
    SocketClient <-->|WebSocket Connection| SocketServer

    %% Backend Routing & Execution
    Server --> AuthMW
    AuthMW -->|Auth Pass| ScanCtrl
    AuthMW -->|Auth Pass| TicketCtrl

    %% Concurrency & DB Layer
    ScanCtrl -->|1. Open Transaction| TxLock
    TxLock -->|2. Lock and Check Ticket| MySQL
    ScanCtrl -->|3. Update State & Commit| MySQL
    TicketCtrl -->|Query / Update| MySQL

    %% Socket Broadcasts
    ScanCtrl -->|4. Emit updates| SocketServer
    TicketCtrl -->|Emit updates on Reset| SocketServer
    SocketServer -->|Broadcast Events| SocketClient

    %% Apply Classes
    class Scanner,Admin client;
    class App,AuthCtx,ScannerPage,DashPage,APIClient,SocketClient frontend;
    class Server,AuthMW,ScanCtrl,TicketCtrl,SocketServer backend;
    class MySQL,TxLock database;
```

---

## 🛠️ Key Design Patterns & Code Entrypoints

### 🔑 Authentication & Authorization
- **State Registry**: [AuthContext.jsx](file:///Users/alokkumarsingh/Desktop/node%20js/event/frontend/src/context/AuthContext.jsx) coordinates login credentials in-memory (preventing LocalStorage XSS exploits).
- **HTTP Interceptors**: [api.js](file:///Users/alokkumarsingh/Desktop/node%20js/event/frontend/src/services/api.js) automatically signs outbound requests with the Bearer JWT token.
- **Route Access Filters**: Express middlewares [auth.js](file:///Users/alokkumarsingh/Desktop/node%20js/event/backend/middleware/auth.js) and [role.js](file:///Users/alokkumarsingh/Desktop/node%20js/event/backend/middleware/role.js) check permissions for administrative operations (resets, Excel reporting).

### ⚡ Race-Condition Prevention (Pessimistic Locking)
To safeguard ticket verification against double-scans occurring in parallel, the scan pipeline uses strict isolation:
1. Opens a Sequelize transaction at the `SERIALIZABLE` isolation level.
2. Performs a lookup query with `lock: t.LOCK.UPDATE` (translates to MySQL's `SELECT ... FOR UPDATE` row lock).
3. Holds the lock on the target ticket until status checks and logs are committed/rolled back, forcing concurrent scans to queue.

*Implementation Reference:* [scanController.js](file:///Users/alokkumarsingh/Desktop/node%20js/event/backend/controllers/scanController.js).

### 📡 WebSocket Sync
- **Server Entrypoint**: [server.js](file:///Users/alokkumarsingh/Desktop/node%20js/event/backend/server.js) initializes the `Socket.IO` server, attaching it to the main HTTP engine.
- **Broadcast Signals**:
  - `stats_update`: Emailed upon successful ticket verification or resets to sync all connected dashboards.
  - `scan_update`: Broadcasts individual scan event status codes (`SUCCESS`, `DUPLICATE`, `INVALID`) and timestamps.
- **Dashboard Hooks**: [Dashboard.jsx](file:///Users/alokkumarsingh/Desktop/node%20js/event/frontend/src/pages/Dashboard.jsx) hooks into this socket and triggers component-level updates on event updates.

---

## 📁 Data Models

- **User**: [User.js](file:///Users/alokkumarsingh/Desktop/node%20js/event/backend/models/User.js) (username, hashed password, role: `ADMIN` or `SCANNER`).
- **Ticket**: [Ticket.js](file:///Users/alokkumarsingh/Desktop/node%20js/event/backend/models/Ticket.js) (unique string `qr_id`, boolean status `is_scanned`, scanned timestamp).
- **ScanLog**: [ScanLog.js](file:///Users/alokkumarsingh/Desktop/node%20js/event/backend/models/ScanLog.js) (historical entries, documenting verification state: `SUCCESS`, `DUPLICATE`, `INVALID`).
