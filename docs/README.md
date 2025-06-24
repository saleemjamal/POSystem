# Procurement Management System - Technical Documentation

## System Overview
Complete procurement lifecycle management system with automated workflows, role-based access control, and real-time analytics. Built on Google Apps Script with Google Sheets as the primary interface.

## Architecture

### Core Technologies
- **Platform**: Google Apps Script (JavaScript)
- **Database**: Google Sheets
- **File Storage**: Google Drive
- **Authentication**: Google OAuth
- **Triggers**: Time-based automation
- **UI**: HTML/CSS/JavaScript forms

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SKU Analysis  │────│  PO Management  │────│ GRN Processing  │
│   & Binning     │    │   & Approval    │    │  & Fulfillment  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Role-Based     │
                    │  Access Control │
                    └─────────────────┘
```

## File Structure

### Core System Files
```
main.js                 - Menu system and UI entry points
constants.js            - System configuration and constants
helpers.js              - Shared utility functions
userRoles.js            - Authentication and authorization
sheetProtection.js      - Data security and access control
```

### Business Logic Modules
```
classifySKUS.js         - SKU performance analysis engine
binningLogic.js         - Inventory quantity recommendations
poService.js            - Purchase order lifecycle management
sendPO.js               - Email delivery and status tracking
grnService.js           - Goods receipt processing
grnAutoApproval.js      - Automated approval workflows
poDbase.js              - Data archiving and storage
```

### User Interface Components
```
createPOForm.html       - Purchase order creation interface
createGRNForm.html      - Goods receipt entry interface
helpContent.html        - Context-sensitive help system
```

### Testing & Documentation
```
tests.js                - PO system test suite
grnTests.js             - GRN system test suite
PROCESS_FLOW.md         - Complete process documentation
```

## Data Model

### Primary Sheets
- **POTracking**: Master purchase order registry
- **GRNTracking**: Goods receipt transaction log
- **SKUClassification**: Product performance analytics
- **Vendor_Details**: Supplier contact information
- **Brand_Outlet_Distributor**: Routing matrix

### Archive Structure
```
/Purchase Orders/
  ├── 2025-06/
  │   ├── POs-2025-06-01
  │   ├── POs-2025-06-02
  │   └── ...
  └── 2025-07/
      └── ...
```

## Authentication & Authorization

### User Roles
```javascript
SUPER_USER: ['saleem@poppatjamals.com', 'karima@poppatjamals.com']
- Full system access and administration
- All procurement operations
- Security and automation management

PURCHASE_MANAGER: ['purchasemanager@poppatjamals.com']  
- PO creation and management
- Archive file editing
- Vendor data maintenance

INVENTORY_MANAGER: ['backoffice@poppatjamals.com']
- GRN creation and tracking
- Vendor data maintenance
- View-only access to POs
```

### Security Implementation
- **Sheet-level protection**: Role-based edit permissions
- **File-level access**: Archive sharing by role
- **Function-level validation**: Permission checks on operations
- **Menu-level filtering**: UI customization by role

## Core Workflows

### 1. SKU Classification Pipeline
```
Raw Sales Data → Performance Analysis → Binning Logic → Purchase Recommendations
```
**Functions**: `classifySKUs()`, `computeAverageCostBins()`
**Output**: Classified products with recommended order quantities

### 2. Purchase Order Lifecycle
```
Recommendation → PO Creation → Approval → Email → Tracking
```
**Functions**: `createPO()`, `sendApprovedPOs()`, `updateTrackingSheet()`
**Automation**: PDF generation, email delivery, status updates

### 3. Goods Receipt Processing
```
Physical Receipt → GRN Creation → Auto-Approval → Fulfillment Calculation
```
**Functions**: `createGRN()`, `autoApproveOldGRNs()`, `updatePOFulfillmentMetrics()`
**Automation**: 60-minute auto-approval, real-time metric updates

### 4. PO Closure Management
```
10-Day Timer → Status Evaluation → Auto-Closure → Final Reporting
```
**Functions**: `closeOldPOs()`, `handleLateGRN()`
**Automation**: Weekly closure process, late fulfillment tracking

## Automation System

### Time-Based Triggers
```javascript
// GRN Auto-Approval (Hourly)
autoApproveOldGRNs() - Every hour, approve GRNs older than 60 minutes

// PO Auto-Closure (Weekly)  
closeOldPOs() - Every Monday 9 AM, close POs older than 10 days
```

### Event-Based Triggers
```javascript
// Sheet Edit Detection
onEdit() - Real-time responses to checkbox changes and data updates

// Menu Generation
onOpen() - Dynamic menu creation based on user role
```

## Configuration Management

### System Constants
```javascript
// Timing Parameters
PO_AUTO_CLOSE_DAYS = 10              // PO closure threshold
GRN_AUTO_APPROVE_MINUTES = 60        // GRN approval delay
ACTIVE_DAYS_THRESHOLD = 180          // SKU activity window

// Classification Thresholds
REV_RANK_A = 0.70                    // Revenue performance cutoff
VOL_RANK_A = 0.70                    // Volume performance cutoff
TOS_THRESHOLD_HIGH = 150             // Time-on-shelf limit

// Email Configuration
ccList = 'purchasemanager@...'       // Default CC recipients
editors = ['saleem@...', 'karima@...'] // System administrators
```

### Outlet Configuration
```javascript
outletShort = {
  "POPPAT JAMALS ADYAR": "ADY",
  "POPPAT JAMAL & SONS MOUNT ROAD": "MTR",
  "POPPAT JAMALS ANNA NAGAR": "ANN",
  "POPPAT JAMALS COIMBATORE": "CBE",
  "POPPAT JAMALS VIJAYAWADA": "VJW"
}
```

## API Reference

### Core Functions

#### PO Management
```javascript
createPO(outletName, brandName, poNumber, orderType, poRows)
// Creates purchase order with line items and tracking

generatePOsFromBatch()
// Bulk PO generation from POBatch sheet

sendApprovedPOs()
// Email approved POs to distributors with PDF attachments
```

#### GRN Processing
```javascript
createGRN(poNumber, invoiceNumber, grnAmount, grnDate, notes)
// Records goods receipt with validation

autoApproveOldGRNs()
// Automated approval for GRNs older than threshold

updatePOFulfillmentMetrics(poNumber)
// Recalculates fulfillment percentages and amounts
```

#### System Administration
```javascript
setupAllTriggers()
// Enables complete automation (GRN approval + PO closure)

setupSheetProtections()
// Applies role-based security to all sheets

getCurrentUserRole()
// Returns user's role for permission validation
```

### Helper Functions
```javascript
lookupDistributor(brand, outlet)
// Retrieves distributor for brand-outlet combination

exportSelectedColumnsPDF(fileId, poName, columns, details)
// Generates formatted PO PDF for email attachment

validateAndGetPOData(poNumber)
// Validates PO exists and returns metadata
```

## Data Structures

### POTracking Schema
```javascript
{
  PONumber: string,           // Unique identifier
  POType: "PO"|"CO",         // Order type
  Brand: string,             // Product brand
  OutletName: string,        // Store location
  POAmount: number,          // Total order value
  Status: string,            // Workflow status
  Approved: boolean,         // Approval flag
  EmailSent: boolean,        // Delivery confirmation
  DateCreated: Date,         // Creation timestamp
  FulfillmentAmount: number, // Received amount
  FulfillmentPercentage: number, // Completion rate
  DistributorName: string,   // Supplier name
  DistributorEmail: string,  // Contact email
  Link: string              // Document URL
}
```

### GRNTracking Schema
```javascript
{
  GRNNumber: string,         // Auto-generated ID (GRN-PO1234-001)
  PONumber: string,          // Related PO reference
  OutletName: string,        // Delivery location
  Brand: string,             // Product brand
  InvoiceNumber: string,     // Supplier invoice
  GRNDate: Date,            // Receipt date
  GRNAmount: number,        // Received amount
  Approved: boolean,        // Approval status
  ApprovalType: "Manual"|"Auto", // Approval method
  DateApproved: Date,       // Approval timestamp
  Notes: string            // Optional comments
}
```

## Performance Considerations

### Optimization Strategies
- **Batch operations**: Minimize individual cell updates
- **Smart filtering**: Process only relevant records
- **Caching mechanisms**: Reuse calculated values
- **Error isolation**: Graceful degradation on failures

### Scalability Limits
- **Sheet size**: ~1M cells per sheet (Google Sheets limit)
- **Execution time**: 6 minutes per script execution
- **Trigger quota**: 20 triggers per script
- **Email quota**: 100 emails per day (standard accounts)

### Monitoring & Maintenance
- **Debug logging**: Comprehensive error tracking
- **Performance metrics**: Execution time monitoring
- **Data archiving**: Regular cleanup of historical data
- **Backup strategy**: Automated exports and versioning

## Deployment Guide

### Initial Setup
```bash
# 1. Deploy code
clasp push

# 2. Configure automation (run once in Apps Script)
setupAllTriggers()

# 3. Apply security (run once in Apps Script)
setupSheetProtections()

# 4. Update archive access (run once in Apps Script)
updateAllArchiveFileAccess()
```

### Testing Protocol
```javascript
// 1. Setup test environment
setupTestData()
setupGRNTestData()

// 2. Run validation suites
runPOTests()
runAllGRNTests()

// 3. Test user roles
// (Login as each user type and verify menu access)

// 4. Cleanup
cleanupTestData()
cleanupGRNTestData()
```

### Production Checklist
- [ ] All code deployed via clasp
- [ ] Automation triggers active
- [ ] Sheet protection configured
- [ ] Archive access permissions set
- [ ] User roles tested
- [ ] Email templates verified
- [ ] Distributor contacts updated
- [ ] Backup procedures documented

## Troubleshooting

### Common Issues

#### Authentication Problems
```javascript
// Check user role assignment
getCurrentUserRole()

// Verify permissions
hasPermission(userRole, 'CREATE_PO')

// Reset protection if needed
removeAllSheetProtections()
```

#### Automation Failures
```javascript
// Check active triggers
ScriptApp.getProjectTriggers()

// Manual trigger execution
autoApproveOldGRNs()
closeOldPOs()

// Re-enable if needed
setupAllTriggers()
```

#### Data Inconsistencies
```javascript
// Recalculate fulfillment
updatePOFulfillmentMetrics(poNumber)

// Validate PO status
validateAndGetPOData(poNumber)

// Check sheet structure
runPOTests()
```

### Debug Resources
- **DebugLog sheet**: Runtime error tracking
- **Apps Script logs**: Execution history and errors
- **Test functions**: Isolated component validation
- **Manual overrides**: Emergency operation procedures

## Security Guidelines

### Access Control Best Practices
- **Regular role audits**: Verify user permissions quarterly
- **Principle of least privilege**: Grant minimum required access
- **Archive protection**: Secure historical data appropriately
- **Email security**: Validate distributor contacts

### Data Protection
- **Backup procedures**: Regular exports and archiving
- **Version control**: Code repository maintenance
- **Audit trails**: Complete transaction logging
- **Recovery plans**: Emergency access procedures

## Extension Points

### Planned Enhancements
- **Mobile interface**: Responsive GRN creation
- **API integration**: ERP system connectivity
- **Advanced analytics**: Machine learning insights
- **Workflow automation**: Smart approval routing

### Customization Options
- **Configurable thresholds**: Business rule adjustments
- **Custom status flows**: Workflow modifications
- **Extended reporting**: Additional metrics and KPIs
- **Integration hooks**: External system connections

## Support & Maintenance

### Regular Maintenance Tasks
- **Weekly**: Review automation logs and performance
- **Monthly**: Update distributor contacts and test system
- **Quarterly**: Audit user roles and archive old data
- **Annually**: Review thresholds and optimize performance

### Support Contacts
- **System Administration**: saleem@poppatjamals.com, karima@poppatjamals.com
- **Technical Issues**: Check DebugLog sheet and execution logs
- **Business Process**: Review PROCESS_FLOW.md documentation
- **Training Resources**: Role-specific guides and help content

The system is designed for reliability, scalability, and ease of maintenance while providing comprehensive procurement management capabilities.
