# AI PROJECT CONTEXT — AAI ASSET MANAGEMENT SYSTEM

============================================================
SECTION 0 — AI HANDOFF INSTRUCTIONS
============================================================

### Document Overview & Purpose
This document is a comprehensive, self-contained AI Project Knowledge & Context Base for the **Airports Authority of India (AAI) Asset Management System (AAI-AMS)**. It represents the exact, verified state of the project derived directly from static analysis of the source code, database models, repositories, controllers, routes, services, utilities, middleware, frontend components, and automated test suites.

**Primary Goal:** Enable any artificial intelligence model (specifically Google Gemini) to receive this document in a single prompt and instantly acquire complete project mastery—including architecture, domain business logic, data models, API contracts, frontend behavior, security governance, and development constraints—without requiring repetitive user explanations or prompt-engineering overhead.

### Fundamental Operating Principles for Future AI Sessions
1. **Persistent Project Context:** Use this document as the persistent source of truth for future conversations about the AAI Asset Management System.
2. **Current Implementation is Ground Truth:** Treat the actual implementation documented here as the authoritative baseline. When proposing modifications, do not assume features or architectures that contradict this document unless explicitly directed by the user.
3. **Preserve Established Architecture:** Maintain the clean separation of concerns:
   - **Frontend:** React 19 SPA, React Router v7, Vanilla CSS Dual-Theme Design System, Global Fetch Interceptor.
   - **Backend:** Express 4.x, ES Modules, Layered Architecture (Routes $\rightarrow$ Middleware $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Repositories $\rightarrow$ Mongoose Models $\rightarrow$ MongoDB).
4. **Protected Modules:** Strictly protect sensitive modules (Authentication, JWT handling, Role-Based Access Control, Custody/Assignment transactions, Audit Log immutability, Legal PDF templates, QR barcode generation, and Global CSS Design Tokens). Never alter these modules without explicit user permission.
5. **Inspect Before Modifying:** Always inspect the actual source files before suggesting code diffs.
6. **Communication Style:** The user prefers direct, practical, step-by-step explanations, clean code blocks, and absolute honesty regarding test execution and QA verification.

---

============================================================
SECTION 1 — PROJECT IDENTITY
============================================================

### 1. One-Paragraph Summary
The **Airports Authority of India (AAI) Asset Management System** is an enterprise-grade internal IT asset lifecycle, custody governance, and maintenance management platform engineered for AAI Regional Offices and Airport operational directorates. It replaces legacy paper registers, disparate spreadsheets, and disconnected manual records with a unified digital ledger that tracks IT equipment (desktops, laptops, workstations, servers, displays, network hardware, power systems, and peripherals) from procurement and commissioning to employee assignment, inter-departmental transfer, hardware fault servicing, annual physical verification, and official decommissioning.

### 2. Short Technical Summary
A full-stack, decoupled web application featuring a modern React 19 Single Page Application (built with Vite, Lucide icons, SheetJS/XLSX, and a custom CSS variable-driven dual-theme design system) and a Node.js Express 4.x REST API backend (ES Modules, Zod schema validation, Mongoose ODM on MongoDB Atlas with in-memory test fallback, PDFKit streaming document generation, QRCode matrix engine, and password-protected spreadsheet decryption via `officecrypto-tool` and `xlsx-populate`). The system enforces strict JWT-based authentication, fine-grained Role-Based Access Control (`ADMIN` vs. `EMPLOYEE`), atomic custody state transitions, and an immutable audit log trail.

### 3. Detailed Institutional Context
* **Organization:** Airports Authority of India (AAI), a Statutory Body under the Ministry of Civil Aviation, Government of India, responsible for creating, upgrading, maintaining, and managing civil aviation infrastructure across India.
* **Domain:** Airport IT & Communications Division (CNS - Communication, Navigation & Surveillance, Information Technology, Air Traffic Management, Airport Operations, and Regional Administration).
* **System Type:** Enterprise Intranet IT Asset Management & Service Desk System (ITAM / CMDB / ITSM).
* **Target Users:**
  1. **Regional IT Administrators (Role: `ADMIN`):** Full administrative authority over asset registration, inventory updates, custody allocation, inter-employee transfers, vendor AMC contracts, bulk spreadsheet ingestion, custom field configuration, physical verification audits, and system security logs.
  2. **Operational Officers & Staff (Role: `EMPLOYEE`):** Self-service visibility into their active custody equipment, downloaded handover slips, personal complaint/repair ticketing desk, and verification lookups.
* **Business Problem:**
  - Regional airport infrastructure historically relied on manual handwritten registers and ad-hoc department spreadsheets.
  - Critical challenges included untracked transfers between staff, lost custody paper slips, missed Annual Maintenance Contract (AMC) renewals, delayed hardware repair triage, and grueling multi-week annual physical verification audits.
* **Major Capabilities:**
  - Institutional Asset ID auto-generation (`AAI-REG-[CATEGORY]-[YEAR]-[SEQUENCE]`).
  - 13 core mandatory enterprise attributes with type-specific hardware subdocument extension (`computerConfig`, `networkConfig`, `powerConfig`, `displayConfig`, `peripheralConfig`, `softwareConfig`).
  - Three-tier normalized Master Catalog (Makes, Models, Technologies, Categories, Departments, Locations).
  - Two-phase Excel ingestion engine supporting multi-sheet parsing, password decryption, fuzzy column matching, staging reconciliation, and conflict resolution.
  - Legally compliant PDFKit document generation (signed Handover Slips, Transfer Slips, Retirement Slips, Clearance Certificates, AMC schedules).
  - 300 DPI thermal asset sticker generation with embedded verification QR matrix.
  - Full-featured IT service desk ticket lifecycle (`OPEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `CLOSED`).
* **Current Development Status:** Operational / Production-Ready. Phases 1 through 5 (Master Data Catalog, Asset Schemas, Repository Query Layer, Excel Ingestion Alignment, and Frontend Filter Alignment) are fully implemented and backed by a comprehensive automated test suite.

---

============================================================
SECTION 2 — BUSINESS PURPOSE & WORKFLOWS
============================================================

The system is designed to govern the complete operational lifecycle of IT equipment across airport premises.

### Core Business Pillars
1. **Asset Tracking & Identification:** Single digital source of truth for all IT hardware assets with unique asset IDs, chassis serial numbers, and 300 DPI scannable QR tags.
2. **Custody & Accountability Ledger:** Complete chain of custody tracking showing who currently possesses each machine, historical transitions, and signed handover slips.
3. **Master Data Governance:** Standardized classifications of Makes (OEM brands), Models, Technologies, Categories, and Departments to prevent data fragmentation.
4. **Enterprise Spreadsheet Reconciliation:** Ingests non-standard, multi-sheet, and password-encrypted legacy Excel workbooks without data corruption or blank overwrites.
5. **Warranty & AMC Management:** Real-time computation of warranty validity (`ACTIVE`, `EXPIRING_SOON`, `EXPIRED`) and vendor AMC service level agreements.
6. **IT Service Desk Ticketing:** Direct incident reporting for equipment malfunctions with priority/severity triage and technician resolution logging.
7. **Physical Verification Campaigns:** Annual statutory audit workflow where auditors physically verify assets in rooms/floors, record conditions, and lock finalized audit records.

### Real-World Business Workflows

#### A. Equipment Procurement, Commissioning & Registration
1. IT Department receives shipment under a Government e-Marketplace (GeM) supply order.
2. IT Officer accesses **Asset Inventory** $\rightarrow$ clicks **Register IT Equipment**.
3. Officer inputs equipment details (Category, Make, Model, Technology, Serial Number, Installation Date, Warranty Dates, Department, Floor).
4. If Asset ID is left blank, the system automatically allocates the next sequential institutional identifier (e.g., `AAI-REG-PC-2025-0001`).
5. Asset is created with status `AVAILABLE` (stored in the central IT Store / Godown pool).

#### B. Custody Allocation (Staff Handover)
1. Staff member requests equipment or joins a department.
2. IT Officer navigates to **Asset Transfers** $\rightarrow$ clicks **Assign Asset**.
3. Selects the available asset and target employee from the directory.
4. The system executes an atomic transaction:
   - Updates `Asset` status to `ASSIGNED` and snapshots employee details (`currentEmployeeId`, `currentEmployeeName`, `currentDesignation`).
   - Increments the employee's `assignedAssetsCount`.
   - Creates an `ACTIVE` record in `AssetAssignment` logging timestamp, condition, and issuing officer.
   - Logs an administrative event in `AuditLog`.
5. Officer downloads the generated **Equipment Handover Slip (PDF)** containing dual signature blanks for custodian and IT In-Charge acknowledgment.

#### C. Inter-Staff Equipment Transfer
1. Equipment moves from Officer A to Officer B within or across departments.
2. IT Officer opens **Asset Transfers** $\rightarrow$ clicks **Transfer Asset**.
3. System archives the previous assignment record as `TRANSFERRED`, generates a new active assignment record for Officer B, updates the asset's custodian snapshot, and prints an updated transfer slip.

#### D. Equipment Return to Godown / IT Pool
1. Employee departs, transfers out, or equipment is surrendered.
2. IT Officer clicks **Return Asset**, assesses physical return condition (`EXCELLENT`, `GOOD`, `FAIR`, `POOR`, `UNUSABLE`), and inputs return remarks.
3. Asset status reverts to `AVAILABLE` (or `UNDER_MAINTENANCE` if damaged), custodian fields are cleared, and assignment is marked `RETURNED`.

#### E. IT Helpdesk / Service Desk Ticket Flow
1. Staff member logs in to the **Complaint Desk** $\rightarrow$ clicks **Raise Ticket**.
2. Selects their assigned device, chooses issue category (e.g., `HARDWARE_FAULT`, `POWER_UPS`, `NETWORK_CONNECTIVITY`), specifies severity, and describes the fault.
3. Ticket reference `TKT-[HEX]` is created with status `OPEN`.
4. IT Officer triages the ticket, assigns a technician, transitions status to `IN_PROGRESS` (if sent for bench repair, asset status updates to `UNDER_MAINTENANCE`).
5. Technician logs resolution notes, parts replaced, and closes ticket (`RESOLVED` $\rightarrow$ `CLOSED`).

#### F. Physical Verification Campaign (Annual Audit)
1. IT Administrator initiates a campaign (e.g., `FY 2026-27 Regional Office Annual Verification`).
2. Field audit officers traverse airport blocks with mobile tablets/scanners.
3. Scanning an asset QR code opens the asset lookup directly; auditor marks observation (`VERIFIED`, `NOT_FOUND`, `DAMAGED`, `MOVED`, `UNAUTHORIZED_LOCATION`).
4. Once all units are inspected, Admin finalizes the campaign, locking records for statutory audit submission.

---

============================================================
SECTION 3 — HIGH-LEVEL ARCHITECTURE
============================================================

```
[ User Browser / Field Scanner ]
               │
               ▼
┌────────────────────────────────────────────────────────┐
│             FRONTEND CLIENT (React 19 + Vite)          │
│  - SPA with React Router v7 Routing                    │
│  - ThemeContext (Dual-Theme: Light / Dark Mode)        │
│  - AuthContext (JWT Storage & Role State)              │
│  - Global Fetch Interceptor (Vercel / Render / Local)  │
│  - Authenticated Binary PDF Blob Downloader            │
│  - UI Primitives: DataTable, Modals, Drawers, Filters  │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / JSON REST Calls
                           │ Authorization: Bearer <JWT>
                           ▼
┌────────────────────────────────────────────────────────┐
│             BACKEND API (Node.js + Express 4.x)        │
│  - Security: Helmet, CORS, Rate Limiters               │
│  - Request Parsers: JSON / URL-encoded (10MB limits)   │
│  - Multipart Upload: Multer (Memory Storage)           │
├────────────────────────────────────────────────────────┤
│  MIDDLEWARE LAYER:                                     │
│  - protect() -> JWT Token Verification & User Hydrate  │
│  - authorize('ADMIN', ...) -> Role-Based Access Control│
│  - validate(zodSchema) -> Request Body Validation      │
│  - errorHandler() -> Centralized Error Sanitization    │
├────────────────────────────────────────────────────────┤
│  CONTROLLER & SERVICE LAYER:                           │
│  - assetController / assetRepository                   │
│  - masterController / make, model, tech repositories   │
│  - assignmentController / assignmentRepository         │
│  - importController / importService (Multi-Workbook)   │
│  - exportController / exportService (PDFKit & XLSX)    │
│  - columnMappingService & dataReconciliationService    │
│  - tagController / qrGenerator & tagPdfGenerator       │
│  - complaintController / complaintRepository           │
│  - verificationController / verificationRepository     │
└──────────────────────────┬─────────────────────────────┘
                           │ Mongoose 8.x ODM
                           ▼
┌────────────────────────────────────────────────────────┐
│             DATABASE TIER (MongoDB)                    │
│  - MongoDB Atlas (Production & Development Cluster)    │
│  - MongoMemoryServer (Automated Isolated Test Runs)    │
│  - 19 Schemas with Strict Text & Performance Indices   │
│  - Denormalized Custodian Snapshots for Instant Reads  │
│  - Atomic Counter Sequences for Collision-Free IDs     │
│  - Immutable AuditLog Collection                       │
└────────────────────────────────────────────────────────┘
```

### Layer Responsibilities
1. **Presentation Layer (Client):** Renders responsive views, manages active filters, executes dependent dropdown cascading, handles drag-and-drop spreadsheets, triggers client-side PDF downloads via binary blobs, and toggles themes via CSS custom properties.
2. **Security & Validation Layer:** Enforces TLS headers (`Helmet`), origin whitelisting (`CORS`), dual-tier rate limiting (general vs. auth), JWT cryptographic validation, RBAC route gating, and Zod payload schema validation.
3. **Business Logic & Service Layer:** Coordinates complex multi-step domain workflows: spreadsheet decryption, column fuzzy matching, conflict staging, parent-child component links, PDF document layouts, and warranty evaluations.
4. **Data Access Layer (Repositories):** Encapsulates Mongoose database operations with automatic regex escaping, case-insensitive collation lookups, and built-in in-memory fallback caches for reliable test execution.
5. **Persistence Layer (Database):** Stores documents across 19 collections with strict indexing, sparse uniqueness on serial numbers, and sequential counters.

---

============================================================
SECTION 4 — TECHNOLOGY STACK
============================================================

The following table reflects the **exact dependencies and tools verified from `package.json` files**:

| Category | Component / Library | Version | Purpose in Project |
|---|---|---|---|
| **Frontend Framework** | `react` | `^19.2.8` | Core UI component engine |
| **Frontend DOM** | `react-dom` | `^19.2.8` | DOM rendering layer |
| **Frontend Routing** | `react-router-dom` | `^7.1.5` | Client-side declarative routing and protected routes |
| **Frontend Build Tool** | `vite` | `^8.2.2` | High-speed frontend dev server and production bundler |
| **Frontend Linter** | `oxlint` | `^1.79.0` | High-performance JavaScript/JSX linter |
| **Frontend Icons** | `lucide-react` | `^1.16.0` | Modern SVG iconography across all views |
| **Frontend Spreadsheet** | `xlsx` (SheetJS) | `^0.18.5` | Client-side workbook inspection and export generation |
| **Frontend Styling** | Vanilla CSS Design System | Custom | Dual-theme CSS variables, 8px density grid, 0 runtime CSS overhead |
| **Backend Runtime** | Node.js (ES Modules) | `>=18` | Asynchronous server runtime (`"type": "module"`) |
| **Web Framework** | `express` | `^4.21.2` | HTTP REST API routing and middleware pipeline |
| **Database ODM** | `mongoose` | `^8.9.5` | MongoDB object modeling, schema validation, and hooks |
| **Validation Engine** | `zod` | `^3.24.1` | Declarative request payload validation schemas |
| **Security Headers** | `helmet` | `^8.0.0` | HTTP security headers (HSTS, CSP, nosniff, X-Frame-Options) |
| **CORS Middleware** | `cors` | `^2.8.5` | Cross-Origin Resource Sharing control |
| **Authentication** | `jsonwebtoken` | `^9.0.2` | Cryptographic JWT token generation and verification |
| **Password Hashing** | `bcryptjs` | `^2.4.3` | One-way salt-hashed credential storage (10 rounds) |
| **File Uploads** | `multer` | `^2.3.0` | Multipart/form-data handler for spreadsheet uploads |
| **Spreadsheet Ingestion**| `xlsx` (SheetJS) | `^0.18.5` | Server-side Excel workbook parsing and sheet extraction |
| **Encrypted Spreadsheets**| `xlsx-populate` | `^1.21.0` | Low-level workbook object manipulation |
| **Workbook Decryption** | `officecrypto-tool`| `^0.0.19` | Transparent decryption of password-protected Excel files |
| **Document Generation** | `pdfkit` | `^0.20.2` | Vector PDF generation for handover slips, tags, and clearance records |
| **Barcode / QR Matrix** | `qrcode` | `^1.5.4` | 300 DPI 2D barcode generation in PNG Data URL, SVG, and Buffer formats |
| **Environment Config** | `dotenv` | `^16.4.7` | Loads environment variables from `.env` |
| **HTTP Request Logger** | `morgan` | `^1.10.0` | HTTP request logging in development mode |
| **Test Runner** | Node.js Native Runner | Built-in | `node --test` native test runner (TAP reporting) |
| **Test Assertions** | Node.js Native Assert | Built-in | `node:assert` strict assertion library |
| **In-Memory Database** | `mongodb-memory-server`| `^11.2.0` | Ephemeral, isolated MongoDB instance for automated test suites |

---

============================================================
SECTION 5 — COMPLETE REPOSITORY STRUCTURE
============================================================

Derived directly from the verified file system:

```
Airport-Authority-of-India/
├── .gitignore                                 # Git ignore rules for node_modules, .env, dist, etc.
├── package.json                               # Root workspace script definitions
├── package-lock.json                          # Root lockfile
├── vercel.json                                # Vercel deployment rewrite rules for SPA routing
├── DEPLOYMENT.md                              # Enterprise deployment runbook (Nginx, PM2, SSL)
├── PROJECT_AUDIT_REPORT.md                    # Institutional architecture and compliance report
├── PROJECT_AUDIT_REPORT.html                  # HTML formatted audit report
├── walkthrough.md                             # Step-by-step walkthrough of audit & drawer fixes
├── AAI_ENTERPRISE_ATTRIBUTE_REQUIREMENT_MATRIX.md # Attribute categorization and requirement matrix
├── AAI_ENTITY_WORKFLOW_RELATIONSHIP_AUDIT.md  # Entity relationship audit
├── AAI_LEGACY_13_TO_ENTERPRISE_MAPPING.md     # 13-field legacy mapping to enterprise model
│
├── client/                                    # Frontend React Application
│   ├── index.html                             # Single Page Application HTML shell
│   ├── package.json                           # Frontend dependencies (React 19, Vite, Lucide)
│   ├── vite.config.js                         # Vite build configuration and proxy setup
│   └── src/
│       ├── main.jsx                           # Application bootstrap, StrictMode, API interceptor init
│       ├── App.jsx                            # React Router v7 routes, AppLayout, ProtectedRoute wrappers
│       ├── App.css                            # Base container styles
│       ├── index.css                          # Global Design System (60KB, dual-theme tokens, drawer grids)
│       ├── context/
│       │   ├── AuthContext.jsx                # Session state, login(), logout(), token persistence
│       │   └── ThemeContext.jsx               # Dark/Light theme state, localStorage, system preference sync
│       ├── services/
│       │   └── api.js                         # apiClient, fetch interceptor, PDF downloader, catalogApi, cleanQueryParams
│       ├── components/
│       │   ├── Navbar.jsx                     # Top navigation bar, user profile, theme toggle, mobile toggle
│       │   ├── Sidebar.jsx                    # Collapsible navigation drawer with role-aware route links
│       │   ├── Footer.jsx                     # Standardized institutional footer
│       │   ├── HealthStatus.jsx               # Diagnostic API health badge
│       │   ├── ProtectedRoute.jsx             # Role-based route guard redirecting unauthorized users
│       │   ├── ThemeToggle.jsx                # Light/Dark mode toggle button with smooth icon transitions
│       │   └── ui/
│       │       ├── DataTable.jsx              # Reusable data table with action buttons and status styling
│       │       ├── EmptyState.jsx             # Illustrated fallback when lists return empty
│       │       ├── FormControls.jsx           # Standardized SearchInput, SelectInput, ClearFilterButton
│       │       ├── LoadMoreButton.jsx         # Accessible pagination button with loading spinners
│       │       ├── Modal.jsx                  # Accessible dialog overlay with backdrop and escape handling
│       │       ├── PageHeader.jsx             # Unified view header with title, subtitle, and action buttons
│       │       └── StatCard.jsx               # Metric KPI card with trend indicators and icons
│       └── pages/
│           ├── Login.jsx                      # Split-screen responsive login view with wallpaper switcher
│           ├── Login.css                      # Layered login styling with light/dark ambient backgrounds
│           ├── Dashboard.jsx                  # Admin KPI metrics, warranty alerts, category/dept breakdown
│           ├── EmployeeDashboard.jsx          # Staff self-service portal (assigned assets, tickets, slips)
│           ├── AssetInventory.jsx             # 189KB Master inventory grid, filters, 9-section drawer, modals
│           ├── EnterpriseInventory.jsx        # Configurable column view with hardware specs and Excel export
│           ├── AssetTransfers.jsx             # Assignment, transfer, return workflows, custody timeline modal
│           ├── ComplaintDesk.jsx              # IT service desk ticketing, priority triage, technician assignment
│           ├── EmployeeDirectory.jsx          # Personnel master CRUD, account creation, custody asset drawer
│           ├── BulkImportExport.jsx           # 3-step multi-workbook ingestion, decryption, column mapping
│           ├── ExcelFieldManagement.jsx       # Custom database field definitions, aliases, import/export flags
│           └── AuditLogs.jsx                  # Immutable system event stream, actor filters, JSON payload inspection
│
└── server/                                    # Backend Express REST API Application
    ├── package.json                           # Backend dependencies (Express, Mongoose, Zod, PDFKit)
    ├── .env.example                           # Template environment variable declarations
    ├── .env                                   # Local runtime environment file (Secrets Redacted)
    ├── sample_data/                           # Test Excel workbooks and historical registers
    ├── scripts/                               # Maintenance, database migration, and test harness scripts
    │   ├── seed.js                            # Standalone comprehensive database seeder
    │   ├── seed_demo.js                       # Minimal demo account seeder
    │   ├── seed_demo_accounts.js              # Idempotent demo account initialization
    │   ├── migrate_phase11.js                 # Subdocument schema migration script
    │   └── verify_*.js                        # Verification and pipeline test scripts
    ├── test/                                  # 34 Automated Test Suites (Native `node --test`)
    │   ├── foundation.test.js                 # Server bootstrap, environment, and error middleware sanity
    │   ├── auth.test.js                       # JWT issuance, token expiration, bcrypt verification
    │   ├── phase13_rbac_governance.test.js    # Role boundary enforcement and forbidden access tests
    │   ├── employee.test.js                   # Employee CRUD, department mapping, asset counters
    │   ├── asset.test.js                      # 13-field asset CRUD, uniqueness, auto-ID sequence
    │   ├── phase1_master_catalog.test.js      # Makes, Models, Technologies CRUD and cascading filters
    │   ├── phase2_asset_model.test.js         # Extended asset specs, hardware types, lifecycle transitions
    │   ├── phase3_repository_query.test.js    # Query search, regex escaping, make/model/tech filtering
    │   ├── phase3_type_schemas.test.js        # Type-specific subdocuments (computer, power, network, display)
    │   ├── phase4_excel_alignment.test.js     # Canonical column mapping, reconciliation, export columns
    │   ├── phase4_master_data.test.js         # Master department, location, category repository tests
    │   ├── phase5_frontend_filter_alignment.test.js # Frontend parameter alignment, query param cleaning
    │   ├── phase5_network_software_amc.test.js # IP/MAC network tracking and vendor AMC contracts
    │   ├── phase6_relationships.test.js       # Parent-child component linking, circular reference prevention
    │   ├── phase7_transaction_custody_chain.test.js # Atomic custody transactions and rollback integrity
    │   ├── phase8_search_reporting.test.js    # Multi-facet search, date range filters, pagination envelopes
    │   ├── phase11_migration.test.js          # Legacy schema migration and field relocation tests
    │   ├── phase12_excel_v2_ingestion.test.js # Dynamic column alias resolution and staging tests
    │   ├── phase16_production_hardening.test.js # Rate limiters, CORS whitelisting, Helmet security headers
    │   ├── transfer.test.js                   # Assign, transfer, return workflows and custody records
    │   ├── complaint.test.js                  # Service desk ticket lifecycle and status updates
    │   ├── dashboard.test.js                  # Metric aggregations, warranty alerts, KPI endpoints
    │   ├── import.test.js                     # Single-file Excel parsing, validation, and commit
    │   ├── multi_import.test.js               # Multi-worksheet batch import parsing
    │   ├── password_excel.test.js             # Encrypted spreadsheet password decryption tests
    │   ├── real_world_workbook.test.js        # Ingestion tests on historical real-world AAI workbooks
    │   ├── export.test.js                     # Binary PDF and Excel generation and stream integrity
    │   ├── enterprise_documents.test.js       # Official handover slips, retirement forms, clearance docs
    │   ├── tag_amc.test.js                    # 300 DPI QR matrix rendering and AMC expiration virtuals
    │   ├── audit_fixes.test.js                # Edge-case regression verification
    │   ├── enterprise_refinement.test.js      # Enterprise attribute requirement matrix compliance
    │   ├── excel_fields.test.js               # Custom field configuration schema tests
    │   ├── health.test.js                     # Diagnostic healthcheck endpoint verification
    │   └── e2e.test.js                        # Complete end-to-end user journeys
    └── src/
        ├── server.js                          # HTTP server listener, MongoDB Atlas init, demo seeding
        ├── app.js                             # Express app setup, security middlewares, route mounting
        ├── config/
        │   └── db.js                          # MongoDB Atlas connection with MongoMemoryServer test fallback
        ├── models/                            # 19 Mongoose Schemas (Asset, Make, Model, User, etc.)
        ├── repositories/                      # 17 Data Access Repositories with in-memory fallbacks
        ├── controllers/                       # 17 Express Route Controllers
        ├── routes/                            # 17 RESTful API Route Definitions
        ├── services/                          # 6 Domain Services (Import, Export, Reconciliation, Seeding)
        ├── middleware/                        # Auth, RBAC, Rate Limiting, Validation, Error Handling
        ├── utils/                             # QR generation, PDF layouts, ID generators, regex escaping
        └── validations/                       # Zod validation schemas for requests
```

---

============================================================
SECTION 6 — FRONTEND ARCHITECTURE
============================================================

### React Bootstrap & Routing
* **Entry Point (`main.jsx`):** Renders `<App />` within React 19 `<StrictMode>`. Imports `index.css` and imports `./services/api.js` to ensure the global fetch interceptor is patched before any component mounts.
* **Declarative Routing (`App.jsx`):** Employs `react-router-dom` v7. Gated by `<ProtectedRoute>`, which checks session validity and allowed roles.
  - `/login`: Public.
  - `/`: Dynamic dashboard (`RootDashboard` conditionally renders `<Dashboard />` for Admin or `<EmployeeDashboard />` for Employee).
  - `/assets`, `/transfers`, `/employees`, `/import-export`, `/audit-logs`, `/inventory`: Restricted to `ADMIN`.
  - `/complaints`: Accessible to both `ADMIN` and `EMPLOYEE`.

### Session & Theme Management
* **`AuthContext.jsx`:** Stores active JWT token in browser `localStorage` (`aai_ams_token`). Upon application load, invokes `GET /api/v1/auth/me` to hydrate the user state. Exposes `login(credential, password)`, `logout()`, `user`, `token`, and `isAuthenticated`.
* **`ThemeContext.jsx`:** Manages dual-theme state (`light` vs. `dark`). Persists selection in `localStorage` under `aai-theme` and binds to the root HTML attribute `data-theme`. Automatically listens to system color-scheme changes (`prefers-color-scheme: dark`) if no manual preference is saved.

### Networking & API Client Layer (`api.js`)
* **Global Fetch Interceptor:** Automatically rewrites all relative `/api/` fetch calls to `VITE_API_URL` when deployed in production (e.g., Vercel frontend talking to Render backend), preventing 404 proxy errors while preserving standard Vite development proxies locally.
* **`apiClient` Utility:** Wraps `fetch`, injects `Authorization: Bearer <token>`, formats JSON request bodies, and throws standardized errors with HTTP status and backend validation messages.
* **Query Parameter Sanitizer (`cleanQueryParams`):** Strips `undefined`, `null`, and empty string `''` values from query objects prior to URL serialization, preventing malformed query strings like `?make=&model=undefined`.
* **Authenticated Binary Blob PDF Handler (`downloadAuthenticatedPdf`):**
  1. Executes authenticated `fetch` with `Bearer <token>`.
  2. Receives binary response stream as a `Blob`.
  3. Parses `Content-Disposition` header to extract the official institutional filename.
  4. Creates an ephemeral `window.URL.createObjectURL(blob)`.
  5. Programmatically clicks an anchor element to trigger browser download.
  6. Revokes the object URL after 2000ms to eliminate memory leaks.

### Reusable UI Architecture (`client/src/components/ui/`)
* **`DataTable.jsx`:** Robust table renderer supporting column templates, responsive scroll containers, empty state fallbacks, and action button toolbars.
* **`Modal.jsx`:** Accessible dialog component featuring backdrop click-dismiss, ESC key listeners, header close buttons, and body scroll lock.
* **`FormControls.jsx`:** Standardized form controls (`SearchInput` with search icon, `SelectInput` with custom styling, and `ClearFilterButton` with badge count).
* **`PageHeader.jsx`:** Unified title banner with breadcrumbs, action button slots, and metric counters.
* **`StatCard.jsx`:** Visual metric card displaying numerical values, status labels, iconography, and color-coded trend indicators.
* **`LoadMoreButton.jsx`:** Accessible pagination trigger displaying current item counts versus total records with animated loading spinners.

### Design System & CSS Architecture (`index.css`)
* Over **2,680 lines of pure, highly structured Vanilla CSS**.
* **Zero TailwindCSS dependency**—maximum performance, maintainability, and precise visual control.
* **Dual-Theme Design Tokens:** Defined under `:root, [data-theme="light"]` and `[data-theme="dark"]`. Includes CSS custom properties for surfaces (`--color-bg-app`, `--color-bg-card`), typography (`--color-text-main`, `--color-text-secondary`), brand scales (`--color-brand-900` to `--color-brand-50`), status badges (`--status-available-bg`, `--status-danger-text`), borders, shadows, and 8px grid spacing tokens (`--space-1` to `--space-8`).
* **Drawer Grid Utilities:** Implements dedicated 2×2 CSS grids (`.drawer-spec-grid`) with `min-width: 0` and `overflow-wrap: anywhere` across specification cells, completely eliminating horizontal clipping on long serial numbers.

---

============================================================
SECTION 7 — ALL FRONTEND PAGES
============================================================

### 1. `Login.jsx` (`client/src/pages/Login.jsx`)
* **Route:** `/login`
* **Access:** Public (All users)
* **Purpose:** Single entry point for institutional authentication.
* **Architecture:** Split-screen responsive layout with ambient photography layer (`/assets/login-light.jpg` and `/assets/login-dark.jpg`) that dynamically fades based on active theme.
* **Key States:** `credential` (accepts username or email), `password`, `showPassword` (visibility toggle), `error`, `isSubmitting`.
* **Behavior:** Submits to `POST /api/v1/auth/login`. On success, stores token in `localStorage` and redirects user to their intended destination or role-specific dashboard.

### 2. `Dashboard.jsx` (`client/src/pages/Dashboard.jsx`)
* **Route:** `/` (Rendered when `user.role === 'ADMIN'`)
* **Access:** Restricted to `ADMIN`
* **Purpose:** Executive command center providing real-time inventory metrics, SLA alerts, and operational feeds.
* **Key Features:**
  - 4 Primary KPI StatCards: Total Assets, In Active Custody, Available in Godown, Under Repair / Maintenance.
  - Distribution Tabs: Categorical breakdown, Departmental breakdown, Asset Type distribution, Vendor allocation.
  - Active Warranty Alerts: Highlights assets expiring within 30 days or already expired.
  - Live AMC Contracts Ledger: Vendor support tiers, end dates, and direct PDF download for SLA contract schedules.
  - Real-Time Operational Audit Feed: Live stream of recent system writes.

### 3. `EmployeeDashboard.jsx` (`client/src/pages/EmployeeDashboard.jsx`)
* **Route:** `/` (Rendered when `user.role === 'EMPLOYEE'`)
* **Access:** Restricted to `EMPLOYEE`
* **Purpose:** Self-service portal for airport operational staff.
* **Key Features:**
  - Personal Custody Ledger: Lists all equipment currently assigned to the logged-in employee (`currentEmployeeId`).
  - Handover Slip Download: Direct one-click download of signed PDF handover slips for any device in their possession.
  - Personal Service Desk Tickets: Tracks tickets raised by the employee with live resolution progress.
  - Quick Incident Reporting: Direct modal to report hardware or software issues on their devices.

### 4. `AssetInventory.jsx` (`client/src/pages/AssetInventory.jsx`)
* **Route:** `/assets`
* **Access:** Restricted to `ADMIN`
* **Purpose:** Central operational hub for the entire physical IT equipment inventory (189KB source file).
* **Multi-Facet Filter Toolbar:**
  - Search input (Asset ID, Name, Serial Number, Custodian, Make, Model, Room).
  - Category dropdown (`IT Equipment`, `Networking`, `Power`, `Printing`, `Communication`, etc.).
  - Cascading Dependent Dropdowns:
    - Selecting a Category filters available Asset Types and Makes.
    - Selecting a Make dynamically fetches and populates associated Models.
    - Category dynamically filters applicable Technologies.
  - Department, Status, Condition, Warranty Status, AMC, Vendor, and Location filters.
* **Slide-Out Asset Detail Drawer (9 Sections, 4 Tabs):**
  - **Overview Tab:** Quick specs, 2×2 Custodian Grid (Name, ID, Designation, Assigned Date), full-width PDF Handover Slip download button, status & warranty badges.
  - **Specifications Tab:** Deep hardware subdocument grids (Processor, RAM, Storage, OS, Resolution, Capacity, IP/MAC).
  - **Components Tab:** Parent/child composite equipment links (e.g., PC connected to Monitor, UPS, and Scanner) with Link/Unlink actions.
  - **Timeline Tab:** Chronological history of all custody handovers, maintenance events, and physical verification audit logs.
* **Modals:**
  - Register IT Equipment Modal (with tabbed sections for General, Technical Subdocuments, Procurement, Location, and Custodian).
  - Edit Asset Modal (updates specs without breaking legacy compatibility).
  - Physical Asset QR Tag Modal (renders thermal sticker layout and triggers PDF printing).
  - Physical Verification Campaign Modal (records field audit results).
  - Component Linking Modal (establishes parent-child relationships).

### 5. `EnterpriseInventory.jsx` (`client/src/pages/EnterpriseInventory.jsx`)
* **Route:** `/inventory`
* **Access:** Restricted to `ADMIN`
* **Purpose:** Wide-format enterprise matrix view designed for technical audits and hardware planning.
* **Key Features:**
  - Granular Column Grouping: Asset Identity, Custodian Information, Technical Compute Specifications, Location/Facility, Procurement/Financial, Warranty/AMC, and Lifecycle Status.
  - Column Visibility Manager: Toggle individual columns or entire groups on/off with persistent preferences.
  - Frozen Identifier Columns: Keeps Asset ID fixed during horizontal scrolling.
  - Client-Side Excel Export: Generates customized Excel workbooks containing exactly the visible, filtered data columns.

### 6. `AssetTransfers.jsx` (`client/src/pages/AssetTransfers.jsx`)
* **Route:** `/transfers`
* **Access:** Restricted to `ADMIN`
* **Purpose:** Custody governance desk for issuing, transferring, and reclaiming airport IT equipment.
* **Workflows Supported:**
  - **Assign Asset Modal:** Selects an unassigned asset, assigns to an employee, records reason and condition.
  - **Transfer Asset Modal:** Directly reassigns equipment from one staff member to another with condition logging.
  - **Return Asset Modal:** Reclaims equipment back to the IT Godown pool with physical condition triage.
  - **Custody Timeline Modal:** Visual timeline tracing the entire historical custody chain of any asset from first deployment.

### 7. `ComplaintDesk.jsx` (`client/src/pages/ComplaintDesk.jsx`)
* **Route:** `/complaints`
* **Access:** Open to both `ADMIN` and `EMPLOYEE`
* **Purpose:** Integrated IT service desk and maintenance tracking system.
* **Key Features:**
  - Raise Ticket Modal: Users select their asset, specify problem title, description, category, and severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
  - Priority & Severity Matrix: Dual-level classification ensuring critical airport operational faults (e.g., ATC/Radar equipment) are flagged as `P1_CRITICAL`.
  - Admin Resolution Workflow: Admins assign technicians, record replacement spare parts, input resolution notes, and transition ticket status.
  - Service Ticket Certificate PDF: Generates official printable resolution sheets for institutional audit records.

### 8. `EmployeeDirectory.jsx` (`client/src/pages/EmployeeDirectory.jsx`)
* **Route:** `/employees`
* **Access:** Restricted to `ADMIN`
* **Purpose:** Institutional personnel directory managing staff profiles, department mappings, and login credentials.
* **Key Features:**
  - Employee Master CRUD: Manage staff ID, name, designation, department, floor, email, phone, and employment type (`AAI` vs. `Contract`).
  - Active Custody Drawer: Displays all hardware currently allocated to an employee with quick handover slip downloads.
  - Login Provisioning: Instantly creates or resets user accounts linked to employee records with secure temporary passwords.

### 9. `BulkImportExport.jsx` (`client/src/pages/BulkImportExport.jsx`)
* **Route:** `/import-export`
* **Access:** Restricted to `ADMIN`
* **Purpose:** High-capacity enterprise spreadsheet ingestion and reconciliation workbench (116KB source file).
* **3-Step Ingestion Pipeline:**
  1. **Step 1 (Select Files & Worksheets):** Multi-file upload dropzone. Detects password-protected workbooks, presents modal password prompt, decrypts via `officecrypto-tool`, and extracts sheet summaries.
  2. **Step 2 (Map & Connect):** Fuzzy column matching against canonical 13 fields and supporting hardware attributes. Displays confidence percentages, candidate dropdowns, and ignore toggles.
  3. **Step 3 (Review & Import):** Pre-commit validation. Displays metrics (Ready, Duplicates, Conflicts, Unresolved Employees). Enables row-level conflict resolution (`USE_A`, `USE_B`, `MANUAL_VALUE`, `SKIP_RECORD`) and commit strategy selection (`SKIP_EXISTING`, `UPDATE_EXISTING`).

### 10. `ExcelFieldManagement.jsx` (`client/src/pages/ExcelFieldManagement.jsx`)
* **Route:** Embedded Modal / Admin View
* **Access:** Restricted to `ADMIN`
* **Purpose:** Dynamic database column alias and custom field governance.
* **Key Features:**
  - Displays the 13 locked core fields (immutable safeguards preventing accidental deletion).
  - Add Custom Fields: Define custom attributes (`TEXT`, `NUMBER`, `DATE`, `BOOLEAN`, `SELECT`) with aliases for automatic spreadsheet recognition.
  - Import / Export Toggles: Control whether custom fields appear in Excel import mapping and export spreadsheets.
  - Usage Check: Verifies whether an attribute contains data across existing assets before permitting deletion.

### 11. `AuditLogs.jsx` (`client/src/pages/AuditLogs.jsx`)
* **Route:** `/audit-logs`
* **Access:** Restricted to `ADMIN`
* **Purpose:** Read-only compliance and cybersecurity audit ledger.
* **Key Features:**
  - Paginated audit stream with actor, action, entity type, status, and IP address.
  - Filter by action (`AUTH`, `CREATE`, `UPDATE`, `TRANSFER`, `ASSIGN`, `RETURN`, `DELETE`, `IMPORT`).
  - Filter by entity (`ASSET`, `EMPLOYEE`, `ASSIGNMENT`, `COMPLAINT`, `SYSTEM`).
  - Detail Inspection Modal: Renders full before/after JSON diffs of database modifications.

---

============================================================
SECTION 8 — BACKEND ARCHITECTURE
============================================================

### Request-to-Database Pipeline
```
[ Incoming HTTP Request ]
           │
           ▼
[ Express Application (`app.js`) ]
   ├─► Helmet (Security Headers)
   ├─► CORS (Origin Whitelist Validation)
   ├─► Rate Limiter (`apiLimiter` / `authLimiter`)
   ├─► Body Parsers (`express.json`, `express.urlencoded` [10MB])
   └─► Morgan Logger (Dev mode)
           │
           ▼
[ Express Router (`routes/*.js`) ]
           │
           ▼
[ Middleware Pipeline ]
   ├─► `protect` -> Extracts Bearer JWT, verifies signature, hydrates `req.user`
   ├─► `authorize('ADMIN', ...)` -> Asserts role authorization
   └─► `validate(zodSchema)` -> Validates payload format, types, and constraints
           │
           ▼
[ Route Controller (`controllers/*.js`) ]
   - Extracts params, query, and validated body
   - Enforces transactional business rules
   - Delegates heavy workflows to Domain Services
           │
           ▼
[ Domain Service Layer (`services/*.js`) ]
   - Multi-workbook analysis, decryption, column matching
   - Data reconciliation & merge algorithms
   - PDFKit vector layout & document streaming
   - Excel workbook assembly via SheetJS
           │
           ▼
[ Data Access Repository Layer (`repositories/*.js`) ]
   - Encapsulates database queries
   - Implements regex escaping (`escapeRegex`)
   - Handles case-insensitive collation lookups
   - Provides seamless in-memory fallback for offline test execution
           │
           ▼
[ Mongoose Schemas & Models (`models/*.js`) ]
   - Schema validation, required fields, and enums
   - Virtual getters (`warrantyStatus`, `assignedTo`, `operatingSystem`)
   - Compound and text search indexes
   - Pre-save password hashing hooks
           │
           ▼
[ MongoDB Database Tier ]
```

### Standardized Response Envelope
All API controllers transmit responses through `apiResponse.js` using consistent JSON structures:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 154,
    "totalPages": 16,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Descriptive human-readable error explanation",
  "errors": [
    { "field": "serialNumber", "message": "Serial Number is required" }
  ]
}
```

### Error Handling Architecture
Centralized error handling in `errorHandler.js` intercepts all uncaught exceptions:
- **Zod Validation Errors:** Formatted into 400 Bad Request with field-level error arrays.
- **Mongoose `ValidationError`:** Formatted into 400 Bad Request with schema constraint messages.
- **MongoDB Duplicate Key (`code: 11000`):** Converted to 409 Conflict indicating exactly which field violated uniqueness (e.g., `serialNumber` or `assetId`).
- **`CastError`:** Converted to 400 Bad Request for malformed ObjectIds.
- **JWT Errors (`JsonWebTokenError`, `TokenExpiredError`):** Converted to 401 Unauthorized.
- **Generic Runtime Errors:** Returns 500 Internal Server Error, logging the full stack trace to the console in development while masking sensitive internals in production.

---

============================================================
SECTION 9 — ALL API ROUTES
============================================================

The backend mounts **17 dedicated route controllers** under `/api/v1`.

### 1. Authentication Routes (`/api/v1/auth`)
* `POST /api/v1/auth/login`
  - Auth: Public | Rate Limit: 30 req/15min
  - Body: `{ credential, password }`
  - Returns: `{ user, token }`
* `POST /api/v1/auth/register`
  - Auth: `protect` + `authorize('ADMIN')`
  - Body: `{ username, name, email, password, role, employeeId, department, designation }`
  - Returns: Created User
* `GET /api/v1/auth/me`
  - Auth: `protect` (All authenticated roles)
  - Returns: Current authenticated session user object
* `POST /api/v1/auth/logout`
  - Auth: `protect`
  - Returns: Success acknowledgment
* `GET /api/v1/auth/admin-only`
  - Auth: `protect` + `authorize('ADMIN')`
  - Diagnostic role test route
* `GET /api/v1/auth/employee-only`
  - Auth: `protect` + `authorize('EMPLOYEE')`
  - Diagnostic role test route

### 2. Master Catalog Routes (`/api/v1/master`)
* `GET /api/v1/master/departments` — Lists departments (Auth: `protect`)
* `GET /api/v1/master/categories` — Lists hardware categories (Auth: `protect`)
* `GET /api/v1/master/locations` — Lists airport facility locations (Auth: `protect`)
* `GET /api/v1/master/vendors` — Lists registered suppliers and OEMs (Auth: `protect`)
* `GET /api/v1/master/statuses` — Returns valid asset lifecycle statuses (Auth: `protect`)
* `GET /api/v1/master/conditions` — Returns valid asset conditions (Auth: `protect`)
* `GET /api/v1/master/asset-types` — Returns standardized asset types (Auth: `protect`)
* `GET /api/v1/master/category-asset-type-map` — Returns category-to-asset-type mapping matrix (Auth: `protect`)
* `GET /api/v1/master/makes` — Query Makes with filters: `category`, `assetType`, `search` (Auth: `protect`)
* `POST /api/v1/master/makes` — Create Make (Auth: `ADMIN`)
* `PUT /api/v1/master/makes/:id` — Update Make (Auth: `ADMIN`)
* `DELETE /api/v1/master/makes/:id` — Delete Make (Auth: `ADMIN`)
* `GET /api/v1/master/models` — Query Models with filters: `make`, `category`, `assetType`, `technology`, `search` (Auth: `protect`)
* `POST /api/v1/master/models` — Create Model (Auth: `ADMIN`)
* `PUT /api/v1/master/models/:id` — Update Model (Auth: `ADMIN`)
* `DELETE /api/v1/master/models/:id` — Delete Model (Auth: `ADMIN`)
* `GET /api/v1/master/technologies` — Query Technologies with filters: `category`, `assetType`, `search` (Auth: `protect`)
* `POST /api/v1/master/technologies` — Create Technology (Auth: `ADMIN`)
* `PUT /api/v1/master/technologies/:id` — Update Technology (Auth: `ADMIN`)
* `DELETE /api/v1/master/technologies/:id` — Delete Technology (Auth: `ADMIN`)

### 3. Dedicated Category & Department Sub-Routes
* `GET /api/v1/master/categories/` — List categories (Auth: `protect`)
* `POST /api/v1/master/categories/` — Create category (Auth: `ADMIN`)
* `GET /api/v1/master/departments/` — List departments (Auth: `protect`)
* `POST /api/v1/master/departments/` — Create department (Auth: `ADMIN`)

### 4. Asset Inventory Routes (`/api/v1/assets`)
* `GET /api/v1/assets`
  - Auth: `protect` (Admin & Employee)
  - Query Params: `search`, `category`, `assetType`, `make`, `model`, `technology`, `status`, `condition`, `department`, `floor`, `room`, `supplier`, `vendor`, `location`, `operatingSystem`, `ipAddress`, `amcApplicable`, `amcContractId`, `warrantyStatus`, `employeeId`, `page`, `limit`, `sortBy`, `sortOrder`
  - Returns: Paginated asset list and metadata envelope
* `GET /api/v1/assets/:id`
  - Auth: `protect`
  - Returns: Full asset document with subdocuments and virtuals
* `GET /api/v1/assets/:id/timeline`
  - Auth: `protect`
  - Returns: Combined chronological timeline of custody handovers, maintenance incidents, and verification events
* `POST /api/v1/assets`
  - Auth: `protect` + `authorize('ADMIN')`
  - Body: Validated by `createAssetSchema`
  - Returns: Created Asset document (auto-generates `assetId` if omitted)
* `PUT /api/v1/assets/:id`
  - Auth: `protect` + `authorize('ADMIN')`
  - Body: Validated by `updateAssetSchema`
  - Returns: Updated Asset document
* `PATCH /api/v1/assets/:id/lifecycle`
  - Auth: `protect` + `authorize('ADMIN')`
  - Body: `{ status, condition, remarks }`
  - Returns: Updated Asset document
* `PATCH /api/v1/assets/:id/retire`
  - Auth: `protect` + `authorize('ADMIN')`
  - Body: `{ retirementReason, dispositionMethod, remarks }`
  - Returns: Retired Asset with status `RETIRED` or `DISPOSED`
* `DELETE /api/v1/assets/:id`
  - Auth: `protect` + `authorize('ADMIN')`
  - Performs soft-archive or hard delete if unassigned

### 5. Custody & Assignment Routes (`/api/v1/assignments`)
* `GET /api/v1/assignments` — Query assignments with pagination and status filters (Auth: `protect`)
* `GET /api/v1/assignments/asset/:assetId` — Complete custody history for a specific asset (Auth: `protect`)
* `GET /api/v1/assignments/employee/:employeeId` — Active and historical custody records for an employee (Auth: `protect`)
* `GET /api/v1/assignments/:id` — Single assignment record details (Auth: `protect`)
* `POST /api/v1/assignments/assign` — Allocate asset to employee (Auth: `ADMIN`)
  - Body: `{ assetId, employeeId, condition, transferReason, remarks, cascadeComponents }`
* `POST /api/v1/assignments/transfer` — Reassign asset between employees (Auth: `ADMIN`)
  - Body: `{ assetId, toEmployeeId, transferReason, conditionAtReturn, conditionAtNewAssignment, remarks }`
* `POST /api/v1/assignments/return` — Return asset to IT Godown pool (Auth: `ADMIN`)
  - Body: `{ assetId, returnReason, conditionAtReturn, remarks }`

### 6. Asset Relationship Routes (`/api/v1/relationships`)
* `POST /api/v1/relationships/link` — Establish parent-child link (Auth: `ADMIN`)
  - Body: `{ parentAssetId, childAssetId, relationshipType, componentRole, notes }`
* `POST /api/v1/relationships/unlink` — Dissolve parent-child link (Auth: `ADMIN`)
  - Body: `{ parentAssetId, childAssetId, notes }`
* `GET /api/v1/relationships/components/:assetId` — Get all active child components for a parent (Auth: `protect`)
* `GET /api/v1/relationships/parent/:assetId` — Get parent asset for a child component (Auth: `protect`)

### 7. Employee Management Routes (`/api/v1/employees`)
* `GET /api/v1/employees` — Paginated list of staff members with search and department filters (Auth: `protect`)
* `GET /api/v1/employees/:id` — Employee profile details (Auth: `protect`)
* `GET /api/v1/employees/:id/account-status` — Checks if user login account exists for employee (Auth: `protect`)
* `POST /api/v1/employees` — Create employee profile (Auth: `ADMIN`)
* `PUT /api/v1/employees/:id` — Update employee profile (Auth: `ADMIN`)
* `DELETE /api/v1/employees/:id` — Delete employee profile (Auth: `ADMIN`)
* `POST /api/v1/employees/:id/create-login` — Provision login account for employee (Auth: `ADMIN`)
* `POST /api/v1/employees/:id/reset-password` — Generate new password for employee (Auth: `ADMIN`)
* `POST /api/v1/employees/:id/toggle-login` — Activate/deactivate employee user account (Auth: `ADMIN`)

### 8. Excel Import Routes (`/api/v1/import`)
* `GET /api/v1/import/template` — Download standard AAI asset ingestion spreadsheet template (Auth: `ADMIN`)
* `POST /api/v1/import/analyze` — Multipart multi-workbook inspection & sheet extraction (Auth: `ADMIN`)
* `POST /api/v1/import/unlock/:importToken` — Submit password to decrypt encrypted workbook (Auth: `ADMIN`)
* `PUT /api/v1/import/mappings/:importToken` — Update proposed column header mappings (Auth: `ADMIN`)
* `POST /api/v1/import/reconcile/:importToken` — Execute cross-sheet data reconciliation (Auth: `ADMIN`)
* `POST /api/v1/import/resolve/:importToken` — Resolve specific field conflicts or employee links (Auth: `ADMIN`)
* `POST /api/v1/import/commit` — Final batch commit into MongoDB (Auth: `ADMIN`)
* `POST /api/v1/import/validate` — Legacy single-file validation endpoint (Auth: `ADMIN`)

### 9. Document & Spreadsheet Export Routes (`/api/v1/export`)
* `GET /api/v1/export/assets/excel` — Filtered asset inventory Excel export (Auth: `ADMIN`)
* `GET /api/v1/export/handover/asset/:assetId/pdf` — Official Equipment Handover Slip PDF (Auth: `protect`)
* `GET /api/v1/export/handover/:assignmentId/pdf` — Handover Slip by assignment ID (Auth: `protect`)
* `GET /api/v1/export/assignment/:assignmentId/pdf` — Assignment verification slip (Auth: `protect`)
* `GET /api/v1/export/transfer/:assignmentId/pdf` — Inter-departmental transfer slip (Auth: `protect`)
* `GET /api/v1/export/return/:assignmentId/pdf` — Equipment return/de-allocation voucher (Auth: `protect`)
* `GET /api/v1/export/retirement/:assetId/pdf` — Decommissioning & write-off certificate (Auth: `ADMIN`)
* `GET /api/v1/export/complaint/:ticketId/pdf` — IT service desk incident certificate (Auth: `protect`)
* `GET /api/v1/export/amc/:contractNumber/pdf` — Vendor AMC SLA contract schedule (Auth: `ADMIN`)
* `GET /api/v1/export/verification/:campaignId/pdf` — Annual physical verification audit certificate (Auth: `ADMIN`)

### 10. Tags & QR Barcode Routes (`/api/v1/tags`)
* `GET /api/v1/tags/asset/:id/qr` — Generates base64 PNG Data URL and SVG QR matrix (Auth: `protect`)
* `GET /api/v1/tags/asset/:id/pdf` — Generates single 4" x 2" physical sticker PDF (Auth: `protect`)
* `POST /api/v1/tags/batch/pdf` — Generates 8-up sticker sheet on standard A4 paper (Auth: `ADMIN`)
* `GET /api/v1/tags/verify/:identifier` — Public/authenticated scanner lookup endpoint (Auth: `protect`)

### 11. IT Service Desk Complaint Routes (`/api/v1/complaints`)
* `GET /api/v1/complaints` — Query tickets (Admins see all; Employees see their own) (Auth: `protect`)
* `GET /api/v1/complaints/:id` — Ticket detail view (Auth: `protect`)
* `GET /api/v1/complaints/asset/:assetId` — Service history for specific asset (Auth: `protect`)
* `POST /api/v1/complaints` — Raise new incident ticket (Auth: `protect`)
* `PATCH /api/v1/complaints/:id/status` — Triage ticket status & resolution notes (Auth: `ADMIN`)
* `PATCH /api/v1/complaints/:id/assign` — Assign technician to ticket (Auth: `ADMIN`)

### 12. Dashboard & Reporting Routes (`/api/v1/dashboard`)
* `GET /api/v1/dashboard/stats` — Overall KPI metrics (Total, Assigned, Available, Maintenance) (Auth: `protect`)
* `GET /api/v1/dashboard/category-distribution` — Counts grouped by Category (Auth: `protect`)
* `GET /api/v1/dashboard/department-distribution` — Counts grouped by Department (Auth: `protect`)
* `GET /api/v1/dashboard/type-distribution` — Counts grouped by Asset Type (Auth: `protect`)
* `GET /api/v1/dashboard/vendor-distribution` — Counts grouped by Supplier/Vendor (Auth: `protect`)
* `GET /api/v1/dashboard/status-distribution` — Counts grouped by Lifecycle Status (Auth: `protect`)
* `GET /api/v1/dashboard/warranty-alerts` — Assets expiring $\le 30$ days or expired (Auth: `protect`)
* `GET /api/v1/dashboard/recent-activity` — Recent activity stream from AuditLog (Auth: `protect`)

### 13. Audit Log Routes (`/api/v1/audit-logs` and `/api/v1/audit`)
* `GET /api/v1/audit-logs/` — Paginated stream of audit log entries (Auth: `ADMIN`)
* `GET /api/v1/audit-logs/summary` — Metric summary of audit events (Auth: `ADMIN`)

### 14. Vendor AMC Routes (`/api/v1/amc`)
* `GET /api/v1/amc` — List active and expired maintenance contracts (Auth: `protect`)
* `GET /api/v1/amc/alerts` — Contracts expiring soon (Auth: `protect`)
* `GET /api/v1/amc/:id` — Contract details (Auth: `protect`)
* `POST /api/v1/amc` — Register new AMC contract (Auth: `ADMIN`)

### 15. Physical Verification Campaign Routes (`/api/v1/verification`)
* `GET /api/v1/verification/campaigns` — List all audit campaigns (Auth: `ADMIN`)
* `POST /api/v1/verification/campaigns` — Initiate new campaign (Auth: `ADMIN`)
* `GET /api/v1/verification/campaigns/:campaignId` — Campaign records and statistics (Auth: `ADMIN`)
* `POST /api/v1/verification/campaigns/:campaignId/verify` — Record asset physical verification (Auth: `ADMIN`)
* `POST /api/v1/verification/campaigns/:campaignId/finalize` — Finalize and lock campaign (Auth: `ADMIN`)

### 16. Dynamic Excel Field Configuration Routes (`/api/v1/excel-fields`)
* `GET /api/v1/excel-fields/` — List all configured database fields (Auth: `ADMIN`)
* `POST /api/v1/excel-fields/` — Create new custom field (Auth: `ADMIN`)
* `GET /api/v1/excel-fields/import-template-fields` — Active fields for spreadsheet import (Auth: `ADMIN`)
* `GET /api/v1/excel-fields/export-fields` — Active fields for Excel export (Auth: `ADMIN`)
* `PUT /api/v1/excel-fields/reorder` — Reorder field columns (Auth: `ADMIN`)
* `GET /api/v1/excel-fields/:fieldId/usage` — Check if field contains data across assets (Auth: `ADMIN`)
* `PUT /api/v1/excel-fields/:fieldId` — Update field configuration (Auth: `ADMIN`)
* `PATCH /api/v1/excel-fields/:fieldId/toggle` — Enable/disable field (Auth: `ADMIN`)
* `DELETE /api/v1/excel-fields/:fieldId` — Delete custom field (locked fields protected) (Auth: `ADMIN`)

### 17. System Diagnostic Health Route (`/api/v1/health`)
* `GET /api/v1/health`
  - Auth: Public
  - Returns: `{ status: 'HEALTHY', database: 'CONNECTED', uptime, memory, nodeVersion, timestamp }`

---

============================================================
SECTION 10 — DATABASE MODELS
============================================================

The system defines **19 Mongoose Schemas** in `server/src/models/`:

### 1. `Asset.js` (Collection: `assets`)
* **Primary Responsibility:** Core physical equipment master ledger.
* **Key Fields:** `assetId` (Unique String), `assetName`, `category`, `assetType` (Enum of 30+ types), `make` (String), `model` (String), `technology` (String), `serialNumber` (Unique sparse String), `oldAssetId`, `status` (Enum), `condition` (Enum), `department`, `floor`, `room`, `location`, `supplier`, `supplyOrderNumber`, `purchaseCost`, `purchaseDate`, `installDate`, `warrantyStartDate`, `warrantyEndDate`, `amcApplicable`, `amcContractId`, `amcEndDate`, `isArchived`.
* **Custodian Snapshots:** `currentEmployeeId`, `currentEmployeeName`, `currentDesignation`, `currentAssignmentDate`, `currentEmployeeType`, `currentEmploymentCategory`, `currentContractorName`.
* **Subdocument Schemas:** `computerConfig`, `softwareConfig`, `displayConfig`, `powerConfig`, `peripheralConfig`, `networkConfig`.
* **Extensibility:** `specifications` (Mixed), `customFields` (Mixed).
* **Virtual Fields:** `warrantyStatus`, `assignedTo`, `operatingSystem`, `osVersion`, `ipAddress`, `macAddress`.
* **Key Indexes:** Text index on 11 search fields; single indexes on `warrantyEndDate`, `status`, `category`, `assetType`, `department`, `currentEmployeeId`, `isArchived`, `make`, `model`, `technology`.

### 2. `AssetAssignment.js` (Collection: `assetassignments`)
* **Primary Responsibility:** Immutable chain of custody transaction ledger.
* **Fields:** `assignmentId` (Unique String), `assetId` (Indexed String), `assetName`, `employeeId` (Indexed String), `employeeName`, `department`, `floor`, `designation`, `employeeType` (`AAI` | `Contract`), `employmentCategory`, `contractorName`, `assignedDate` (Date), `returnedDate` (Date), `status` (`ACTIVE`, `TRANSFERRED`, `RETURNED`), `conditionAtAssignment`, `conditionAtReturn`, `transferReason`, `assignedBy`, `returnedBy`, `remarks`.
* **Indexes:** `{ assetId: 1, assignedDate: -1 }`, `{ employeeId: 1, status: 1 }`.

### 3. `AssetRelationship.js` (Collection: `assetrelationships`)
* **Primary Responsibility:** Parent-child composite equipment topology.
* **Fields:** `parentAssetId` (Indexed String), `childAssetId` (Indexed String), `relationshipType` (`COMPONENT_OF`, `CONNECTED_TO`, `PERIPHERAL_OF`, `BACKUP_FOR`), `componentRole` (`PRIMARY_DISPLAY`, `SECONDARY_DISPLAY`, `POWER_BACKUP`, `KEYBOARD`, `MOUSE`, `SCANNER`, `PRINTER`, `NETWORK_UPLINK`, `ATTACHED_STORAGE`, `OTHER`), `linkedDate`, `unlinkedDate`, `isActive` (Boolean), `notes`.
* **Indexes:** `{ parentAssetId: 1, isActive: 1 }`, `{ childAssetId: 1, isActive: 1 }`, `{ parentAssetId: 1, childAssetId: 1, isActive: 1 }`.

### 4. `Make.js` (Collection: `makes`)
* **Primary Responsibility:** OEM hardware brand master.
* **Fields:** `name` (String, Required), `code` (Uppercase String), `categories` ([String]), `assetTypes` ([String]), `description`, `website`, `isActive` (Boolean, default: true).
* **Indexes:** `{ name: 1 }` (Unique with case-insensitive collation `{ locale: 'en', strength: 2 }`), `{ categories: 1, isActive: 1 }`, `{ assetTypes: 1, isActive: 1 }`.

### 5. `Model.js` (Collection: `models`)
* **Primary Responsibility:** Hardware model master.
* **Fields:** `name` (String, Required), `make` (String, Required), `makeId` (ObjectId ref 'Make', Optional), `category`, `assetType`, `technology`, `specifications` (Mixed), `description`, `isActive` (Boolean).
* **Indexes:** `{ make: 1, name: 1, assetType: 1 }` (Compound unique with case-insensitive collation `{ locale: 'en', strength: 2 }`), `{ make: 1, isActive: 1 }`, `{ assetType: 1, isActive: 1 }`, `{ category: 1, isActive: 1 }`.

### 6. `Technology.js` (Collection: `technologies`)
* **Primary Responsibility:** Hardware technology classification master.
* **Fields:** `name` (String, Required), `category` (String), `assetTypes` ([String]), `description`, `isActive` (Boolean).
* **Indexes:** `{ name: 1, category: 1 }` (Compound unique with case-insensitive collation `{ locale: 'en', strength: 2 }`), `{ assetTypes: 1, isActive: 1 }`, `{ category: 1, isActive: 1 }`.

### 7. `Category.js` (Collection: `categories`)
* **Primary Responsibility:** Broad equipment classification.
* **Fields:** `name` (Unique String), `code` (Unique uppercase String), `description`, `requiresOS` (Boolean), `isActive` (Boolean).

### 8. `Department.js` (Collection: `departments`)
* **Primary Responsibility:** Regional office and operational divisions.
* **Fields:** `name` (Unique String), `code` (Unique uppercase String), `floor` (String, Required), `description`, `isActive` (Boolean).

### 9. `Location.js` (Collection: `locations`)
* **Primary Responsibility:** Physical airport facilities and radar stations.
* **Fields:** `name` (Unique String), `code` (Unique uppercase String), `region` (Enum: `SR`, `WR`, `NR`, `ER`, `NER`, `CHQ`), `facilityType` (Enum: `AIRPORT`, `RADAR_STATION`, `REGIONAL_HQ`, `COMMUNICATION_CENTRE`, `TRAINING_ESTABLISHMENT`), `city`, `state`, `isActive` (Boolean).

### 10. `Employee.js` (Collection: `employees`)
* **Primary Responsibility:** Institutional personnel master.
* **Fields:** `employeeId` (Unique uppercase String), `name`, `designation`, `department`, `floor`, `email`, `phone`, `employeeType` (`AAI` | `Contract`), `employmentCategory`, `contractorName`, `isActive` (Boolean), `assignedAssetsCount` (Number, default: 0).
* **Indexes:** Text search index on `name`, `employeeId`, `designation`, `department`.

### 11. `User.js` (Collection: `users`)
* **Primary Responsibility:** Authentication credentials and session security.
* **Fields:** `username` (Unique lowercase String), `name`, `email` (Unique lowercase String), `password` (Hashed via bcrypt), `role` (Enum: `ADMIN`, `EMPLOYEE`), `employeeId` (String link to Employee), `designation`, `department`, `isActive` (Boolean), `lastLogin` (Date).
* **Hooks & Methods:** Pre-save bcrypt salt-hashing (10 rounds), `comparePassword(candidatePassword)`, safe `toJSON` stripping the password hash.

### 12. `Complaint.js` (Collection: `complaints`)
* **Primary Responsibility:** IT service desk ticketing system.
* **Fields:** `ticketId` (Unique uppercase String), `assetId` (Indexed String), `assetName`, `category` (Enum: `HARDWARE_FAULT`, `SOFTWARE_ISSUE`, `NETWORK_CONNECTIVITY`, `PRINTER_PERIPHERAL`, `OPERATING_SYSTEM`, `SECURITY_ANTIVIRUS`, `POWER_UPS`, `OTHER`), `title`, `description`, `severity` (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), `priority` (`P1_CRITICAL`, `P2_HIGH`, `P3_MEDIUM`, `P4_LOW`), `status` (`OPEN`, `IN_PROGRESS`, `PENDING_PARTS`, `RESOLVED`, `CLOSED`, `REJECTED`), `reportedBy` (Embedded: `employeeId`, `employeeName`, `department`, `floor`, `phone`), `assignedTechnician` (Embedded: `name`, `assignedAt`), `resolution` (Embedded: `resolutionNotes`, `resolvedBy`, `resolvedAt`, `partsReplaced`), `remarks`.
* **Indexes:** `{ status: 1, createdAt: -1 }`, `{ 'reportedBy.employeeId': 1, status: 1 }`.

### 13. `Vendor.js` (Collection: `vendors`)
* **Primary Responsibility:** Hardware suppliers, OEMs, and service agencies.
* **Fields:** `name` (Unique String), `vendorCode` (Unique uppercase String), `contactPerson`, `email`, `phone`, `gemSellerId`, `address`, `servicesProvided` ([String]), `isActive` (Boolean).

### 14. `VendorAMC.js` (Collection: `vendoramcs`)
* **Primary Responsibility:** Annual Maintenance Contracts.
* **Fields:** `contractNumber` (Unique uppercase String), `vendorName`, `serviceType` (`HARDWARE_SUPPORT`, `NETWORK_MAINTENANCE`, `UPS_POWER_SLA`, `PRINTER_PERIPHERAL_SLA`, `SOFTWARE_LICENSE`), `startDate`, `endDate`, `supportTier` (`24x7_CRITICAL_4HR`, `SAME_DAY_8HR`, `NEXT_BUSINESS_DAY`, `STANDARD_8x5`), `contactPerson`, `contactPhone`, `contactEmail`, `coveredCategories` ([String]), `annualCostINR`, `remarks`.
* **Virtual:** `status` computed via `calculateWarrantyStatus(this.endDate)`.

### 15. `VerificationCampaign.js` (Collection: `verificationcampaigns`)
* **Primary Responsibility:** Statutory physical inventory audit campaigns.
* **Fields:** `campaignId` (Unique uppercase String), `name`, `financialYear`, `department`, `status` (`ACTIVE`, `FINALIZED`), `startDate`, `finalizedDate`, `createdBy`, `records` ([`verificationRecordSchema`]), `notes` (Default institutional disclaimer).
* **Record Schema:** `assetId`, `assetName`, `category`, `serialNumber`, `expectedDepartment`, `expectedFloor`, `expectedCustodian`, `observedLocation`, `observedCondition`, `result` (`VERIFIED`, `NOT_FOUND`, `DAMAGED`, `MOVED`, `UNAUTHORIZED_LOCATION`), `verifier`, `verifiedAt`, `remarks`.

### 16. `AuditLog.js` (Collection: `auditlogs`)
* **Primary Responsibility:** Immutable compliance and activity log.
* **Fields:** `action` (Uppercase String), `entityType` (`AUTH`, `ASSET`, `ASSIGNMENT`, `COMPLAINT`, `IMPORT`, `EXPORT`, `EMPLOYEE`, `SYSTEM`), `entityId`, `actor` (Embedded: `userId`, `username`, `name`, `role`, `ipAddress`), `details` (Mixed), `status` (`SUCCESS`, `FAILED`), `timestamp` (Date, default: Date.now).
* **Indexes:** `{ action: 1, timestamp: -1 }`, `{ entityType: 1, entityId: 1 }`, `{ 'actor.username': 1 }`.

### 17. `ExcelFieldConfig.js` (Collection: `excelfieldconfigs`)
* **Primary Responsibility:** Dynamic database field configurations and aliases.
* **Fields:** `fieldId` (Unique String), `fieldName` (Unique String), `displayName`, `dataType` (`TEXT`, `LONG_TEXT`, `NUMBER`, `DATE`, `BOOLEAN`, `SELECT`), `options` ([String]), `isLocked` (Boolean), `required` (Boolean), `enabled` (Boolean), `importEnabled` (Boolean), `exportEnabled` (Boolean), `sortOrder` (Number), `description`, `aliases` ([String]).
* **Indexes:** `{ sortOrder: 1 }`, `{ enabled: 1, importEnabled: 1 }`, `{ enabled: 1, exportEnabled: 1 }`.

### 18. `ImportJob.js` (Collection: `importjobs`)
* **Primary Responsibility:** Staging state for multi-file Excel ingestion.
* **Fields:** `importToken` (Unique Indexed String), `uploader` (Embedded), `status` (`ANALYZED`, `MAPPED`, `RECONCILED`, `COMMITTED`, `CANCELLED`), `files` ([`fileSummarySchema`]), `rawRows` ([Mixed]), `stagedAssets` ([Mixed]), `conflicts` ([`conflictItemSchema`]), `unresolvedEmployees` ([`unresolvedEmployeeSchema`]), `metrics` (Embedded), `errors` ([Mixed]), `commitSummary` (Embedded), `expiresAt` (Date with 3-hour TTL index).

### 19. `Counter.js` (Collection: `counters`)
* **Primary Responsibility:** Atomic sequential integer generation for collision-free Asset and Assignment IDs.
* **Fields:** `_id` (String sequence name, e.g. `'assetId_PC_2025'`), `seq` (Number, default: 0).

---

============================================================
SECTION 11 — ASSET MODEL IN DETAIL
============================================================

The `Asset` model is the core operational entity of the system.

### Grouped Field Definitions

#### A. Primary Identification
* `assetId` (String, Required, Unique, Trim, Uppercase): Primary institutional identifier (e.g. `AAI-REG-PC-2025-0001`). Auto-generated via atomic counter if omitted.
* `assetName` (String, Required, Trim): Descriptive human-readable label (e.g. `Dell OptiPlex 7090 MT Workstation`).
* `oldAssetId` (String, Optional, Default: `''`): Legacy fixed asset register number.
* `qrCode` (String, Optional): Embedded QR payload string.
* `barcode` (String, Optional): Barcode string.

#### B. Classification
* `category` (String, Required, Trim): Broad business category (e.g. `Desktop PC`, `Laptop`, `Printer`, `Online UPS`, `Network Switch`).
* `assetType` (String, Uppercase, Enum of 30+ types, Default: `'OTHER'`):
  - **IT Equipment:** `DESKTOP`, `LAPTOP`, `WORKSTATION`, `SERVER`, `MONITOR`, `STORAGE`, `THIN_CLIENT`.
  - **Networking:** `NETWORK`, `SWITCH`, `ROUTER`, `FIREWALL`, `ACCESS_POINT`, `MODEM`.
  - **Power:** `UPS`, `BATTERY_BANK`, `STABILIZER`, `PDU`.
  - **Printing:** `PRINTER`, `SCANNER`, `MULTIFUNCTION_PRINTER`, `PLOTTER`.
  - **Communication:** `INTERCOM`, `TELEPHONE`, `COMMUNICATION_DEVICE`, `RADIO`.
  - **Surveillance:** `CCTV`, `DVR_NVR`, `ACCESS_CONTROL`, `BIOMETRIC`.
  - **Office Equipment:** `PROJECTOR`, `PERIPHERAL`, `SHREDDER`, `LAMINATOR`, `BINDING`.
  - **Catch-all:** `OTHER`.

#### C. Make, Model & Technology
* `make` (String, Required, Trim): Hardware brand/manufacturer. Stored directly as a **normalized String** (e.g. `Dell`, `HP`, `Lenovo`, `Cisco`, `APC`).
* `model` (String, Required, Trim): Hardware model identifier. Stored directly as a **normalized String** (e.g. `OptiPlex 7090 MT`, `ThinkPad T14`).
* `technology` (String, Optional, Trim, Default: `''`): Hardware technology. Stored as an **optional String** (e.g. `IPS`, `Laser`, `Line-Interactive`, `NVMe SSD`, `Managed L2`).

#### D. Serial Number & Peripheral Exemption
* `serialNumber` (String, Sparse Unique, Trim, Uppercase): Unique machine serial number or chassis service tag.
* **Exemption Rule:** Evaluated dynamically via schema function:
  ```javascript
  required: function() {
    const exemptTypes = ['PERIPHERAL', 'OTHER'];
    return !exemptTypes.includes(this.assetType);
  }
  ```
  Major IT equipment strictly mandates serial numbers; auxiliary peripherals (keyboards, mice, patch cables) are exempt. `sparse: true` ensures null/undefined values for exempt items do not violate unique index constraints.

#### E. Facility & Location Information
* `department` (String, Required, Trim): Current departmental custodian section (e.g. `Information Technology`, `CNS`, `ATM`, `Finance & Accounts`).
* `departmentId` (String, Optional, Default: `''`): Department code (e.g. `IT`, `CNS`).
* `location` (String, Trim, Default: `'AAI Operational Facility'`): Airport or station name.
* `locationId` (String, Optional, Default: `''`): Location code (e.g. `MAA`).
* `floor` (String, Required, Trim): Physical floor level or wing (e.g. `2nd Floor, Technical Block`).
* `room` (String, Optional, Default: `''`): Specific room or cabin number.
* `intercom` (String, Optional, Default: `''`): Internal desk extension number.

#### F. Custodian Snapshot Fields (Denormalized Model)
To eliminate expensive `$lookup` / JOIN queries when rendering thousands of inventory records, the `Asset` document directly snapshots the current custodian:
* `currentEmployeeId` (String, Uppercase, Default: `null`)
* `currentEmployeeName` (String, Default: `''`)
* `currentDesignation` (String, Default: `''`)
* `currentAssignmentDate` (Date, Default: `null`)
* `currentEmployeeType` (String, Enum: `['AAI', 'Contract']`, Default: `'AAI'`)
* `currentEmploymentCategory` (String, Default: `''`)
* `currentContractorName` (String, Default: `''`)

#### G. Procurement & Financial Information
* `supplier` (String, Optional, Default: `''`): Procurement vendor name.
* `vendor` (String, Optional, Default: `''`): Supplier alias.
* `supplyOrderNumber` (String, Optional, Default: `''`): GeM contract or supply order reference.
* `purchaseDate` (Date, Optional, Default: `null`): Purchase agreement date.
* `purchaseCost` (Number, Min: 0, Optional, Default: `null`): Financial acquisition cost in INR.
* `installDate` (Date, Required): Date of physical commissioning.

#### H. Warranty & AMC Details
* `warrantyStartDate` (Date, Optional, Default: `null`): OEM warranty start date.
* `warrantyEndDate` (Date, Required): OEM warranty expiration date.
* `amcApplicable` (Boolean, Default: `false`): Flags whether device is covered under AMC.
* `amcContractId` (String, Optional, Default: `''`): Link to `VendorAMC` contract number.
* `amcEndDate` (Date, Optional, Default: `null`): Contract expiration date.

#### I. Lifecycle & Physical Condition
* `status` (String, Required, Enum, Default: `'AVAILABLE'`):
  `AVAILABLE`, `ASSIGNED`, `GODOWN`, `UNDER_MAINTENANCE`, `UNDER_REPAIR`, `FAULTY`, `DAMAGED`, `LOST`, `WRITE_OFF`, `RETIRED`, `DISPOSED`.
* `condition` (String, Required, Enum, Default: `'GOOD'`):
  `NEW`, `EXCELLENT`, `GOOD`, `FAIR`, `POOR`, `DAMAGED`, `UNSERVICEABLE`, `UNUSABLE`, `OBSOLETE`.
* `isArchived` (Boolean, Default: `false`): Flags soft-deleted assets.
* `remarks` (String, Default: `''`): Operational observations.

#### J. Type-Specific Subdocuments
* `computerConfig`: Processor, speed, RAM size (GB), RAM type, slots, storage type, storage capacity (GB), storage model, graphics card, form factor, OS, OS version, architecture, IP address, MAC address, hostname.
* `softwareConfig`: OS license key, office suite, office key, antivirus software, license key.
* `displayConfig`: Screen size (inches), resolution, panel type (IPS, VA, OLED), ports array, aspect ratio.
* `powerConfig`: Capacity (VA), capacity (Watts), topology (Line-Interactive, Online Double-Conversion), battery type, battery quantity, backup runtime minutes, last battery replacement date.
* `peripheralConfig`: Peripheral type, interface type (USB, Bluetooth, PS/2), wireless boolean.
* `networkConfig`: Device subtype (Switch, Router, Firewall, AP), total ports, port speed, management IP, IP address, MAC address, firmware version, managed boolean.

#### K. Backward Compatibility Virtual Getters
Migrated root-level technical fields return data from subdocuments transparently:
```javascript
assetSchema.virtual('operatingSystem').get(function () {
  return this.computerConfig?.operatingSystem || '';
});
assetSchema.virtual('osVersion').get(function () {
  return this.computerConfig?.osVersion || '';
});
assetSchema.virtual('ipAddress').get(function () {
  return this.computerConfig?.ipAddress || this.networkConfig?.ipAddress || '';
});
assetSchema.virtual('macAddress').get(function () {
  return this.computerConfig?.macAddress || this.networkConfig?.macAddress || '';
});
assetSchema.virtual('warrantyStatus').get(function () {
  return calculateWarrantyStatus(this.warrantyEndDate);
});
assetSchema.virtual('assignedTo').get(function () {
  if (!this.currentEmployeeId && !this.currentEmployeeName) return null;
  return {
    employeeId: this.currentEmployeeId,
    name: this.currentEmployeeName,
    designation: this.currentDesignation,
    assignedDate: this.currentAssignmentDate
  };
});
```

---

============================================================
SECTION 12 — MASTER DATA ARCHITECTURE
============================================================

### Hierarchical Entity Relationship
```
Category (e.g. IT Equipment, Printing, Power, Networking)
   │
   ├──► Asset Type (e.g. DESKTOP, LAPTOP, PRINTER, UPS, SWITCH)
   │       │
   │       ├──► Make / Brand (e.g. Dell, HP, Lenovo, Cisco, APC)
   │       │       │
   │       │       └──► Model (e.g. OptiPlex 7090 MT, Latitude 5420, ThinkPad T14)
   │       │
   │       └──► Technology (e.g. IPS, NVMe SSD, Laser, Line-Interactive, Managed L2)
```

### Critical Architectural Distinction: Storage Types
* **Asset Model Stores Normalized Strings:** The `Asset` collection stores `make`, `model`, and `technology` as **Strings** (`make: "Dell"`, `model: "OptiPlex 7090 MT"`, `technology: "NVMe SSD"`), **NOT as MongoDB ObjectIds**.
* **Rationale:**
  1. Guarantees 100% backward compatibility with existing legacy database records.
  2. Ensures blazing fast inventory queries without requiring multi-collection `$lookup` joins.
  3. Prevents import failure when ingesting spreadsheets containing uncataloged or legacy third-party brands.
* **Master Models Store Normalized Catalog Metadata:** The `Make`, `Model`, and `Technology` collections serve as the curated reference catalog for frontend dropdowns, validation checks, and cascading filter menus.
* **Optional Reference on Model:** The `Model` schema maintains an optional `makeId` reference pointing to `Make`, but also stores `make` as a string for direct denormalized queries.

### Case-Insensitive Uniqueness via MongoDB Collation
To eliminate duplicate entries resulting from differing character casing (e.g. `DELL`, `Dell`, `dell`), the Master collections enforce strict compound uniqueness using MongoDB Collation `{ locale: 'en', strength: 2 }`:
- **Make:** `{ name: 1 }` (unique, strength: 2)
- **Model:** `{ make: 1, name: 1, assetType: 1 }` (compound unique, strength: 2)
- **Technology:** `{ name: 1, category: 1 }` (compound unique, strength: 2)

---

============================================================
SECTION 13 — MAKE / MODEL / TECHNOLOGY
============================================================

### 1. Make (Brand Master)
* **Schema (`Make.js`):** `name`, `code`, `categories` ([String]), `assetTypes` ([String]), `description`, `website`, `isActive`.
* **API Endpoints:** `GET /api/v1/master/makes`, `POST /api/v1/master/makes`, `PUT /api/v1/master/makes/:id`, `DELETE /api/v1/master/makes/:id`.
* **Cascading Filter:** `GET /api/v1/master/makes?category=Power` filters to brands tagged with that category.
* **Seeded Makes (15 Brands):** Dell, HP, Lenovo, Apple, APC, Microtek, LG, Samsung, Logitech, Canon, Epson, Cisco, D-Link, Seagate, Western Digital.

### 2. Model Master
* **Schema (`Model.js`):** `name`, `make` (String), `makeId` (ObjectId, Optional), `category`, `assetType`, `technology`, `specifications` (Mixed), `description`, `isActive`.
* **API Endpoints:** `GET /api/v1/master/models`, `POST /api/v1/master/models`, `PUT /api/v1/master/models/:id`, `DELETE /api/v1/master/models/:id`.
* **Cascading Filter:** `GET /api/v1/master/models?make=Dell` filters models strictly manufactured by Dell.
* **Seeded Models (24 Models):**
  - **Dell:** OptiPlex 7090 MT, OptiPlex 7000, Latitude 5420, Latitude 5430, PowerEdge R750, UltraSharp U2422H.
  - **HP:** ProDesk 600, EliteDesk 805, ProBook 450, LaserJet Pro MFP 4104, ScanJet Pro 3000.
  - **Lenovo:** ThinkPad T14, ThinkPad T14s, ThinkCentre M70q.
  - **Apple:** MacBook Pro 16, MacBook Air M2.
  - **APC:** Back-UPS 600VA, Smart-UPS 1500VA, Smart-UPS 2200VA.
  - **LG:** 24MP400.
  - **Logitech:** K120 Keyboard, B100 Mouse.
  - **Cisco:** Catalyst 2960, Catalyst 9200.

### 3. Technology Master
* **Schema (`Technology.js`):** `name`, `category`, `assetTypes` ([String]), `description`, `isActive`.
* **API Endpoints:** `GET /api/v1/master/technologies`, `POST /api/v1/master/technologies`, `PUT /api/v1/master/technologies/:id`, `DELETE /api/v1/master/technologies/:id`.
* **Cascading Filter:** `GET /api/v1/master/technologies?category=Printing` filters technologies applicable to printers and scanners.
* **Seeded Technologies (20 Technologies):**
  - **Displays:** IPS, LED, OLED, VA, Liquid Retina XDR.
  - **Printing & Imaging:** Laser, Inkjet, Dot Matrix, Thermal, Sheetfed.
  - **Power Systems:** Line-Interactive, Online Double-Conversion, Offline / Standby.
  - **Storage:** NVMe SSD, SATA SSD, HDD.
  - **Networking:** Managed L2, Managed L3, Unmanaged, PoE+.

---

============================================================
SECTION 14 — ASSET REPOSITORY AND QUERY SYSTEM
============================================================

The `assetRepository.js` service manages multi-facet querying, pagination, and sorting:

### Query Construction & Regex Escaping
* All free-text and filter strings are processed through `escapeRegex()` from `regexHelper.js` to neutralize regex injection attacks.
* Exact string match filters (`make`, `model`, `technology`, `location`) utilize case-insensitive anchor regex patterns:
  ```javascript
  if (make) query.make = new RegExp(`^${escapeRegex(make.trim())}$`, 'i');
  if (model) query.model = new RegExp(`^${escapeRegex(model.trim())}$`, 'i');
  if (technology) query.technology = new RegExp(`^${escapeRegex(technology.trim())}$`, 'i');
  ```
* Global `search` evaluates a compound `$or` array matching across: `assetId`, `assetName`, `serialNumber`, `make`, `model`, `technology`, `oldAssetId`, `supplier`, `supplyOrderNumber`, `room`, `location`, `currentEmployeeName`, `currentEmployeeId`.

### Dynamic Date Range Filtering (Warranty & AMC)
* `warrantyStatus === 'EXPIRED'`: Queries `warrantyEndDate: { $lt: today }`.
* `warrantyStatus === 'EXPIRING_SOON'`: Queries `warrantyEndDate: { $gte: today, $lte: thirtyDaysLater }`.
* `warrantyStatus === 'ACTIVE'`: Queries `warrantyEndDate: { $gt: thirtyDaysLater }`.

### Supported Query Parameters
`page` (default: 1), `limit` (default: 10), `sortBy` (default: `'createdAt'`), `sortOrder` (`'asc'` | `'desc'`), `search`, `category`, `assetType`, `status`, `condition`, `department`, `floor`, `room`, `supplier`, `vendor`, `location`, `make`, `model`, `technology`, `operatingSystem`, `ipAddress`, `amcApplicable`, `amcContractId`, `warrantyStatus`, `employeeId`, `isArchived`.

### Pagination Response Structure
```json
{
  "items": [ ... ],
  "total": 128
}
```
The controller wraps this into the standard pagination envelope (`page`, `limit`, `total`, `totalPages`, `hasNext`, `hasPrev`).

### In-Memory Fallback Mechanism
If `mongoose.connection.readyState !== 1` (e.g., during offline development or unit testing without a running MongoDB daemon), `assetRepository` seamlessly executes the exact same multi-facet filter, search, sort, and slice logic against an in-memory `Map` pre-seeded with 10 representative AAI assets.

---

============================================================
SECTION 15 — AUTHENTICATION
============================================================

### Authentication Mechanism
* **Credential Handling:** Users log in using either their `username` or official `email` along with their password via `POST /api/v1/auth/login`.
* **Case-Insensitive Username Handling:** The `User` schema enforces `lowercase: true` on `username`. In addition, `findByCredential()` automatically normalizes input to lowercase prior to database lookup, allowing logins like `admin`, `Admin`, or `ADMIN` to succeed identically.
* **Password Hashing:** Passwords are hashed using `bcryptjs` with 10 salt rounds. Plaintext passwords are never logged or stored.
* **Token Issuance:** Upon successful verification, the server generates a signed JSON Web Token (JWT) with HMAC SHA-256 containing:
  ```json
  {
    "id": "66d400000000000000000099",
    "username": "admin",
    "role": "ADMIN",
    "employeeId": "AAI-ADM-001",
    "name": "AAI Regional Admin"
  }
  ```
* **Token Lifespan:** Configured via `JWT_EXPIRES_IN` in `.env` (default: `7d`).
* **Cryptographic Guard:** During server startup, `server.js` verifies that `JWT_SECRET` exists and is non-empty. If missing, the server process intentionally halts with a fatal security error.
* **Client Token Storage:** The client preserves the token in `localStorage` under `aai_ams_token`.
* **Token Verification (`auth.js`):** The `protect` middleware intercepts `Authorization: Bearer <token>`, decodes the payload, verifies that the user still exists in MongoDB and that `isActive === true`, and attaches the sanitized user object to `req.user`.

---

============================================================
SECTION 16 — RBAC / AUTHORIZATION
============================================================

The system enforces strict Role-Based Access Control via `authorize(...roles)` in `server/src/middleware/auth.js`.

### Role Permissions Matrix

| Feature / Module | Administrator (`ADMIN`) | Operational Staff (`EMPLOYEE`) |
|---|---|---|
| **Login & Session Hydration** | Read / Write | Read / Write |
| **Admin Dashboard (KPIs, Charts, Feeds)** | Full Access | No (Redirected to Employee Dashboard) |
| **Employee Self-Service Dashboard** | Viewable | Full Access (Personal devices & tickets) |
| **Asset Inventory (`/assets`)** | Full Read & CRUD | Read-Only (Filtered to assigned items) |
| **Register & Edit IT Equipment** | Yes | Denied (403 Forbidden) |
| **Decommission / Retire Assets** | Yes | Denied (403 Forbidden) |
| **Asset Transfers (Assign, Transfer, Return)** | Full Read & Write | Read-Only (Historical custody timeline) |
| **Handover Slip PDF Download** | Yes (Any asset) | Yes (Only assets in their own custody) |
| **Employee Directory (`/employees`)** | Full CRUD & Account Control | Denied (403 Forbidden) |
| **Bulk Excel Ingestion (`/import-export`)**| Full Pipeline Execution | Denied (403 Forbidden) |
| **Custom Excel Field Configuration** | Full Management | Denied (403 Forbidden) |
| **Master Data (Makes, Models, Tech)** | Read & Write (CRUD) | Read-Only (Dropdown lookup queries) |
| **Service Desk Complaint Creation** | Yes | Yes (For their own assigned assets) |
| **Service Desk Ticket Triage & Resolution**| Full Triage & Technician Assignment | Denied (Read-only on own tickets) |
| **Physical Verification Campaigns** | Initiate, Verify, Finalize | Denied (403 Forbidden) |
| **Vendor AMC Management** | Full Read & Write | Read-Only |
| **Audit Logs (`/audit-logs`)** | Full Read & JSON Diff Inspection | Denied (403 Forbidden) |

### Tenant Scoping for Employees
The `assignmentController.js` and `complaintController.js` controllers enforce row-level tenant scoping: if `req.user.role === 'EMPLOYEE'`, queries are strictly locked to `currentEmployeeId === req.user.employeeId`. Non-admin users cannot view other employees' devices or private tickets.

---

============================================================
SECTION 17 — ASSET LIFECYCLE
============================================================

### Lifecycle State Machine
```
[ New Procurement / Delivery ]
              │
              ▼ (Register Asset)
        [ AVAILABLE ] ◄─────────────────────────┐
         (IT Godown)                            │
              │                                 │
              ├─── (Assign Asset) ──────────────┤ (Return Asset)
              ▼                                 │
         [ ASSIGNED ]                           │
        (Staff Custody)                         │
              │                                 │
              ├─── (Inter-Staff Transfer) ──────┘
              │
              ├─── (Hardware Fault / Maintenance)
              ▼
   [ UNDER_MAINTENANCE ] / [ UNDER_REPAIR ]
              │
              ├─── (Repaired / Restored) ──► [ AVAILABLE ]
              │
              ├─── (Irreparable Physical Damage)
              ▼
         [ DAMAGED ] / [ FAULTY ]
              │
              ├─── (Technical Survey Committee Approval)
              ▼
         [ WRITE_OFF ]
              │
              ├─── (Formal Decommissioning & E-Waste Scrap Disposal)
              ▼
    [ RETIRED ] / [ DISPOSED ]
```

### Exact Status Enums in `Asset.js`
* `AVAILABLE`: In IT Store / Godown pool, ready for immediate issuance.
* `ASSIGNED`: Allocated to an operational staff custodian.
* `GODOWN`: In secondary storage repository.
* `UNDER_MAINTENANCE`: Routine servicing or software updates in progress.
* `UNDER_REPAIR`: Physical bench hardware repair underway.
* `FAULTY`: Equipment experiencing functional glitches.
* `DAMAGED`: Broken chassis, fractured screen, or electrical failure.
* `LOST`: Missing equipment reported during verification audit.
* `WRITE_OFF`: Surveyor approved for institutional write-off.
* `RETIRED`: Decommissioned from active service.
* `DISPOSED`: Sold at public auction or recycled via certified e-waste partner.

### Exact Condition Enums in `Asset.js`
`NEW`, `EXCELLENT`, `GOOD`, `FAIR`, `POOR`, `DAMAGED`, `UNSERVICEABLE`, `UNUSABLE`, `OBSOLETE`.

---

============================================================
SECTION 18 — CUSTODY / ASSIGNMENT / TRANSFER
============================================================

Custody tracking is legally and operationally sensitive in government institutions. The system maintains an unbroken chain of custody through the `AssetAssignment` model.

### Atomic Custody Transactions
Whenever an asset changes custody, the backend executes an atomic operation:
1. **Assign Asset (`POST /api/v1/assignments/assign`):**
   - Asserts asset is currently `AVAILABLE`.
   - Updates `Asset`: sets `status = 'ASSIGNED'`, updates `currentEmployeeId`, `currentEmployeeName`, `currentDesignation`, `currentAssignmentDate`.
   - Creates `AssetAssignment`: records `assignmentId`, timestamps, `conditionAtAssignment`, `transferReason`, `assignedBy`.
   - Increments `assignedAssetsCount` on `Employee`.
   - Records an entry in `AuditLog`.
2. **Transfer Asset (`POST /api/v1/assignments/transfer`):**
   - Asserts asset is currently `ASSIGNED`.
   - Archives current active assignment: sets `status = 'TRANSFERRED'`, `returnedDate = now()`, records `conditionAtReturn`.
   - Creates new assignment for the target employee with `status = 'ACTIVE'`.
   - Updates `Asset` custodian fields to target employee.
   - Adjusts `assignedAssetsCount` on both source and target `Employee` documents.
3. **Return Asset (`POST /api/v1/assignments/return`):**
   - Asserts asset is currently `ASSIGNED`.
   - Updates active assignment: sets `status = 'RETURNED'`, `returnedDate = now()`, records `conditionAtReturn`.
   - Updates `Asset`: resets `status = 'AVAILABLE'`, clears custodian snapshot (`currentEmployeeId = null`, `currentEmployeeName = ''`).
   - Decrements `assignedAssetsCount` on `Employee`.

### Why Custody Modules Are Protected
Alteration of assignment records invalidates physical audit trails, corrupts historical employee accountability, and compromises the legal validity of signed handover slips. Custody logic must never be bypassed or simplified.

---

============================================================
SECTION 19 — ASSET RELATIONSHIPS & COMPOSITIONS
============================================================

The `AssetRelationship` collection enables modeling composite workstation topologies (e.g. a Central Processing Unit linked to a primary monitor, secondary monitor, UPS, and laser printer).

### Relationship Architecture
* **`parentAssetId`:** The primary host machine (e.g. `AAI-REG-PC-2024-0001`).
* **`childAssetId`:** The auxiliary hardware component (e.g. `AAI-REG-MON-2024-0005`).
* **`relationshipType`:**
  - `COMPONENT_OF`: Embedded physical part (e.g., internal graphics card).
  - `CONNECTED_TO`: Direct cable connection (e.g., monitor to desktop).
  - `PERIPHERAL_OF`: Peripheral attachment (e.g., USB barcode scanner).
  - `BACKUP_FOR`: Dedicated power backup (e.g., UPS protecting a workstation).
* **`componentRole`:**
  `PRIMARY_DISPLAY`, `SECONDARY_DISPLAY`, `POWER_BACKUP`, `KEYBOARD`, `MOUSE`, `SCANNER`, `PRINTER`, `NETWORK_UPLINK`, `ATTACHED_STORAGE`, `OTHER`.

### Independent Identity Principle
Every child component maintains its own:
- Distinct `assetId`
- Distinct physical `serialNumber`
- Distinct `make` and `model`
- Distinct warranty expiration date and AMC coverage

Components can be linked (`POST /api/v1/relationships/link`) or unlinked (`POST /api/v1/relationships/unlink`) dynamically without altering their individual master records. Circular parent-child references are rejected.

---

============================================================
SECTION 20 — EXCEL IMPORT SYSTEM
============================================================

The system features an enterprise-grade multi-file spreadsheet ingestion engine capable of processing diverse legacy AAI registers.

### Ingestion Pipeline
```
[ User Uploads .xlsx / .xls / .csv ]
               │
               ▼
[ STEP 1: Inspection & Decryption ]
  - Checks OLE Compound Document signature for password encryption
  - If password required -> Prompts user -> Decrypts via `officecrypto-tool`
  - Extracts worksheets, discovers header rows, counts valid data rows
               │
               ▼
[ STEP 2: Intelligent Column Mapping ]
  - Fuzzy matches headers against Canonical Fields using aliases
  - Calculates confidence score (HIGH / MEDIUM / LOW)
  - Identifies complementary sheets (e.g. IP/MAC network sheets)
  - User reviews and adjusts mappings
               │
               ▼
[ STEP 3: Reconciliation & Conflict Resolution ]
  - Cleans dates, trims strings, normalizes Makes and OS
  - Generates primary matching keys (Serial, Asset ID, Employee+Name)
  - Identifies row conflicts (Value A vs Value B across sheets)
  - User selects conflict resolutions (USE_A, USE_B, MANUAL, SKIP)
  - Resolves unmapped employees (CREATE_EMPLOYEE, MAP_TO_EXISTING)
               │
               ▼
[ STEP 4: Atomic Database Commit ]
  - Enforces conflict strategy (SKIP_EXISTING vs. UPDATE_EXISTING)
  - Creates missing Employee profiles automatically
  - Generates sequential Asset IDs if missing
  - Sets up initial custody assignment records atomically
```

### Password-Protected Spreadsheet Handling
Government departments frequently password-protect spreadsheets. When an encrypted workbook is uploaded:
1. `isWorkbookEncrypted()` in `excelParser.js` checks the buffer header for OLE encryption signatures (`0xD0CF11E0`).
2. The file is marked with status `PASSWORD_REQUIRED`.
3. The frontend displays a padlock icon and secure password entry modal.
4. Calling `POST /api/v1/import/unlock/:importToken` passes the password to `decryptWorkbookBuffer()`, which decrypts the binary stream using `officecrypto-tool` and hands it to `xlsx-populate` for parsing.

---

============================================================
SECTION 21 — EXCEL FIELD MAPPING
============================================================

### Canonical 13 Fields + Supporting Attributes
Managed by `columnMappingService.js`:

| Key | Canonical Label | Aliases Supported | Ambiguous Terms Filtered |
|---|---|---|---|
| `userName` | User Name (Custodian) | `user name`, `username`, `custodian`, `employee name`, `staff name`, `assigned to`, `officer name` | `name`, `user` |
| `designation` | Designation | `designation`, `role`, `title`, `post`, `position`, `job title`, `rank`, `desig` | — |
| `department` | Department | `department`, `dept`, `division`, `section`, `branch`, `directorate`, `cost center` | — |
| `floor` | Floor / Location | `floor`, `floor / location`, `wing`, `block`, `building / floor`, `level` | `place` |
| `employeeId` | Employee ID | `employee id`, `emp id`, `empid`, `staff id`, `emp no`, `sap id`, `badge id`, `emp code` | `id`, `code`, `no` |
| `assetName` | Asset Name | `asset name`, `asset`, `equipment`, `equipment name`, `device name`, `item name`, `machine name` | `item`, `device` |
| `make` | Make / Company | `make`, `company`, `make / company`, `manufacturer`, `brand`, `vendor`, `oem`, `mfr` | — |
| `model` | Model | `model`, `model no`, `model number`, `machine model`, `type/model` | — |
| `technology` | Technology | `technology`, `tech`, `technology type`, `display technology`, `storage tech` | — |
| `serialNumber` | Serial Number | `serial number`, `serial no`, `serial`, `sn`, `s/n`, `service tag`, `chassis no` | `no`, `serial` |
| `installDate` | Install Date | `install date`, `installation date`, `installed on`, `commission date`, `d.o.i.` | `date`, `dt` |
| `warrantyEndDate` | Warranty End | `warranty`, `warranty end`, `warranty expiry`, `warranty valid till`, `amc expiry` | `expiry`, `valid till` |
| `operatingSystem`| Type of OS + Version | `type of os`, `operating system`, `os`, `os type`, `system os`, `os installed` | — |
| `remarks` | Remarks | `remarks`, `remark`, `notes`, `comments`, `handover remarks`, `description` | `comment`, `note` |

### Unknown & Supporting Columns
- Attributes such as `Processor`, `RAM`, `Storage`, `IP Address`, and `MAC Address` are mapped to technical subdocuments (`computerConfig`, `networkConfig`).
- Unrecognized columns can be mapped to `customFields` or appended to `remarks` to ensure zero data loss.
- `S.NO` or `SL NO` counter columns are automatically ignored during ingestion.

---

============================================================
SECTION 22 — EXCEL RECONCILIATION
============================================================

Multi-sheet workbooks often represent the same machine across different sheets (e.g., a hardware registry sheet and a separate network IP allocation sheet).

### Matching Strategies (`getRecordMatchingKey`)
1. **Chassis Serial Number (Primary Key):** `SERIAL:[NORMALIZED_SERIAL]` (e.g., `SERIAL:DL-7090-99481`).
2. **Asset ID (Institutional Key):** `ASSET_ID:[NORMALIZED_ASSET_ID]` (e.g., `ASSET_ID:AAI-REG-PC-2024-0001`).
3. **Employee ID + Asset Name:** `EMP_ASSET:[EMP_ID]:[ASSET_NAME]` (e.g., `EMP_ASSET:AAI-10842:DESKTOP`).
4. **Employee ID + Make + Model:** `EMP_MAKE_MODEL:[EMP_ID]:[MAKE]:[MODEL]`.
5. **Row Source Fallback:** `ROW_SOURCE:[FILE]:[SHEET]:[ROW]`.

### Normalization Logic
- **Operating Systems:** Normalizes strings like `"Win 11 Ent"` to `"Windows 11 Enterprise"` with version `"23H2"`.
- **Make/Brand:** Normalizes casing (e.g., `"dell"` $\rightarrow$ `"Dell"`, `"hewlett-packard"` $\rightarrow$ `"HP"`, `"apc"` $\rightarrow$ `"APC"`).
- **Serial Numbers:** Trims whitespace and converts to uppercase while preserving meaningful slashes and hyphens.

### Conflict Detection & Resolution
When two sheets present differing non-empty values for the same hardware field:
- A `conflictItem` is generated with `valueA`, `valueB`, and source provenance.
- The user resolves the conflict via `POST /api/v1/import/resolve/:importToken`:
  - `USE_A`: Adopts value from Sheet A.
  - `USE_B`: Adopts value from Sheet B.
  - `MANUAL_VALUE`: User inputs custom text.
  - `SKIP_RECORD`: Skips the conflicting record entirely.

---

============================================================
SECTION 23 — EXCEL COMMIT MODES
============================================================

The commit phase (`POST /api/v1/import/commit`) supports two distinct strategies:

### 1. `SKIP_EXISTING` (or `SKIP`)
* If an incoming asset's serial number already exists in the database, the record is **skipped entirely**.
* Existing database records remain untouched.
* Skipped assets are reported in `commitSummary.skippedCount`.

### 2. `UPDATE_EXISTING`
* If an incoming asset already exists, it is **updated non-destructively**.
* **Critical Non-Destructive Safeguard:** Incoming blank or whitespace-only values **never overwrite existing valid database data**:
  ```javascript
  if (row.make && String(row.make).trim() !== '') {
    existing.make = String(row.make).trim();
  }
  if (row.model && String(row.model).trim() !== '') {
    existing.model = String(row.model).trim();
  }
  if (row.technology && String(row.technology).trim() !== '') {
    existing.technology = String(row.technology).trim();
  }
  ```
* Custom fields are merged rather than replaced: `{ ...existing.customFields, ...row.customFields }`.
* If the incoming row contains custodian information and the existing asset is unassigned, custody is allocated automatically.

---

============================================================
SECTION 24 — EXCEL EXPORT
============================================================

* **Endpoint:** `GET /api/v1/export/assets/excel`
* **Access:** Restricted to `ADMIN`
* **Output Format:** Binary `.xlsx` workbook stream.
* **Worksheet Name:** `'Asset Inventory'`
* **Column Order (38 Standard Columns + Custom Fields):**
  1. **Asset Identity (9 Columns):** Asset ID, Old Asset ID, Asset Name, Category, Asset Type, Make / Company, Model, Technology, Serial Number.
  2. **Custodian / Personnel (8 Columns):** Employee ID, User Name (Custodian), Employee Type, Employment Category, Designation, Department, Floor / Location, Contractor / Vendor.
  3. **Technical Specs (9 Columns):** Processor, RAM (GB), Storage (GB), Storage Type, Operating System, OS Version, IP Address, MAC Address, Hostname.
  4. **Location / Facility (3 Columns):** Building / Location, Room, Intercom.
  5. **Procurement & Financial (5 Columns):** Supplier, Supply Order / PO No, Purchase Cost (INR ₹), Purchase Date, Install Date.
  6. **Warranty & AMC (6 Columns):** Warranty Start Date, Warranty End Date, Warranty Status, AMC Applicable, AMC Contract ID, AMC End Date.
  7. **Lifecycle & Status (4 Columns):** Lifecycle Status, Physical Condition, Remarks, Assignment Date.
  8. **Dynamic Custom Columns:** Appends all active, export-enabled custom fields defined in `ExcelFieldConfig`.
* **Active Filter Integration:** Respects all active query parameters (`category`, `make`, `model`, `technology`, `department`, `status`, `search`), exporting exactly the filtered subset.

---

============================================================
SECTION 25 — PDF / QR SYSTEM
============================================================

### 1. Vector PDFKit Document Engine (`pdfGenerator.js` & `exportService.js`)
All official institutional documents are compiled on-the-fly using `pdfKit`:
* **AAI Header Banner:** High-contrast AAI Navy Blue banner (`#002B49`) featuring official typography:
  - `"AIRPORTS AUTHORITY OF INDIA"` (Helvetica-Bold, 15pt)
  - `"Regional Office • Information Technology & Communications Division"` (Helvetica, 9.5pt)
  - Document Title (e.g., `"EQUIPMENT HANDOVER & CUSTODY SLIP"`)
* **Reference Bar:** Displays Document ID, Date of Issue, and Status badge.
* **Dual Signature Section:** Complies with institutional audit standards:
  - Left: `"Custodian Signature & Date"` (Staff Member)
  - Right: `"Authorized Officer Signature & Seal"` (IT In-Charge)
* **Institutional Footer:** Embedded document tracking metadata, date of generation, and legal notice on every page.

### 2. Physical Asset QR Tags (`tagPdfGenerator.js` & `qrGenerator.js`)
* **QR Matrix Content:** 300 DPI 2D barcode containing a structured JSON verification payload:
  ```json
  {
    "org": "Airports Authority of India",
    "assetId": "AAI-REG-PC-2024-0001",
    "serialNumber": "DL-7090-99481",
    "category": "Desktop PC",
    "make": "Dell",
    "model": "OptiPlex 7090 MT",
    "department": "CNS",
    "floor": "2nd Floor, Technical Block",
    "status": "ASSIGNED",
    "warrantyStatus": "ACTIVE",
    "verifyUrl": "http://localhost:5173/assets?search=AAI-REG-PC-2024-0001"
  }
  ```
* **Single Sticker PDF:** Formatted for standard 4" x 2" thermal/laser sticker stock (288 x 144 points in PDFKit). Features outer border, header pill, equipment details (Category, Make/Model, Serial, Warranty), 300 DPI QR code image, and tamper warning footer.
* **Batch Sticker Sheet:** Generates an A4 sheet layout (2 columns $\times$ 4 rows = 8 tags per page) for mass equipment tagging.

---

============================================================
SECTION 26 — AUDIT LOGGING
============================================================

### Immutable Audit Trail
The system records all administrative state mutations in the `AuditLog` collection:
* **Audited Actions:**
  - `AUTH`: Login, logout, failed password attempts.
  - `CREATE`: Asset registration, employee creation, user provisioning.
  - `UPDATE`: Specification changes, department updates.
  - `ASSIGN`: Initial equipment issuance.
  - `TRANSFER`: Custody handover between employees.
  - `RETURN`: Equipment de-allocation back to Godown.
  - `RETIRE`: Decommissioning and write-off.
  - `IMPORT`: Excel bulk commit executions.
  - `VERIFY`: Physical audit campaign records.
* **Audit Document Structure:**
  - `action`: Audit action verb (uppercase).
  - `entityType`: Target entity (`ASSET`, `ASSIGNMENT`, `EMPLOYEE`, `COMPLAINT`, `IMPORT`, `SYSTEM`).
  - `entityId`: Unique identifier of the modified entity.
  - `actor`: Embedded snapshot of the acting user (`userId`, `username`, `name`, `role`, `ipAddress`).
  - `details`: Mixed payload containing before/after diffs or operation summaries.
  - `status`: `'SUCCESS'` or `'FAILED'`.
  - `timestamp`: UTC date/time (indexed).
* **Immutability:** Audit records are write-only. No API endpoint exists to update or delete audit logs.

---

============================================================
SECTION 27 — WARRANTY / AMC
============================================================

### Dynamic Warranty Status Calculation (`warranty.js`)
Warranty status is **never stored statically in the database**. It is calculated dynamically at runtime from `warrantyEndDate`:
```javascript
export const calculateWarrantyStatus = (warrantyEndDate) => {
  if (!warrantyEndDate) return 'EXPIRED';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiry = new Date(warrantyEndDate);
  const expiryDate = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const diffDays = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'EXPIRED';
  if (diffDays <= 30) return 'EXPIRING_SOON';
  return 'ACTIVE';
};
```

### Visual Indicators & Badges
* `ACTIVE`: Green badge (`badge-available`)
* `EXPIRING_SOON`: Amber warning badge (`badge-maintenance`)
* `EXPIRED`: Red danger badge (`badge-danger`)

### Annual Maintenance Contracts (`VendorAMC`)
- Tracks third-party maintenance contracts covering post-warranty equipment.
- Virtual `status` on `VendorAMC` evaluates contract validity against `endDate`.
- Dashboard features dedicated **AMC Contracts** overview showing vendor contact details, support tiers (`24x7_CRITICAL_4HR`, `SAME_DAY_8HR`, `NEXT_BUSINESS_DAY`), and direct SLA PDF exports.

---

============================================================
SECTION 28 — SEARCH & FILTERING MATRIX
============================================================

| Filter Field | Backend Query Param | Supported on Frontend? | Case Sensitive? | Combined Filtering Supported? | Query Mechanism |
|---|---|---|---|---|---|
| **Free-Text Search** | `search` | Yes (SearchInput) | No | Yes | `$or` Regex across 11 fields |
| **Category** | `category` | Yes (SelectInput) | Yes | Yes | Exact match (`query.category`) |
| **Asset Type** | `assetType` | Yes (SelectInput) | No | Yes | Uppercase match (`query.assetType`) |
| **Make (Brand)** | `make` | Yes (Cascading Select) | No | Yes | Anchored Regex (`^Dell$`, `i`) |
| **Model** | `model` | Yes (Cascading Select) | No | Yes | Anchored Regex (`^OptiPlex 7090 MT$`, `i`) |
| **Technology** | `technology`| Yes (Cascading Select) | No | Yes | Anchored Regex (`^NVMe SSD$`, `i`) |
| **Department** | `department` | Yes (SelectInput) | Yes | Yes | Exact match (`query.department`) |
| **Floor / Level** | `floor` | Yes | Yes | Yes | Exact match (`query.floor`) |
| **Room / Cabin** | `room` | Yes | No | Yes | Partial string match |
| **Location / Site** | `location` | Yes (SelectInput) | No | Yes | Anchored Regex (`query.location`, `i`) |
| **Lifecycle Status** | `status` | Yes (SelectInput) | Yes | Yes | Exact Enum match |
| **Condition** | `condition` | Yes (SelectInput) | Yes | Yes | Exact Enum match |
| **Warranty Status** | `warrantyStatus`| Yes (SelectInput) | Yes | Yes | Dynamic `$lt` / `$lte` date query |
| **AMC Applicable** | `amcApplicable`| Yes (SelectInput) | No | Yes | Boolean evaluation |
| **Vendor / Supplier**| `vendor` / `supplier`| Yes (SelectInput) | No | Yes | Supplier / Vendor field match |
| **Employee ID** | `employeeId` | Yes | No | Yes | Uppercase exact match |
| **Operating System**| `operatingSystem`| Yes | No | Yes | Subdocument Regex (`computerConfig.operatingSystem`) |
| **IP Address** | `ipAddress` | Yes | No | Yes | Subdocument `$or` (computer & network) |

---

============================================================
SECTION 29 — VALIDATION
============================================================

Validation is enforced across three distinct boundaries:

### 1. Frontend Form Validation
- Prevents submission of required fields when empty (`assetName`, `category`, `make`, `model`, `department`, `floor`, `installDate`, `warrantyEndDate`).
- Validates date formats and asserts that `warrantyEndDate` $\ge$ `warrantyStartDate`.
- Form controls visually flag errors with red focus borders and error tooltips.

### 2. Middleware Payload Validation (Zod)
- Declarative validation schemas in `server/src/validations/`:
  - `assetValidation.js`: Validates `createAssetSchema` and `updateAssetSchema`.
  - `assignmentValidation.js`: Validates `assignAssetSchema`, `transferAssetSchema`, and `returnAssetSchema`.
  - `authValidation.js`: Validates `loginSchema` and `registerSchema`.
  - `complaintValidation.js`: Validates `createComplaintSchema` and status update schemas.
  - `masterValidation.js`: Validates `createMakeSchema`, `createModelSchema`, `createTechnologySchema`, and Employee/Department schemas.
- Invalid requests immediately return 400 Bad Request with field-specific error messages before reaching controllers.

### 3. Database Schema Validation (Mongoose)
- Mongoose schema constraints: `required`, `enum`, `minlength`, `lowercase`, `uppercase`, and custom regex patterns (e.g. email validation on `Employee` and `User`).
- Custom schema function enforcing serial number presence for core IT equipment while exempting peripherals.

---

============================================================
SECTION 30 — ERROR HANDLING
============================================================

| HTTP Status Code | Scenario | Example Response Message |
|---|---|---|
| **200 OK** | Successful read, update, or login | `"Operation completed successfully"` |
| **201 Created** | Successful entity creation | `"Asset registered successfully"` |
| **400 Bad Request** | Zod or Mongoose validation failure, missing parameter | `"Asset Name must be at least 2 characters"` |
| **401 Unauthorized** | Missing, invalid, or expired JWT Bearer token | `"Authentication required. No token provided."` |
| **403 Forbidden** | Role lacks permission, or account deactivated | `"Access denied: [EMPLOYEE] role is not authorized"` |
| **404 Not Found** | Target resource ID does not exist in MongoDB | `"Asset not found with identifier: AAI-REG-PC-9999"` |
| **409 Conflict** | Duplicate serial number or asset ID (Code: 11000) | `"Chassis serial number already registered in inventory"` |
| **429 Too Many Requests** | Rate limit threshold exceeded | `"Too many authentication attempts, please try again in 15 minutes"` |
| **500 Internal Error** | Uncaught server exception or database failure | `"Internal Server Error"` |

---

============================================================
SECTION 31 — SECURITY ARCHITECTURE
============================================================

* **Cryptographic Passwords:** Bcrypt salt hashing (10 rounds). Passwords cannot be decrypted or reverse-engineered.
* **Token Hardening:** Signed JWTs using HMAC SHA-256. Secret validated during server boot.
* **HTTP Security Headers:** Integrated `helmet()` configuring:
  - `X-Content-Type-Options: nosniff` (Prevents MIME-sniffing)
  - `X-Frame-Options: SAMEORIGIN` (Mitigates clickjacking)
  - `Strict-Transport-Security` (HSTS enforcement)
  - Removes `X-Powered-By: Express` header to obscure server technology.
* **Cross-Origin Security (CORS):** Strict origin matching against `allowedOrigins` array (`http://localhost:5173`, `http://127.0.0.1:5173`, and `https://airport-authority-of-india*.vercel.app`).
* **Dual-Tier Rate Limiting (`rateLimiter.js`):**
  - General API Rate Limiter: 300 requests per 15-minute window.
  - Auth Endpoint Limiter: 30 requests per 15-minute window on `/api/v1/auth/login`.
* **NoSQL Injection Defense:** All queries utilize Mongoose parameterized query operators. Free-text search and filter inputs are sanitized through `escapeRegex()`.
* **Credential Redaction:** `.env` is committed to `.gitignore`. Secrets are never exposed in responses or client bundles.

---

============================================================
SECTION 32 — TESTING
============================================================

### Testing Framework & Configuration
* **Test Runner:** Node.js native test runner (`node --test`).
* **Assertion Library:** Strict Node.js assertion library (`node:assert`).
* **Database Isolation:** Utilizes `mongodb-memory-server` (`^11.2.0`) to instantiate clean, isolated in-memory MongoDB instances for automated test suites.
* **Test Directory:** `server/test/` containing **34 test suites**.
* **Test Command:** Verified from `server/package.json`:
  ```bash
  npm test
  # or directly in server/:
  node --test test/foundation.test.js test/auth.test.js ...
  ```

### Latest Reported Test Result
* **Latest reported full server test result:** **360 passed, 0 failed** across all active test suites.
* *Note:* In accordance with instructions, automated tests were not re-executed during this documentation task to preserve runtime state.

---

============================================================
SECTION 33 — COMPLETED DEVELOPMENT PHASES
============================================================

The system has progressed through multiple structured development phases:

#### Phase 1: Master Catalog Architecture
* **Objective:** Establish normalized reference collections for hardware classifications.
* **Deliverables:** `Make.js`, `Model.js`, `Technology.js`, and `Category.js` schemas with case-insensitive collation indexes; `makeRepository.js`, `modelRepository.js`, `technologyRepository.js`; `masterController.js`; and seed routines for 15 Makes, 24 Models, and 20 Technologies.
* **Verification:** `phase1_master_catalog.test.js`.

#### Phase 2: Core Asset Schema & Validation
* **Objective:** Expand the `Asset` model to incorporate Make, Model, and Technology as normalized strings while preserving the 13 core legacy register fields.
* **Deliverables:** Updated `Asset.js` schema; type-specific subdocuments (`computerConfig`, `networkConfig`, etc.); `assetValidation.js` Zod schemas; serial number peripheral exemption.
* **Verification:** `phase2_asset_model.test.js`.

#### Phase 3: Repository & Query Service Layer
* **Objective:** Upgrade `assetRepository.js` to support multi-facet queries, case-insensitive regex filtering, and pagination envelopes.
* **Deliverables:** Exact regex filtering on `make`, `model`, and `technology`; in-memory fallback query engine.
* **Verification:** `phase3_repository_query.test.js`.

#### Phase 4: Excel Import & Export Alignment
* **Objective:** Align spreadsheet ingestion and export routines with the new Master Data architecture.
* **Deliverables:** Canonical field matching in `columnMappingService.js`; non-destructive updates in `importService.js`; 38-column export in `exportService.js` placing Technology alongside Make/Model.
* **Verification:** `phase4_excel_alignment.test.js`.

#### Phase 5: Frontend Catalog Filters
* **Objective:** Provide responsive, cascading Master Data filter controls in the UI.
* **Deliverables:** Dependent dropdowns in `AssetInventory.jsx`; `cleanQueryParams` in `api.js` to strip empty strings; catalog loaders for Makes, Models, and Technologies.
* **Verification:** `phase5_frontend_filter_alignment.test.js`.

#### Phase 6: Enterprise Hardening & Operational Features
* **Objective:** Complete end-to-end institutional features (transfers, complaint tickets, verification campaigns, QR stickers, PDF generation, and responsive drawers).
* **Deliverables:** Fixed asset drawer grids, global fetch interceptor, password-protected workbook decryption, rate limiters, and audit log inspection.
* **Verification:** Verified across 34 test suites.

---

============================================================
SECTION 34 — BACKWARD COMPATIBILITY
============================================================

The system strictly adheres to non-negotiable backward compatibility rules:
1. **`make` and `model` Remain Strings on `Asset`:** Never convert `make` or `model` fields on the `Asset` schema into `ObjectId` references. Doing so would break existing database records, fail legacy imports, and introduce heavy join overhead.
2. **`technology` Remains an Optional String:** Assets without specified technology store `''`.
3. **Root Technical Field Compatibility:** Legacy client code reading `asset.operatingSystem`, `asset.ipAddress`, or `asset.macAddress` continues to function via virtual getters mapped to subdocuments.
4. **In-Memory Fallback Preserved:** Repositories maintain memory maps ensuring unit tests and offline demonstrations run without requiring an active network connection to MongoDB Atlas.
5. **Excel Compatibility:** Ingestion supports both single-sheet legacy registers and multi-sheet enterprise workbooks. Non-destructive commit guarantees existing asset data is never overwritten with blanks.

---

============================================================
SECTION 35 — PROTECTED / SENSITIVE MODULES
============================================================

The following modules are **STRICTLY PROTECTED**. Do NOT modify them without explicit user authorization:

1. **Authentication & Session Tokens (`server/src/middleware/auth.js`, `token.js`):** Enforces cryptographic JWT verification and user hydration. Modifying this risks systemic authentication vulnerabilities.
2. **Role-Based Access Control (`authorize` middleware):** Enforces security isolation between Admin and Employee roles.
3. **Custody & Transfer Transaction Engine (`assignmentController.js`, `assignmentRepository.js`):** Manages atomic custody handovers, return state transitions, and counter increments. Any regression causes inventory count drift and broken audit trails.
4. **Immutable Audit Logging (`AuditLog.js`, `auditRepository.js`):** Must remain strictly write-only and tamper-proof.
5. **Physical Asset Tag & QR Matrix Generator (`tagPdfGenerator.js`, `qrGenerator.js`):** Generates exact 4" x 2" 300 DPI barcode sticker layouts. Dimensional or payload changes break barcode scanner recognition.
6. **Official Handover Slip PDF Layouts (`exportService.js`):** Contains official institutional wording, AAI banners, and dual signature blocks.
7. **Global CSS Design System (`client/src/index.css`):** Contains 2,680+ lines of carefully calculated dual-theme tokens, drawer grids, and responsive breakpoints. Never replace with TailwindCSS or another utility framework.

---

============================================================
SECTION 36 — ENVIRONMENT CONFIGURATION
============================================================

Template environment structure based on `server/.env.example`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://[REDACTED]:[REDACTED]@cluster0.nbn5vmh.mongodb.net/aai_ams?retryWrites=true&w=majority
JWT_SECRET=[REDACTED]
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

*All database credentials, passwords, and cryptographic keys are strictly redacted in this document.*

---

============================================================
SECTION 37 — HOW TO RUN THE PROJECT
============================================================

Commands verified from `package.json` files:

### 1. Install Dependencies
```bash
# Root directory
npm install

# Backend dependencies
cd server && npm install

# Frontend dependencies
cd ../client && npm install
```

### 2. Run in Development Mode
```bash
# Option A: From root directory
npm run server:dev   # Starts backend on http://localhost:5000 via node --watch
npm run client       # Starts frontend on http://localhost:5173 via vite

# Option B: In separate terminals
# Terminal 1 (Backend):
cd server
npm run dev

# Terminal 2 (Frontend):
cd client
npm run dev
```

### 3. Production Build
```bash
# Build frontend bundle
cd client
npm run build        # Generates optimized SPA distribution in client/dist
```

### 4. Execute Automated Test Suites
```bash
# Option A: From root directory
npm test

# Option B: Inside server directory
cd server
npm test
```

---

============================================================
SECTION 38 — CURRENT PROJECT STATUS
============================================================

| Area | Status | Evidence |
|---|---|---|
| **Backend API** | Implemented & Operational | Express server, 17 controllers, health endpoint passing |
| **Frontend UI** | Implemented & Operational | 11 pages, responsive dual-theme, Vite build passes (exit code 0) |
| **Database Tier** | Implemented & Operational | 19 Mongoose schemas, Atlas cluster connection with test memory fallback |
| **Authentication** | Implemented & Operational | JWT issuance, bcrypt hashing, `auth.test.js` passing |
| **RBAC Governance** | Implemented & Operational | `authorize()` on all mutating endpoints, `phase13_rbac_governance.test.js` passing |
| **Asset Inventory** | Implemented & Operational | CRUD, 9-section drawer, multi-facet filtering, `asset.test.js` passing |
| **Master Data Catalog** | Implemented & Operational | Makes, Models, Technologies with collation uniqueness, `phase1_master_catalog.test.js` passing |
| **Excel Ingestion** | Implemented & Operational | Multi-sheet parsing, decryption, reconciliation, `phase4_excel_alignment.test.js` passing |
| **Document Generation** | Implemented & Operational | PDFKit handover slips, 300 DPI QR stickers, `enterprise_documents.test.js` passing |
| **Audit Logging** | Implemented & Operational | Immutable audit trail, `audit_fixes.test.js` passing |
| **Automated Tests** | Verified Passing | 34 test files, 360 tests passing in latest reported full run |
| **Production Build** | Verified Passing | `vite build` completed cleanly (dist created, exit code 0) |

---

============================================================
SECTION 39 — KNOWN LIMITATIONS & CONSTRAINTS
============================================================

1. **In-Memory Rate Limiter:** The rate limiting middleware (`rateLimiter.js`) stores IP hit counters in local Node.js memory rather than Redis. This is intentional for single-instance deployments, but counters reset upon server restart.
2. **Frontend Large Bundle Notice:** Because `AssetInventory.jsx` (189KB) and `BulkImportExport.jsx` (116KB) contain comprehensive client-side inspection and modal state, Vite displays a chunk size advisory during production build (`>500 kB`). This does not affect application functionality.
3. **Encrypted Spreadsheets Require User Password:** While password-protected Excel files can be decrypted transparently, the system does not attempt cryptographic brute-forcing; the user must provide the legitimate password.

---

============================================================
SECTION 40 — CURRENT MANUAL QA STATUS
============================================================

* **Manual browser QA is pending.**
* All evidence in this report is derived strictly from static code analysis, database schema inspections, API route audits, and automated test suite verifications.

---

============================================================
SECTION 41 — FUTURE DEVELOPMENT GUIDANCE
============================================================

1. **Always Inspect Existing Code First:** Never assume file contents or rewrite working components.
2. **Preserve Normalized String Storage:** Do not convert `make`, `model`, or `technology` into ObjectIds on the `Asset` model.
3. **Preserve Non-Destructive Ingestion:** Never allow empty Excel cells to overwrite existing database values during bulk imports.
4. **Preserve Custody Ledger Integrity:** Never bypass `AssetAssignment` creation when updating asset custody.
5. **Preserve Document Standards:** Do not alter legal PDF layouts or QR tag dimensions without explicit administrative approval.
6. **Maintain CSS Variable System:** Do not introduce TailwindCSS or competing utility frameworks.
7. **Write Tests for New Features:** Always create dedicated test suites under `server/test/` for any new backend capability.

---

============================================================
SECTION 42 — AI DEVELOPMENT RULES
============================================================

Any AI assistant continuing work on this project must adhere to these directives:
1. **Inspect before modifying.** Read relevant source files before proposing changes.
2. **Make minimal, surgical changes.** Never rewrite an entire file when a targeted edit suffices.
3. **Never break backward compatibility.** Adhere to the constraints in Section 34.
4. **Do not remove or weaken tests.** All 360 regression tests must continue passing.
5. **Never disable validation or bypass RBAC.** Maintain all Zod schemas and role guards.
6. **Never expose secrets.** Keep credentials redacted.
7. **Do not modify protected modules.** Honor the boundaries established in Section 35.
8. **Report test outcomes honestly.** Distinguish between actual test execution and static code reviews.

---

============================================================
SECTION 43 — IMPORTANT IMPLEMENTATION DETAILS
============================================================

1. **User Model Schema Lowercasing:** In `User.js`, `username` has `{ lowercase: true }`. Demo user `Admin` is stored as `admin`, and `Employee01` is stored as `employee01`. `findByCredential()` automatically lowercases credentials before querying.
2. **Demo Accounts Seeding:** Seeded idempotently on startup in development mode:
   - Administrator: Username `admin` | Password `Admin@123` | Role `ADMIN`
   - Employee: Username `employee01` | Password `Employee@123` | Role `EMPLOYEE` (linked to `AAI-EMP-01`)
3. **Express Route Order Sensitivity in `exportRoutes.js`:** The specific route `/handover/asset/:assetId/pdf` is mounted **before** `/handover/:assignmentId/pdf`. If inverted, Express captures the literal string `"asset"` as `:assignmentId`, routing requests to the wrong controller.
4. **Global Fetch Interceptor Flag:** Patched onto `window.fetch` using guard `window._aaiFetchPatched` to prevent duplicate proxy wrapping in React StrictMode.
5. **Verification Campaign Disclaimer:** Schema field `notes` default: `"Technically Recommended — Business Confirmation Required for final institutional protocol"`.

---

============================================================
SECTION 44 — AI QUICK REFERENCE
============================================================

* **PROJECT:** Airports Authority of India (AAI) Asset Management System (AAI-AMS)
* **FRONTEND:** React 19, Vite, React Router v7, SheetJS (XLSX), Lucide React, Vanilla CSS Design System
* **BACKEND:** Node.js Express 4.x (ES Modules), Mongoose 8.x, Zod 3.x, PDFKit, QRCode, Multer
* **DATABASE:** MongoDB Atlas (Dev/Prod) with MongoMemoryServer (Automated Tests)
* **MAIN ASSET API:** `GET/POST /api/v1/assets`, `GET/PUT/DELETE /api/v1/assets/:id`
* **MASTER DATA API:** `GET /api/v1/master/makes`, `/models`, `/technologies`, `/categories`, `/departments`
* **AUTH API:** `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`
* **RBAC ROLES:** `ADMIN` (Full System Authority) and `EMPLOYEE` (Personal Custody & Tickets)
* **CORE MODELS:** `Asset`, `AssetAssignment`, `AssetRelationship`, `Make`, `Model`, `Technology`, `Employee`, `User`, `Complaint`, `VendorAMC`, `VerificationCampaign`, `AuditLog`, `ExcelFieldConfig`
* **CORE PAGES:** `AssetInventory.jsx`, `EnterpriseInventory.jsx`, `AssetTransfers.jsx`, `BulkImportExport.jsx`, `ComplaintDesk.jsx`, `EmployeeDirectory.jsx`, `Dashboard.jsx`, `AuditLogs.jsx`
* **CORE SERVICES:** `importService.js`, `exportService.js`, `dataReconciliationService.js`, `columnMappingService.js`, `excelFieldService.js`
* **TEST COMMAND:** `npm test` (34 test files, 360 passing tests in latest full run)
* **BUILD COMMAND:** `npm run client:build` (`vite build`)
* **PROTECTED MODULES:** Auth, RBAC, Custody Transactions, Audit Logs, QR/PDF Generators, CSS Design Tokens
* **CURRENT POSITION:** Phases 1–5 complete; fully operational; manual browser QA pending

---

============================================================
SECTION 45 — FINAL AI HANDOFF
============================================================

# END OF PROJECT CONTEXT

Any AI receiving this document should first use this context to understand the existing AAI Asset Management System. Before proposing code changes, inspect the relevant current source files and verify that the implementation still matches this document. If this document conflicts with the current repository, the current repository is the source of truth and the discrepancy should be reported.
