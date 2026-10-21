# AAI_LEGACY_13_TO_ENTERPRISE_MAPPING

| Legacy Field # | Legacy Field | Current Meaning | New Enterprise Group | New Field | Required Status | Backward Compatibility | Notes |
|---|---|---|---|---|---|---|---|
| 1 | `userName` | Current Custodian Name | Custody / Assignment | `currentEmployeeName` / Assignment | CONDITIONAL | 100% | Custody fields should not be strictly required on asset creation (can be unassigned) |
| 2 | `designation`| Custodian Designation | Custody / Assignment | `currentDesignation` | CONDITIONAL | 100% | Sourced from Employee Master |
| 3 | `department` | Custodian Department | Custody / Assignment | `department` | CONDITIONAL | 100% | Represents current location/department |
| 4 | `floor` | Physical Location | Custody / Assignment | `floor` | CONDITIONAL | 100% | Represents physical state |
| 5 | `employeeId` | Custodian ID | Custody / Assignment | `currentEmployeeId` | CONDITIONAL | 100% | Primary key for custody mapping |
| 6 | `assetName` | Equipment Descriptor | Common Information | `assetName` | REQUIRED | 100% | Core identifier |
| 7 | `make` | Manufacturer | Common Information | `make` | CONDITIONAL | 100% | Conditionally required based on Asset Type |
| 8 | `model` | Hardware Model | Common Information | `model` | CONDITIONAL | 100% | Conditionally required based on Asset Type |
| 9 | `serialNumber`| Service Tag/Chassis | Common Information | `serialNumber` | CONDITIONAL | 100% | Not all assets have serial numbers |
| 10 | `installDate` | Commissioning Date | Procurement/Lifecycle | `installDate` | OPTIONAL | 100% | Sometimes unknown for legacy assets |
| 11 | `warrantyEndDate`| Expiry Date | Warranty/AMC | `warrantyEndDate` | CONDITIONAL | 100% | Should be required only if warranty applicable |
| 12 | `operatingSystem`| OS Version | Tech: CPU/Laptop | `operatingSystem` | CONDITIONAL | 100% | Required ONLY for compute devices |
| 13 | `remarks` | Operational Notes | Common Information | `remarks` | OPTIONAL | 100% | Free text observation |

**Conclusion on 13 Fields:**
The legacy 13 fields perfectly map to the new Enterprise Attribute Framework. By changing their rigid "REQUIRED" status to the appropriate "CONDITIONAL", "OPTIONAL", or "RELATIONSHIP" status based on context and `Asset Type`, the system will support diverse assets without breaking compatibility with legacy Excel sheets or API endpoints.
