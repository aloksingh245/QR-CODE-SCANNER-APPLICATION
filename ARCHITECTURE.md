# 🎟️ Real-Time Event Entry & QR Verification System — Architecture

This document describes the design patterns, system flow diagrams, and architectural modules of the QR Verification System. It is divided into two sections: **High-Level Design (HLD)** (conceptual system structure) and **Low-Level Design (LLD)** (code modules, implementation sequences, and database locking flows).

---

## 🗺️ 1. High-Level Design (HLD)

The High-Level Design focuses on how the separate components of our cloud-hosted stack communicate with each other. The application is split into three tiers: **Presentation (Vercel)**, **Business Logic (Render)**, and **Database (Aiven)**.

### HLD System Diagram

This diagram maps the high-level boundaries and data paths of each hosting environment:

```mermaid
graph LR
    subgraph Clients ["Client Devices"]
        Scanner["Gate Scanner Device<br/>(Camera Capture)"]
        Admin["Admin Dashboard<br/>(Browser Grid)"]
    end

    subgraph Front ["Frontend Client (Vercel)"]
        C["React SPA Application<br/>(UI Views & Context)"]
    end

    subgraph Back ["Backend Services (Render)"]
        D["Express.js HTTP Server<br/>(REST API Routes)"]
        E["Socket.IO WebSocket Server<br/>(Real-Time Broadcasts)"]
    end

    subgraph Storage ["Database Service (Aiven)"]
        F[("MySQL Database Server<br/>(Persistent Tables)")]
    end

    %% High-level data paths
    Scanner -->|HTTPS Video Stream| C
    Admin -->|HTTPS Views| C
    C -->|REST Requests (HTTPS)| D
    C -->|WebSockets (WS/WSS)| E
    E -->|WebSockets (WS/WSS)| C
    D -->|Pessimistic Queries & Locks| F

    %% Apply Inline Styles (Fully compatible with all GitHub Markdown versions)
    style Scanner fill:#f4f9ff,stroke:#2b7de9,stroke-width:2px
    style Admin fill:#f4f9ff,stroke:#2b7de9,stroke-width:2px
    style C fill:#f0fff4,stroke:#38a169,stroke-width:2px
    style D fill:#fffaf0,stroke:#dd6b20,stroke-width:2px
    style E fill:#fffaf0,stroke:#dd6b20,stroke-width:2px
    style F fill:#faf5ff,stroke:#805ad5,stroke-width:2px
```

### High-Level Component Description
1.  **Frontend (Vercel)**: Serves a React Single Page Application (SPA). It captures video frames for scanning and displays live updating metric cards.
2.  **Backend Web Service (Render)**: Runs a Node.js Express server. It exposes endpoints to authenticate users, fetch ticket lists, and verify scan requests. It also operates a Socket.IO hub to broadcast status changes immediately.
3.  **Database Instance (Aiven)**: A fully managed MySQL instance. It stores table records for tickets, scan logs, and user credentials.

---

## ⚙️ 2. Low-Level Design (LLD)

The Low-Level Design defines the code modules, file relationships, security checks, and database concurrency mechanics.

### A. System Module Map
This flowchart shows the file-to-file routing pipelines and model accesses:

```mermaid
graph TD
    subgraph FE_Modules ["Frontend Modules"]
        App["App.jsx (Router)"]
        AuthCtx["AuthContext.jsx (In-Memory Auth)"]
        ScannerPage["Scanner.jsx (html5-qrcode reader)"]
        DashPage["Dashboard.jsx (Socket.IO client hooks)"]
        api["api.js (Axios config & JWT Interceptor)"]
        TicketTable["TicketTable.jsx (Grid control)"]
    end

    subgraph BE_Modules ["Backend Controllers & Middlewares"]
        Server["server.js (Express & Socket.io init)"]
        AuthMW["auth.js (JWT signature checker)"]
        RoleMW["role.js (Role Authorization)"]
        ScanCtrl["scanController.js (Verification & lock logic)"]
        TicketCtrl["ticketController.js (CRUD, Reset, Excel export)"]
    end

    subgraph DB_Models ["Sequelize Database Models"]
        M_User["User.js (bcrypt hashes)"]
        M_Ticket["Ticket.js (scan states)"]
        M_ScanLog["ScanLog.js (scan history)"]
    end

    %% FE Links
    App --> AuthCtx
    ScannerPage --> api
    DashPage --> api
    TicketTable --> api
    api -->|HTTPS Request| Server

    %% BE Routing & Middlewares
    Server -->|Router| AuthMW
    AuthMW --> RoleMW
    RoleMW -->|Route Handlers| ScanCtrl
    RoleMW -->|Route Handlers| TicketCtrl

    %% Controller to Model access
    ScanCtrl --> M_Ticket
    ScanCtrl --> M_ScanLog
    TicketCtrl --> M_Ticket
    
    %% Apply Inline Styles (Fully compatible with all GitHub Markdown versions)
    style App fill:#f0fff4,stroke:#38a169,stroke-width:2px
    style AuthCtx fill:#f0fff4,stroke:#38a169,stroke-width:2px
    style ScannerPage fill:#f0fff4,stroke:#38a169,stroke-width:2px
    style DashPage fill:#f0fff4,stroke:#38a169,stroke-width:2px
    style api fill:#f0fff4,stroke:#38a169,stroke-width:2px
    style TicketTable fill:#f0fff4,stroke:#38a169,stroke-width:2px

    style Server fill:#fffaf0,stroke:#dd6b20,stroke-width:2px
    style AuthMW fill:#fffaf0,stroke:#dd6b20,stroke-width:2px
    style RoleMW fill:#fffaf0,stroke:#dd6b20,stroke-width:2px
    style ScanCtrl fill:#fffaf0,stroke:#dd6b20,stroke-width:2px
    style TicketCtrl fill:#fffaf0,stroke:#dd6b20,stroke-width:2px

    style M_User fill:#faf5ff,stroke:#805ad5,stroke-width:2px
    style M_Ticket fill:#faf5ff,stroke:#805ad5,stroke-width:2px
    style M_ScanLog fill:#faf5ff,stroke:#805ad5,stroke-width:2px
```

---

### B. Core Sequence Diagram (Scan Verification Loop)

To prevent double-scans (when multiple gates scan the exact same ticket ID at the same millisecond), the verification controller implements **Serializable Transactions** combined with a database **Pessimistic Row Lock** (`SELECT ... FOR UPDATE`). 

This sequence diagram details the database locking step and the subsequent WebSocket update loop:

```mermaid
sequenceDiagram
    autonumber
    participant Scanner as Gate Scanner (Mobile Client)
    participant Client as React Scanner.jsx
    participant Server as Express Server
    participant DB as MySQL (Aiven)
    participant Socket as Socket.IO Hub
    participant Admin as Admin Dashboard (Desktop Client)

    Scanner->>Client: Scans QR code
    Client->>Server: POST /api/scan { qr_id: "T-001" } with Bearer JWT
    activate Server
    Note over Server: Middleware validates token & 'SCANNER' role

    Server->>DB: Open Transaction (ISOLATION = SERIALIZABLE)
    Server->>DB: SELECT * FROM Tickets WHERE qr_id = 'T-001' FOR UPDATE
    activate DB
    Note over DB: Locks row from concurrent updates
    DB-->>Server: Return Ticket Object
    deactivate DB

    alt Ticket is already scanned (is_scanned = true)
        Server->>DB: Insert ScanLog (status = 'DUPLICATE')
        Server->>DB: Rollback Transaction
        Server->>Client: 200 OK { success: false, status: "DUPLICATE", message: "Already Scanned" }
    else Ticket is valid & unscanned (is_scanned = false)
        Server->>DB: Update Ticket (is_scanned = true, scanned_at = NOW)
        Server->>DB: Insert ScanLog (status = 'SUCCESS')
        Server->>DB: Commit Transaction
        
        Server->>Socket: Emit stats_update & scan_update events
        activate Socket
        Socket-->>Admin: Broadcast live counts & table updates
        deactivate Socket
        
        Server->>Client: 200 OK { success: true, status: "SUCCESS", message: "Entry Allowed" }
    end
    deactivate Server
```

---

### C. Low-Level Design Code References

1.  **Authentication Guard**: The [auth.js](file:///Users/alokkumarsingh/Desktop/node%20js/event/backend/middleware/auth.js) middleware extracts JWT tokens, verifies the signature against `process.env.JWT_SECRET`, and populates the `req.user` payload.
2.  **Concurrency Locking Engine**: The `scan` controller inside [scanController.js](file:///Users/alokkumarsingh/Desktop/node%20js/event/backend/controllers/scanController.js) invokes the Sequelize transaction:
    ```javascript
    const t = await sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
    });
    ```
    And forces a pessimistic row lock during discovery:
    ```javascript
    const ticket = await Ticket.findOne({
      where: { qr_id },
      lock: t.LOCK.UPDATE,
      transaction: t
    });
    ```
3.  **Real-Time Sync Dispatcher**: In [server.js](file:///Users/alokkumarsingh/Desktop/node%20js/event/backend/server.js), `app.set('io', io)` makes Socket.IO accessible across files. The scan handler triggers broadcasts to update stats counters and administrative tables instantly.
