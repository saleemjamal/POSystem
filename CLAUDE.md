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

### 4. Customer Order Management (Recent Addition)
- Multi-item order support with validation
- Brand-specific CO number generation
- Distributor lookup and assignment
- Line items stored in `COLineItems` sheet

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

## Recent Enhancements
- Multi-item customer order support
- Brand integration in CO numbers
- Enhanced UI styling and validation
- Improved distributor lookup
- Store manager role implementation

## Support & Maintenance
- Super users handle system administration
- Regular testing via test suites
- Monitor email delivery and automation triggers
- Archive old POs monthly to maintain performance