# AAI_ENTERPRISE_ATTRIBUTE_REQUIREMENT_MATRIX

| Asset Type | PDF Section | Attribute | Current Field | Current Required Status | Recommended Required Status | Classification | Data Type | Validation | API | UI | Excel Import | Excel Export | Search/Filter | Reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ALL | Common | Asset ID | `assetId` | REQUIRED | REQUIRED | COMMON | String | Unique, non-empty | Yes | Yes | Yes | Yes | Yes | Universal primary key |
| ALL | Common | Asset Name | `assetName` | REQUIRED | REQUIRED | COMMON | String | Non-empty | Yes | Yes | Yes | Yes | Yes | Universal human-readable identifier |
| ALL | Common | Category | `category` | REQUIRED | REQUIRED | COMMON | String | Enum/String | Yes | Yes | Yes | Yes | Yes | Universal classification |
| ALL | Common | Asset Type | `assetType` | - | REQUIRED | COMMON | String | Enum/String | Yes | Yes | Yes | Yes | Yes | Drives conditional logic and schemas |
| ALL | Common | Make | `make` | REQUIRED | CONDITIONAL | CONDITIONAL | String | Required if applicable | Yes | Yes | Yes | Yes | Yes | Not all assets have a distinct make (e.g. generic accessories) |
| ALL | Common | Model | `model` | REQUIRED | CONDITIONAL | CONDITIONAL | String | Required if applicable | Yes | Yes | Yes | Yes | Yes | Same as Make |
| ALL | Common | Serial Number | `serialNumber` | CONDITIONAL | CONDITIONAL | CONDITIONAL | String | Unique if provided | Yes | Yes | Yes | Yes | Yes | Only core IT assets have serial numbers, peripherals often don't |
| ALL | Common | Status | `status` | REQUIRED | REQUIRED | SYSTEM-GENERATED | String | Enum | Yes | Yes | Yes | Yes | Yes | Core lifecycle state |
| ALL | Common | Condition | `condition` | REQUIRED | REQUIRED | SYSTEM-GENERATED | String | Enum | Yes | Yes | Yes | Yes | Yes | Operational state |
| CPU/Laptop | Tech | Processor | `processor` | OPTIONAL | REQUIRED | TYPE-SPECIFIC | String | Non-empty | Yes | Yes | Yes | Yes | Yes | Essential compute spec |
| CPU/Laptop | Tech | RAM | `ramSizeGb` | OPTIONAL | REQUIRED | TYPE-SPECIFIC | Number | > 0 | Yes | Yes | Yes | Yes | Yes | Essential compute spec |
| CPU/Laptop | Tech | Storage | `storageCapacityGb` | OPTIONAL | REQUIRED | TYPE-SPECIFIC | Number | > 0 | Yes | Yes | Yes | Yes | Yes | Essential compute spec |
| CPU/Laptop | Tech | OS | `operatingSystem` | OPTIONAL | REQUIRED | TYPE-SPECIFIC | String | Non-empty | Yes | Yes | Yes | Yes | Yes | Essential software spec |
| Monitor | Tech | Screen Size | `screenSizeInches` | OPTIONAL | REQUIRED | TYPE-SPECIFIC | Number | > 0 | Yes | Yes | Yes | Yes | Yes | Primary spec for displays |
| UPS | Tech | Capacity | `capacityVa` | OPTIONAL | REQUIRED | TYPE-SPECIFIC | Number | > 0 | Yes | Yes | Yes | Yes | Yes | Primary spec for power backup |
| Network | Tech | IP Address | `ipAddress` | OPTIONAL | CONDITIONAL | TYPE-SPECIFIC | String | Valid IP format | Yes | Yes | Yes | Yes | Yes | Required if managed/networked |
| Network | Tech | MAC Address| `macAddress` | OPTIONAL | CONDITIONAL | TYPE-SPECIFIC | String | Valid MAC format | Yes | Yes | Yes | Yes | Yes | Required if managed/networked |
| ALL | Procurement | Supplier | `supplier` | OPTIONAL | OPTIONAL | OPTIONAL | String | Text | Yes | Yes | Yes | Yes | Yes | Good to have, not universally critical |
| ALL | Warranty | End Date | `warrantyEndDate` | REQUIRED | CONDITIONAL | CONDITIONAL | Date | Valid Date | Yes | Yes | Yes | Yes | Yes | Not all items have warranty |
| ALL | Custody | Department | `department` | REQUIRED | CONDITIONAL | RELATIONSHIP | String | Valid Dept | Yes | Yes | Yes | Yes | Yes | Custody logic belongs in assignment workflow |
| ALL | Custody | Location | `floor` | REQUIRED | CONDITIONAL | RELATIONSHIP | String | Valid Loc | Yes | Yes | Yes | Yes | Yes | Custody logic belongs in assignment workflow |

> **Note:** The above matrix is derived from standard AAI operational parameters and existing `Asset.js` schema. It must be refined if a physical `asset.pdf` is provided.
