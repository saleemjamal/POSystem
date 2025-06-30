# POSystem - Procurement Management System

## Overview
This is a comprehensive **Procurement Management System** for **Poppat Jamals**, a retail chain with 5 outlets across India (Adyar, Mount Road, Anna Nagar, Coimbatore, Vijayawada). Built on Google Apps Script, it manages the complete procurement lifecycle from SKU analysis to goods receipt processing.

## Architecture
- **Platform**: Google Apps Script (JavaScript runtime)
- **Database**: Google Sheets (structured sheets as tables)
- **Storage**: Google Drive (PO archives in `/Purchase Orders/YYYY-MM/`)
- **UI**: HTML/CSS/JavaScript forms via Apps Script HTML Service
- **Authentication**: Google OAuth with role-based access control
- **Email**: Gmail API with professional HTML templates

## Project Structure

### Core System (`/src/core/`)
- **`main.js`**: Entry points, role-based menus, UI triggers
- **`constants.js`**: Configuration, thresholds, email templates
- **`helpers.js`**: Shared utility functions

### Authentication (`/src/auth/`)
- **`userRoles.js`**: Role definitions and permissions
- **`sheetProtection.js`**: Sheet-level access control

### Business Logic (`/src/business/`)
- **`classifySKUS.js`**: SKU performance analysis and binning recommendations
- **`poService.js`**: Purchase order lifecycle management
- **`customerOrderService.js`**: Customer order processing (new feature)
- **`grnService.js`**: Goods receipt processing
- **`grnAutoApproval.js`**: Automated GRN approval (60-min timer)
- **`sendPO.js`**: Email delivery and tracking
- **`binningLogic.js`**: Inventory quantity calculations
- **`poDbase.js`**: Data archiving to Drive

### User Interface (`/src/ui/`)
- **`createPOForm.html`**: Purchase order creation
- **`createGRNForm.html`**: Goods receipt entry
- **`createCOForm.html`**: Customer order creation
- **`help*.html`**: Role-specific documentation

### Testing (`/src/tests/`)
- **`poTests.js`**: PO system tests
- **`grnTests.js`**: GRN system tests
- **`coTests.js`**: Customer order tests

## Key Functionality

### 1. SKU Classification System
- Analyzes 180 days of activity data
- Classifications: Auto-ReOrder, Watch-List, Dead, New-Item
- Criteria: Revenue rank (70%), volume velocity (70%), time-on-shelf (150 days)
- Generates recommended quantities per SKU per outlet

### 2. Purchase Order Management
- **Workflow**: Created → Approved → Sent → Partially Received → Closed
- **Features**: Batch generation, PDF creation, email automation
- **Auto-closure**: 10 days after creation
- **Tracking**: Real-time status in `POTracking` sheet

### 3. Goods Receipt (GRN) Processing
- **Auto-approval**: 60 minutes after creation (hourly trigger)
- **Fulfillment calculation**: Updates PO completion percentages
- **Late delivery handling**: Status tracking and notifications

### 4. Customer Order Management
- **Purpose**: Handle orders when items are out-of-stock or customer needs large quantities
- **Workflow**: Manager creates CO → Sent to distributor → Distributor fulfills directly to customer
- **Multi-item support**: Complete line-item tracking with cost prices
- **Value-based approval**: Auto-approve under ₹10,000, manual approval for larger orders
- **Professional PDFs**: Same quality formatting as Purchase Orders
- **Email automation**: Immediate notification to distributors upon approval

## Data Model (Google Sheets)

### Primary Sheets
- **`POTracking`**: Master PO registry with fulfillment metrics
- **`GRNTracking`**: GRN transaction log with approval status
- **`SKUClassification`**: Product analysis and recommendations
- **`CustomerOrders`**: Customer order management
- **`COLineItems`**: Customer order line items
- **`Vendor_Details`**: Supplier contact information
- **`Brand_Outlet_Distributor`**: Brand-to-distributor routing

## Role-Based Access Control

### User Roles
- **Super User**: Full access (saleem@poppatjamals.com, karima@poppatjamals.com)
- **Purchase Manager**: PO creation and management
- **Inventory Manager**: GRN processing
- **Store Manager**: Customer order management

### Protected Sheets
- Most sheets are view-only for non-super users
- `SKUClassification` editable by vendors
- Role-specific menu systems in `main.js`

## Business Rules & Configuration

### Thresholds (in `constants.js`)
- **PO Auto-Close**: 10 days
- **GRN Auto-Approval**: 60 minutes
- **SKU Analysis Window**: 180 days
- **Classification Criteria**: 70% revenue/volume thresholds

### Email Templates
- Professional HTML formatting with company branding
- Outlet-specific CC lists
- PDF PO attachments
- Status-based messaging

## Automation & Triggers

### Time-Based Triggers
- **GRN Auto-Approval**: Hourly execution
- **PO Auto-Closure**: Weekly execution

### Event-Based Triggers
- Form submissions for PO/GRN/CO creation
- Status updates based on user actions
- Email delivery confirmations

## Testing

### Test Execution
- Run tests from Apps Script editor console
- Each test file has setup/cleanup functions
- Tests validate business logic and data integrity

### Test Coverage
- Purchase order creation and lifecycle
- GRN processing and approval
- Customer order functionality
- SKU classification logic

## Development Guidelines

### Code Conventions
- Use existing utility functions in `helpers.js`
- Follow role-based access patterns
- Maintain sheet protection configurations
- Use constants from `constants.js`
- **Always use header-based column mapping instead of hardcoded indexes**
- **Follow the Approval and Email Delivery Pattern for all approval processes**

### Sheet Data Access Best Practices
**CRITICAL: Use Header-Based Column Mapping**

When accessing Google Sheets data, **NEVER** use hardcoded column indexes as they break when columns are added/removed. Instead, use dynamic header mapping:

```javascript
// ❌ BAD - Fragile, breaks when columns change
const distributorName = rowData[13];
const distributorEmail = rowData[14];

// ✅ GOOD - Robust, adapts to column changes
const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
const columnMap = {};
headers.forEach((header, index) => {
  if (header) columnMap[header] = index;
});

const distributorName = rowData[columnMap['DistributorName']];
const distributorEmail = rowData[columnMap['DistributorEmail']];
```

**Implementation Guidelines:**
- Create column mapping functions for each sheet type
- Validate required columns exist before processing
- Use descriptive error messages when columns are missing
- Log column validation results for debugging
- Include column structure validation in setup processes

**Example Implementation:**
See `getCOColumnMapping()` in `customerOrderService.js` for the standard pattern to follow.

### Approval and Email Delivery Pattern
**CRITICAL: Proper Checkbox State Management**

For all approval processes that involve email delivery, follow this standard pattern to ensure data integrity:

**Checkbox States:**
- **Approved checkbox**: Set based on business logic (auto-approval or manual approval)
- **Sent checkbox**: **ONLY** set to `true` after successful email delivery

**Implementation Pattern:**

```javascript
// ❌ BAD - Sets Sent=true before email is actually sent
const record = [
  // ... other fields
  autoApproved, // Approved checkbox
  autoApproved, // Sent checkbox - WRONG! Email not sent yet
  // ... other fields
];

// ✅ GOOD - Proper checkbox state management
const record = [
  // ... other fields
  autoApproved, // Approved checkbox based on business logic
  false, // Sent checkbox - only true after successful email delivery
  // ... other fields
];

// Later, after successful email delivery:
if (emailResult === "SUCCESS") {
  sheet.getRange(rowNumber, columnMap['Sent'] + 1).setValue(true);
  sheet.getRange(rowNumber, columnMap['ApprovalType'] + 1).setValue('Auto');
  // Update other success fields
} else {
  // Handle email failure - Sent remains false
  sheet.getRange(rowNumber, columnMap['ApprovalType'] + 1).setValue(`ERROR: ${emailResult}`);
}
```

**Business Logic Examples:**
- **Auto-approved orders**: Approved=`true`, Sent=`false` initially → Sent=`true` only after successful email
- **Manual approval**: Approved=`false`, Sent=`false` initially → both updated when manually approved and email sent
- **Email failures**: Approved can be `true` but Sent remains `false`, with error details in ApprovalType field

**Error Handling:**
- Use column mapping instead of hardcoded indexes for all field updates
- Log email failures but don't fail the entire process
- Update status fields to reflect email delivery state
- Provide clear error messages for troubleshooting

This pattern ensures that the Sent checkbox accurately reflects email delivery status and prevents data inconsistencies.

### Adding New Features
1. Update role permissions in `userRoles.js`
2. Add sheet protection rules if needed
3. Create business logic in `/business/`
4. Build UI forms in `/ui/`
5. Add test coverage in `/tests/`
6. Update help content as needed

### Common Operations
- **Create PO**: Use `createPurchaseOrder()` in `poService.js`
- **Process GRN**: Use `createGRN()` in `grnService.js`
- **Send Emails**: Use templates from `constants.js`
- **Update Status**: Follow patterns in existing services

## Deployment Notes
- Deploy through Google Apps Script editor
- Set up time-based triggers after deployment
- Configure sheet permissions
- Verify email delivery and PDF generation
- Test role-based access with different user accounts

## Performance Considerations
- 6-minute Apps Script execution limit
- Batch operations for large datasets
- Use efficient sheet operations (batch reads/writes)
- Archive old data to Google Drive

## Customer Order Business Logic

### Purpose and Workflow
Customer Orders (COs) are created when:
- Items are out-of-stock at the outlet
- Customer requests large quantities that exceed normal inventory
- Special orders that require direct distributor fulfillment

**Process Flow:**
1. Customer requests item → Manager creates CO
2. CO sent to appropriate distributor (not customer)
3. Distributor fulfills order directly to customer
4. Outlet tracks order without holding inventory

### CO Value Calculation and Approval
- **Line Item Cost**: Uses `Avg.Cost Price` from ItemMaster for existing items
- **New Item Cost**: Manager enters cost price during CO creation
- **CO Value**: Sum of (Quantity × Cost Price) for all line items
- **Auto-Approval Threshold**: ₹10,000

### Approval Rules
```
if (hasNewItems || coValue >= ₹10,000) {
  // Requires manual approval
} else {
  // Auto-approve and send email immediately
}
```

### CO Number Format
`CO-{OutletCode}-{BrandCode}-{YYMMDD}-{001}`
- Example: `CO-MTR-ALLTIM-250625-001`
- Sequential numbering per outlet/brand/day

### Data Structure
**CustomerOrders Sheet:**
- CONumber, OutletName, Brand, CustomerName
- TotalQuantity, COValue (₹ formatted)
- Approval tracking (Approved, ApprovalType, DateApproved)
- Distributor assignment (DistributorName, DistributorEmail)

**COLineItems Sheet:**
- CONumber, LineNumber, ItemCode, ItemName
- Quantity, ItemType (existing/new_item)
- ItemCostPrice (₹ formatted), Notes

### Professional PDF Generation
- Uses same formatting engine as Purchase Orders
- Includes CO details, line items with cost prices, total value
- Branded layout with proper styling and currency formatting
- Sent as email attachment to distributors

### Email Integration
- Professional HTML templates with company branding
- Auto-sends to distributor upon approval
- Includes outlet-specific CC rules
- Same email quality as PO notifications

## Recent Enhancements
- **Threshold-based auto-approval**: Orders under ₹10K auto-process
- **Professional PDF generation**: Same quality as PO documents
- **Cost price integration**: Accurate value calculation and tracking
- **Immediate email automation**: Auto-approved orders sent instantly
- **Enhanced form validation**: Cost price capture for new items
- **Multi-item support**: Complete line-item tracking with individual pricing

## Known Issues & Troubleshooting

### Data Consistency Issues

#### Outlet Name Discrepancies
- **Problem**: Some outlet names in the data have inconsistent spacing (e.g., "POPPAT JAMAL & SONS  MOUNT ROAD" with double spaces)
- **Symptoms**: "Cannot read properties of undefined (reading 'toString')" errors in customer order creation
- **Root Cause**: The `outletShort` mapping in `constants.js` handles both single and double space versions, but some functions don't properly normalize outlet names before processing
- **Solution**: Always normalize outlet names using `.replace(/\s+/g, ' ').trim()` before lookups or processing
- **Location**: Affects customer order creation, distributor lookups, and CO number generation
- **Fixed In**: Lines 48, 125 in `customerOrderService.js` where outlet name normalization is applied

#### Brand Name Processing
- **Problem**: Brand names with spaces can cause undefined parameter errors
- **Symptoms**: Similar "Cannot read properties of undefined" errors when processing brand names
- **Solution**: Always validate brand parameters before string operations and use defensive programming

### Prevention
- When reading outlet/brand data from sheets, apply normalization consistently
- Add parameter validation to functions that process outlet/brand names
- Use defensive programming with null/undefined checks before calling string methods

## Support & Maintenance
- Super users handle system administration
- Regular testing via test suites
- Monitor email delivery and automation triggers
- Archive old POs monthly to maintain performance