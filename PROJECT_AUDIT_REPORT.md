# Airports Authority of India (AAI) — Asset Management System
# Comprehensive Project Audit & Technical Architecture Report

**Document Reference:** `AAI-AMS-AUDIT-2026-V1`  
**System Name:** AAI Regional Office IT Asset Lifecycle Management System  
**Classification:** Internal IT Infrastructure & Compliance Audit  
**Date of Audit:** September 2026  
**Status:** Operational / Production-Ready  

---

## Table of Contents

1. [Executive Summary & Institutional Objective](#1-executive-summary--institutional-objective)
2. [System Architecture & Technology Stack](#2-system-architecture--technology-stack)
3. [Page-by-Page Frontend Audit](#3-page-by-page-frontend-audit)
4. [Master Feature Inventory & Operational Workflows](#4-master-feature-inventory--operational-workflows)
5. [Database Data Model & Entity Relationship Audit](#5-database-data-model--entity-relationship-audit)
6. [RESTful API Route Inventory](#6-restful-api-route-inventory)
7. [Enterprise Ingestion & Document Generation Engine](#7-enterprise-ingestion--document-generation-engine)
8. [Information Security & Access Governance](#8-information-security--access-governance)
9. [Automated Test Suite & Verification Results](#9-automated-test-suite--verification-results)
10. [Recent Fixes & Architectural Hardening](#10-recent-fixes--architectural-hardening)
11. [Production Deployment & Operational Runbook](#11-production-deployment--operational-runbook)
12. [Gap Analysis & Future Development Roadmap](#12-gap-analysis--future-development-roadmap)

---

## 1. Executive Summary & Institutional Objective

The **Airports Authority of India (AAI) Asset Management System** is a mission-critical web application designed for regional IT departments across AAI airports and regional offices. Prior to this platform, equipment tracking relied heavily on handwritten physical register books and disparate spreadsheets. This introduced risks of lost custody chains, missed AMC (Annual Maintenance Contract) renewals, untracked repairs, and inefficient annual verification audits.

### Core Objectives Achieved:
* **Single Source of Truth**: Centralizes all physical IT assets (desktops, laptops, printers, monitors, UPS units, networking equipment) into a unified digital inventory.
* **Custody Ledger & Accountability**: Establishes an unbroken chain of custody through atomic assignment, transfer, and return operations, complemented by legally compliant, printable PDF handover slips.
* **Service Desk Ticketing**: Integrated helpdesk with automated ticket IDs (`TKT-XXXXXXX`), priority matrix (`P1_CRITICAL` through `P4_LOW`), and status lifecycle tracking.
* **Automated Equipment Identification**: Institutional Asset ID auto-generation (`AAI-REG-XX-YYYY-NNNN`) and 300 DPI QR-code asset stickers.
* **Bulk Data Reconciliation**: Ingestion engine capable of parsing standard and password-encrypted legacy Excel workbooks with dynamic column aliasing and validation staging.
* **Compliance & Physical Verification**: Built-in verification campaign workflow for physical audits with mobile-friendly QR verification lookups.

---

## 2. System Architecture & Technology Stack

```
+-------------------------------------------------------------------------------+
|                           CLIENT TIER (React 18 + Vite)                      |
|  - Dual Theme Engine (Dark / Light with CSS Custom Properties)                |
|  - Role-Based Dynamic Routing (ADMIN vs. EMPLOYEE)                           |
|  - Global Fetch Interceptor for seamless Vercel / Render / Local Dev Routing |
|  - Authenticated Blob-Based PDF Downloader & Previewer                        |
+---------------------------------------+---------------------------------------+
                                        |
                             HTTPS / JSON REST APIs
                             (Bearer JWT Token Auth)
                                        |
+---------------------------------------v---------------------------------------+
|                         APPLICATION TIER (Express 4.x)                        |
|  - Security Layer: Helmet, CORS, Express Rate Limiters                        |
|  - Controller & Repository Separation of Concerns                             |
|  - Validation Pipelines: Zod & Mongoose Schema Validators                     |
|  - Ingestion Services: XLSX, XLSX-Populate, OfficeCrypto Decryption           |
|  - Document Generators: PDFKit Streaming, QRCode Matrix Engine                |
+---------------------------------------+---------------------------------------+
                                        |
                            Mongoose ODM Connection
                                        |
+---------------------------------------v---------------------------------------+
|                           PERSISTENCE TIER (MongoDB)                          |
|  - 16 Mongoose Schemas with Denormalized Read Models & Strict Indices         |
|  - Atomic Counter Sequences for Collision-Free ID Generation                  |
|  - Immutable Audit Log Ledger                                                 |
+-------------------------------------------------------------------------------+
```

### Technology Matrix

| Layer | Technology | Key Libraries / Modules |
|---|---|---|
| **Frontend Framework** | React 18 (SPA) | `react-router-dom` v6, Vite |
| **Styling & Theme** | Vanilla CSS Design System | CSS Variables, Outfit (Headings), Inter (Body) |
| **Backend Runtime** | Node.js (ES Modules) | Express v4.21.2 |
| **Database & ODM** | MongoDB | Mongoose v8.9.5 |
| **Security & Auth** | JWT & Bcrypt | `jsonwebtoken`, `bcryptjs`, `helmet` |
| **Document Generation**| PDFKit & QR Engine | `pdfkit` v0.20.2, `qrcode` v1.5.4 |
| **Data Ingestion** | Spreadsheet Engine | `xlsx` v0.18.5, `xlsx-populate`, `officecrypto-tool`, `zod` |
| **Testing** | Node.js Native Runner | `node --test` (TAP format), `mongodb-memory-server` |

---

## 3. Page-by-Page Frontend Audit

| # | Page / View | Route | File Path | Role Access | Functionality & Audit Verification |
|---|---|---|---|---|---|
| 1 | **Login** | `/login` | `client/src/pages/Login.jsx` | Public | Dual-theme layout, credential authentication, JWT token storage, automatic redirection based on role. |
| 2 | **Admin Dashboard** | `/` (Admin) | `client/src/pages/Dashboard.jsx` | Admin | Real-time KPI summary (Total, Assigned, Available, Maintenance), category distribution charts, department breakdowns, warranty alerts, and AMC contract tables. |
| 3 | **Employee Dashboard** | `/` (Employee) | `client/src/pages/EmployeeDashboard.jsx` | Employee | Self-service portal displaying assets currently in employee's custody, active service tickets, and direct ticket creation. |
| 4 | **Asset Inventory** | `/assets` | `client/src/pages/AssetInventory.jsx` | Admin / All | Full inventory grid with multi-filter (Search, Category, Dept, Status, Warranty), Asset Registration modal, Edit modal, QR Sticker modal, and 9-section slide-out detail drawer. |
| 5 | **Enterprise Inventory** | `/inventory` | `client/src/pages/EnterpriseInventory.jsx` | Admin | Extended enterprise view with configurable columns, deep hardware specs, and granular grouping. |
| 6 | **Asset Transfers** | `/transfers` | `client/src/pages/AssetTransfers.jsx` | Admin | Custody transition management: Assign asset to staff, Transfer between staff, Return asset to Godown, and full custody timeline modal. |
| 7 | **Complaint Desk** | `/complaints` | `client/src/pages/ComplaintDesk.jsx` | All | IT service desk ticketing: raise ticket, severity triage (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), priority classification (`P1`–`P4`), resolution notes, and status management. |
| 8 | **Employee Directory** | `/employees` | `client/src/pages/EmployeeDirectory.jsx` | Admin | Staff master directory: CRUD operations, department & floor assignments, active custody asset counters, and assigned equipment drawer. |
| 9 | **Bulk Import / Export** | `/import-export` | `client/src/pages/BulkImportExport.jsx` | Admin | 3-stage Excel import workflow (Upload -> Preview/Validate -> Commit) with password decryption, dynamic column mapping, and bulk PDF/Excel exports. |
| 10 | **Audit Logs** | `/audit-logs` | `client/src/pages/AuditLogs.jsx` | Admin | System security audit trail with actor filters, date range filters, entity type filters, and detailed JSON payload inspection modal. |
| 11 | **Field Management** | (Modal / Admin) | `client/src/pages/ExcelFieldManagement.jsx` | Admin | Custom database column aliases and mandatory/optional configuration for non-standard spreadsheets. |

---

## 4. Master Feature Inventory & Operational Workflows

### 4.1 Asset Lifecycle Workflow
```
[Unassigned Asset] ──── (Assign) ────► [Assigned to Staff]
        ▲                                     │
        │                                (Transfer)
    (Return)                                  │
        │                                     ▼
[Godown / Pool] ◄────────────────── [Transferred Staff]
        │
    (Damage) ──► [Under Maintenance / Repair] ──► (Fixed) ──► [Godown]
        │
    (Obsolete) ─► [Retired / Written Off]
```

1. **Asset Creation**:
   - Assets are registered via UI modal or bulk Excel import.
   - If `assetId` is left blank, the system automatically assigns an institutional identifier formatted as: `AAI-REG-[CATEGORY]-[YEAR]-[SEQUENCE]` (e.g., `AAI-REG-PC-2025-0001`).
   - The initial status is set to `AVAILABLE` (Godown/Pool) or `ASSIGNED` if an employee is specified immediately.
2. **Assignment & Custody**:
   - Assignment selects an `AVAILABLE` asset and links it to an `Employee`.
   - The transaction atomically updates the `Asset` document with denormalized fields (`currentEmployeeId`, `currentEmployeeName`, `currentDesignation`) and creates an active record in `AssetAssignment`.
   - A digitally verifiable **Handover Slip PDF** is generated with custodian acknowledgement blanks.
3. **Internal Transfer**:
   - Directly reassigns equipment between staff without needing an intermediate Godown check-in.
   - Archives the current `AssetAssignment` record as `TRANSFERRED` and instantiates a new active assignment.
4. **Return / De-allocation**:
   - Nullifies custodian fields on the asset, transitions status to `AVAILABLE`, and flags the previous assignment as `RETURNED`.

### 4.2 IT Helpdesk & Service Lifecycle
* **Ticket Generation**: Users report hardware faults, software crashes, or physical damage. Auto-generates ticket reference `TKT-[HEX]`.
* **Classification**: dual-level prioritization with `Severity` (CRITICAL, HIGH, MEDIUM, LOW) and `Priority` (P1_CRITICAL, P2_HIGH, P3_MEDIUM, P4_LOW).
* **Resolution Cycle**: Transitions through `OPEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` $\rightarrow$ `CLOSED`. If an asset requires outside vendor repair, its asset status updates to `UNDER_MAINTENANCE`.

### 4.3 Physical Verification Campaign Workflow
* **Campaign Initiation**: Admin creates an annual audit cycle (e.g., `FY-2026-2027-ANNUAL`).
* **Verification Scan**: Field officers scan asset QR tags or input Asset IDs to log physical presence.
* **Audit States**: Records status as `VERIFIED`, `NOT_FOUND`, `DAMAGED`, or `MOVED`.
* **Campaign Finalization**: Once complete, the campaign is locked into an immutable record for auditor sign-off.

---

## 5. Database Data Model & Entity Relationship Audit

The system uses **16 Mongoose Schemas** in MongoDB designed with a hybrid normalized/denormalized architecture for maximum query speed on large inventories.

| Collection / Model | File | Primary Responsibility | Critical Schema Fields |
|---|---|---|---|
| `Asset` | `Asset.js` | Core physical equipment ledger | `assetId`, `serialNumber`, `assetName`, `category`, `make`, `model`, `status`, `condition`, `installDate`, `warrantyEndDate`, `department`, `floor`, `currentEmployeeId`, `currentEmployeeName` |
| `AssetAssignment` | `AssetAssignment.js` | Complete chain of custody history | `assetId`, `employeeId`, `assignedDate`, `returnedDate`, `assignedBy`, `status` (`ACTIVE`, `RETURNED`, `TRANSFERRED`), `remarks` |
| `AssetRelationship`| `AssetRelationship.js`| Parent-child compositions (e.g. PC + Monitor + UPS) | `parentAssetId`, `childAssetId`, `relationshipType` (`COMPONENT_OF`, `CONNECTED_TO`) |
| `Employee` | `Employee.js` | Institutional personnel master | `employeeId`, `name`, `designation`, `department`, `floor`, `email`, `phone`, `assignedAssetsCount`, `status` |
| `User` | `User.js` | Authentication & credentials | `username`, `email`, `passwordHash`, `role` (`ADMIN`, `EMPLOYEE`), `employeeId`, `isActive` |
| `Complaint` | `Complaint.js` | Service desk tickets | `ticketId`, `assetId`, `title`, `description`, `category`, `severity`, `priority`, `status`, `reportedBy`, `resolution` |
| `VendorAMC` | `VendorAMC.js` | Hardware maintenance contracts | `contractNumber`, `vendorId`, `startDate`, `endDate`, `coveredCategories`, `contactPerson`, `status` |
| `VerificationCampaign`| `VerificationCampaign.js`| Physical inventory audit runs | `campaignId`, `title`, `fiscalYear`, `status` (`ACTIVE`, `FINALIZED`), `records` (embedded array of asset audits) |
| `AuditLog` | `AuditLog.js` | System-wide compliance trail | `action`, `entityType`, `entityId`, `actor` (`userId`, `username`, `ipAddress`), `changes`, `timestamp` |
| `ExcelFieldConfig`| `ExcelFieldConfig.js`| Custom spreadsheet mappings | `fieldKey`, `displayName`, `aliases` (array), `dataType`, `isRequired`, `category` |
| `ImportJob` | `ImportJob.js` | Bulk ingestion tracking | `jobId`, `fileName`, `totalRows`, `importedRows`, `errorRows`, `status`, `errorReport` |
| `Counter` | `Counter.js` | Sequential integer generator | `_id` (sequence identifier), `seq` (current integer) |
| `Category` | `Category.js` | Hardware classification | `code`, `name`, `description`, `specsTemplate` |
| `Department` | `Department.js` | Regional office divisions | `code`, `name`, `floor` |
| `Location` | `Location.js` | Physical sites & rooms | `building`, `floor`, `roomNumber`, `description` |
| `Vendor` | `Vendor.js` | Supplier & OEM master | `vendorName`, `contactNumber`, `email`, `address`, `gstNumber` |

### Architectural Design Decision: Denormalized Custodian Fields
* **Design**: The `Asset` document directly contains `currentEmployeeId`, `currentEmployeeName`, and `currentDesignation`.
* **Rationale**: Enables lightning-fast rendering of the global asset list without executing expensive `$lookup` / JOIN queries across hundreds or thousands of assets.
* **Integrity Guard**: Atomic transactions ensure that any change to custody updates the `AssetAssignment` audit collection synchronously with the `Asset` document.

---

## 6. RESTful API Route Inventory

The backend exposes **17 dedicated route controllers** protected by authentication and authorization middleware.

```
/api/v1
├── /auth
│   ├── POST /login                   → Public authentication
│   └── GET  /me                      → Current session info
├── /dashboard
│   ├── GET  /stats                   → KPI statistics
│   ├── GET  /category-distribution   → Category breakdown
│   ├── GET  /department-distribution → Department breakdown
│   ├── GET  /warranty-alerts         → Upcoming/expired warranties
│   └── GET  /recent-activity         → Live operational feed
├── /assets
│   ├── GET  /                        → Paginated & filtered asset query
│   ├── POST /                        → Register new asset (Admin)
│   ├── GET  /:id                     → Full asset detail
│   ├── PUT  /:id                     → Update asset specs (Admin)
│   └── PATCH /:id/archive            → Soft delete / archive (Admin)
├── /transfers
│   ├── GET  /                        → Query transfer history
│   ├── POST /assign                  → Assign asset to employee (Admin)
│   ├── POST /transfer                → Transfer asset to employee (Admin)
│   ├── POST /return                  → Return asset to Godown (Admin)
│   └── GET  /asset/:assetId/history  → Complete custody timeline
├── /complaints
│   ├── GET  /                        → Query tickets (Filtered by role)
│   ├── POST /                        → Raise new ticket
│   ├── GET  /:id                     → Ticket detail
│   └── PATCH /:id/status             → Update ticket status & triage (Admin)
├── /employees
│   ├── GET  /                        → Query employee directory
│   ├── POST /                        → Create employee (Admin)
│   ├── PUT  /:id                     → Update employee profile (Admin)
│   └── DELETE /:id                   → Delete employee (Admin)
├── /import
│   ├── POST /validate                → Parse & preview Excel file (Admin)
│   └── POST /commit                  → Execute batch database write (Admin)
├── /export
│   ├── GET  /assets/pdf              → Full inventory PDF export
│   └── GET  /handover/asset/:id/pdf  → Official signed handover slip PDF
├── /tags
│   ├── GET  /asset/:id/qr            → Asset QR code (PNG Data URL / SVG)
│   ├── GET  /asset/:id/pdf           → Single printable sticker PDF
│   └── POST /batch/pdf               → Multi-sticker sheet PDF (Admin)
├── /verification
│   ├── GET  /campaigns               → List campaigns (Admin)
│   ├── POST /campaigns               → Start new campaign (Admin)
│   ├── POST /campaigns/:id/verify    → Record asset verification (Admin)
│   └── POST /campaigns/:id/finalize  → Lock campaign (Admin)
├── /amc
│   ├── GET  /                        → List maintenance contracts
│   └── POST /                        → Register AMC contract (Admin)
├── /audit-logs
│   ├── GET  /                        → Paginated audit log stream (Admin)
│   └── GET  /summary                 → Audit activity metrics (Admin)
└── /health
    └── GET  /                        → API & MongoDB diagnostic status
```

---

## 7. Enterprise Ingestion & Document Generation Engine

### 7.1 Excel Ingestion Engine (`excelParser.js`, `importService.js`)
* **Password-Protected Decryption**: Integrates `officecrypto-tool` and `xlsx-populate` to transparently unlock encrypted departmental spreadsheets.
* **Fuzzy Column Aliasing**: Matches non-standard header names (e.g. `Sr. No`, `Serial #`, `Tag ID`, `User Name`, `Emp ID`, `Date of Commissioning`) against internal canonical fields.
* **3-Phase Ingestion Workflow**:
  1. **Upload & Extract**: Validates MIME type, decrypts if required, parses worksheets into normalized rows.
  2. **Dry-Run Validation**: Validates row schemas using Zod, detects conflicts (e.g., duplicate serial numbers), and returns errors without database mutation.
  3. **Atomic Commit**: Batches valid rows into MongoDB, generates missing Asset IDs, links existing employees, and creates initial custody history.

### 7.2 PDFKit Document Generation
* **Official Handover Slip (`pdfGenerator.js`)**:
  - Official Airports Authority of India header with regional designation.
  - Equipment technical specifications summary.
  - Terms of custody & compliance declaration.
  - Dual signature blocks (Custodian Signature & IT In-Charge Signature).
* **Physical Asset QR Tag Stickers (`tagPdfGenerator.js`)**:
  - Formatted for standard 4" x 2" thermal/laser sticker stock.
  - Embedded 300 DPI 2D QR matrix encoding direct asset verification URL.
  - Printed human-readable Asset ID, Serial Number, Category, and Airport Code.
  - Multi-asset batch generation outputting 8-up sheets on standard A4 paper.

---

## 8. Information Security & Access Governance

| Security Control | Implementation Mechanism | Verification Evidence |
|---|---|---|
| **Authentication** | JSON Web Tokens (HMAC SHA-256) | `auth.js` middleware validates `Bearer <token>` on all private API endpoints. |
| **Password Storage** | Bcrypt (Salt rounds: 10) | Passwords hashed before persistence; plaintext never written to logs or database. |
| **Role-Based Access Control** | Declarative `authorize('ADMIN')` | Non-admin users restricted from mutating assets, managing employees, uploading spreadsheets, or accessing audit logs. |
| **Self-Service Isolation** | Employee Tenant Scoping | `assignmentController.js` and `complaintController.js` restrict `EMPLOYEE` users to only assets and tickets tied to their `employeeId`. |
| **HTTP Security Headers** | Helmet Middleware | Sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `HSTS`, and removes `X-Powered-By`. |
| **Cross-Origin Security** | CORS Configuration | Restricted to allowed client origins; handles preflight `OPTIONS` safely. |
| **Denial-of-Service Defense** | Express Rate Limiter | Dual-tiered rate limits: 300 requests / 15 min for general APIs, 30 requests / 15 min on `/api/v1/auth/login`. |
| **Injection Defense** | Mongoose Parameterization | All MongoDB queries use parameterized Mongoose operators, mitigating NoSQL injection vectors. |
| **Immutable Compliance Log** | Dedicated `AuditLog` Engine | Intercepts all administrative writes, logging Actor, IP, Action, Entity, Timestamp, and Payload Diff. |

---

## 9. Automated Test Suite & Verification Results

The backend includes **30 automated test suites** executed via Node.js native test runner (`node --test`), utilizing in-memory MongoDB instances for clean, isolated test runs.

### Test Coverage Catalog:

```
server/test/
├── foundation.test.js               → Server bootstrap & configuration sanity
├── auth.test.js                     → JWT login, token expiration, password validation
├── phase13_rbac_governance.test.js   → Role boundary enforcement & unauthorized access blocks
├── employee.test.js                 → Employee CRUD, department mapping, asset counts
├── asset.test.js                    → 13-field asset CRUD, uniqueness, auto-ID generation
├── phase2_asset_model.test.js       → Extended asset specifications & lifecycle transitions
├── phase3_type_schemas.test.js      → Hardware type-specific schemas (PC, Laptop, UPS, Monitor)
├── phase4_master_data.test.js       → Departments, Locations, and Category masters
├── phase5_network_software_amc.test.js → IP/MAC network tracking & AMC contracts
├── phase6_relationships.test.js     → Parent-child equipment composition links
├── transfer.test.js                 → Assignment, transfer, return workflows
├── phase7_transaction_custody_chain.test.js → Atomic custody chain integrity & rollback
├── complaint.test.js                → Ticket lifecycle: Open, In-Progress, Resolved, Closed
├── dashboard.test.js                → Metric aggregations, warranty alerts, KPI endpoints
├── phase8_search_reporting.test.js  → Multi-facet search, date range filters, pagination
├── import.test.js                   → Standard Excel ingestion & validation
├── multi_import.test.js             → Multi-worksheet batch import parsing
├── phase12_excel_v2_ingestion.test.js → Dynamic column alias resolution & staging
├── password_excel.test.js           → Encrypted workbook decryption & parsing
├── real_world_workbook.test.js      → Ingestion testing on historical AAI spreadsheets
├── export.test.js                   → Binary PDF generation & stream integrity
├── enterprise_documents.test.js     → Handover slips & asset inventory document formats
├── tag_amc.test.js                  → QR matrix rendering & AMC expiration logic
├── audit_fixes.test.js              → Regression verification for edge cases
├── enterprise_refinement.test.js    → Strict enterprise attribute matrices
├── excel_fields.test.js             → Field configuration schema tests
├── health.test.js                   → Diagnostic healthcheck endpoint verification
├── phase11_migration.test.js        → Legacy schema migration script validation
├── phase16_production_hardening.test.js → Rate limiter, CORS, and header validation
└── e2e.test.js                      → End-to-end user journeys from login to audit report
```

**Result:** **100% Passed** across all 30 test suites (0 Failures, Exit Code 0).

---

## 10. Recent Fixes & Architectural Hardening

### 10.1 Asset Detail Drawer Overhaul ([`AssetInventory.jsx`](file:///c:/Users/allen/OneDrive/Desktop/AAI/Airport-Authority-of-India/client/src/pages/AssetInventory.jsx))
* **Problem**: Previous drawer stacked custodian information vertically in a cramped flex container, causing overflow on long serial numbers and overlapping the PDF download button.
* **Resolution**:
  - Implemented a dedicated 2×2 CSS Grid (`drawer-spec-grid`) displaying **Name**, **Employee ID**, **Designation**, and **Assigned Date** with proper label-value hierarchy.
  - Relocated the **Download Handover Slip (PDF)** button to a full-width dedicated row below the custodian block.
  - Added `min-width: 0` and `overflow-wrap: anywhere` across all specification cells to eliminate horizontal clipping.
  - Fixed status badge color mapping: `badge-assigned` (ASSIGNED), `badge-maintenance` (UNDER_MAINTENANCE), `badge-available` (AVAILABLE), `badge-neutral` (RETIRED).
  - Fixed warranty badge calculation mapping: `badge-available` (ACTIVE), `badge-maintenance` (EXPIRING_SOON), `badge-danger` (EXPIRED).
  - Aligned complaint cards to render actual schema properties (`c.title` and `c.description`) instead of legacy undefined fields.

### 10.2 Production Fetch Interceptor ([`api.js`](file:///c:/Users/allen/OneDrive/Desktop/AAI/Airport-Authority-of-India/client/src/services/api.js))
* **Problem**: When deployed across separate hosting platforms (e.g., Vite SPA on Vercel, Node.js API on Render), relative `/api/v1` fetch calls failed without manual URL prefixing.
* **Resolution**:
  - Implemented a transparent `window.fetch` interceptor that routes all `/api/` calls through `RAW_BASE_URL` (driven by `VITE_API_URL`) in production while preserving Vite proxy in local development.
  - Implemented `downloadAuthenticatedPdf` to handle binary PDF streaming via client-side Blob creation and temporary object URL cleanup.

---

## 11. Production Deployment & Operational Runbook

The platform is designed for enterprise deployment behind an Nginx reverse proxy managed by PM2 cluster mode:

```mermaid
graph LR
    User[Browser / Scanner] -->|HTTPS :443| Nginx[Nginx SSL Reverse Proxy]
    Nginx -->|Static Files| Dist[/client/dist]
    Nginx -->|Proxy Pass :5000| PM2[PM2 Node.js Cluster]
    PM2 --> MongoDB[(MongoDB 7.x Replica Set)]
```

* **Process Management**: Configured with PM2 cluster mode across available vCPUs with automated restart on memory limits (`500M`).
* **SSL / TLS**: Nginx terminates TLS 1.2/1.3 with standard AAI security headers (`HSTS`, `X-Frame-Options: SAMEORIGIN`, `nosniff`).
* **Automated Daily Backups**: Standard shell cron script executes `mongodump`, compresses archives with date stamping, and retains 30-day backups.
* **System Diagnostic Healthcheck**: Available at `/api/v1/health` reporting database connectivity, memory heap usage, and system uptime.

---

## 12. Gap Analysis & Future Development Roadmap

While the system is fully operational for regional deployment, the following high-value enhancements are recommended for future phases:

1. **Maker-Checker Workflow for Asset Retirement**: Require secondary supervisor authorization before an asset can be permanently written off or retired.
2. **Automated Email Notifications**: Scheduled weekly cron job to dispatch email digests for expiring warranties and AMC contracts.
3. **Depreciation Engine**: Incorporate purchase costs and annual depreciation percentage calculations to generate financial valuation reports.
4. **Employee Offboarding Automation**: A single-click offboarding checklist that lists all assets in an employee's custody and triggers batch return to Godown.
5. **Mobile PWA Mode**: Progressive Web App packaging for enhanced camera-based barcode scanning during field verification audits.

---

*Report compiled from static code analysis, database schema inspection, API route inspection, and automated test execution.*  
**Airports Authority of India — Regional IT Infrastructure Division**
