# AAI_ENTITY_WORKFLOW_RELATIONSHIP_AUDIT

## 1. USER ➔ EMPLOYEE ➔ ASSIGNMENT/CUSTODY ➔ ASSET ➔ INVENTORY

**Workflow:** Registration and Assignment
- **SOURCE:** User input / Employee Master Data
- **TARGET:** Asset Collection (Custody fields), Assignment History Collection
- **READ:** Employee Master, User Permissions, Asset Model
- **WRITE:** Assignment History, Asset (Updating current custodian fields)
- **HISTORY:** Yes, all assignments generate a persistent history record.
- **CURRENT STATE:** Asset holds denormalized `currentEmployeeId`, `currentEmployeeName`, etc.
- **DEPENDENT VIEW:** Inventory projection relies on Asset current state. Employee dashboard relies on Asset collection queried by `currentEmployeeId`.
- **RISK:** If Asset Schema forces 13 fields (including custody) to be required at creation, it breaks the possibility of having unassigned assets (Godown). Custody must be treated as a relationship, not a hardcoded required text field on the Asset.

## 2. ASSET ➔ RELATIONSHIPS ➔ COMPONENTS

**Workflow:** Asset Compositions (e.g. PC + Monitor + UPS)
- **SOURCE:** Asset Management UI
- **TARGET:** Asset Collection (Relationships)
- **READ:** Compatible Asset Types
- **WRITE:** Relationship linking (Parent ➔ Child)
- **HISTORY:** Limited currently.
- **CURRENT STATE:** Assets are often flattened into single rows (e.g. CPU with Monitor fields) leading to messy schemas.
- **DEPENDENT VIEW:** Asset Detail Page.
- **RISK:** Enforcing Monitor fields on a CPU asset, or vice versa. Proper component relationships solve this.

## 3. TRANSFER ➔ CUSTODY CHANGE ➔ INVENTORY CHANGE ➔ EMPLOYEE ASSET VIEW CHANGE ➔ AUDIT

**Workflow:** Transferring an asset between employees.
- **SOURCE:** Employee A / Admin
- **TARGET:** Asset Collection, Assignment History
- **READ:** Current Asset, Employee B (Target)
- **WRITE:** Asset (Overrides `currentEmployeeId`, `currentEmployeeName`, `floor`), Assignment History (Logs Transfer)
- **HISTORY:** Yes, immutable audit trail.
- **CURRENT STATE:** Employee A loses visibility; Employee B gains visibility.
- **DEPENDENT VIEW:** Both Employee Dashboards and Global Inventory instantly reflect the custody change.
- **RISK:** Do not treat a transfer as editing the Employee Master record. It is purely an update to the Assignment relationship and the denormalized custody fields on the Asset. The transfer must NOT require re-validating static IT fields (like CPU type) unless specifically intended.

## 4. RETURN ➔ CUSTODY REMOVAL ➔ INVENTORY CHANGE ➔ HISTORY

**Workflow:** Returning an asset to Godown/IT Pool.
- **SOURCE:** Employee / Admin
- **TARGET:** Asset Collection
- **READ:** Current Asset
- **WRITE:** Asset (Nullifies `currentEmployeeId` and related fields, changes Status to AVAILABLE/GODOWN)
- **HISTORY:** Yes, assignment closure.
- **CURRENT STATE:** Asset is unassigned.
- **DEPENDENT VIEW:** Employee Dashboard drops the asset. Inventory shows Available.
- **RISK:** A returned asset lacks custodian fields. If the "13 Mandatory Fields" strict validation requires `department` and `floor` and `userName`, a returned asset will fail validation. Custody fields must be conditional.
