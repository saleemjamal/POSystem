# Purchase Order & GRN Management System

## Overview
Complete procurement management system handling the full lifecycle from SKU classification and PO creation to goods receipt and fulfillment tracking. Features automated workflows, real-time status updates, and comprehensive reporting capabilities.

---

## 🎯 **System Architecture**

### **Core Components**
1. **SKU Classification Engine** - Analyzes sales data and generates purchase recommendations
2. **PO Management** - Creates, approves, and sends purchase orders to distributors
3. **GRN Processing** - Tracks goods receipt with automated approval workflow
4. **Fulfillment Analytics** - Real-time metrics and performance tracking
5. **Automated Workflows** - Time-based triggers for hands-off operation

### **Key Automation Features**
- ✅ **Auto-approve GRNs** after 60 minutes
- ✅ **Auto-close POs** after 10 days
- ✅ **Real-time fulfillment** calculation
- ✅ **Automatic status** updates
- ✅ **Email notifications** to distributors

---

## 📂 **File Structure**

### **Core System Files**
| File | Purpose |
|------|---------|
| `main.js` | Menu system and entry points |
| `constants.js` | Configuration and system constants |
| `helpers.js` | Utility functions and shared logic |

### **SKU & PO Management**
| File | Purpose |
|------|---------|
| `classifySKUS.js` | SKU analysis and classification engine |
| `binningLogic.js` | Cost-based quantity recommendations |
| `poService.js` | PO creation, archiving, and tracking |
| `sendPO.js` | PO email delivery and status management |

### **GRN Management**
| File | Purpose |
|------|---------|
| `grnService.js` | GRN creation and fulfillment tracking |
| `grnAutoApproval.js` | Automated approval and trigger management |
| `createGRNForm.html` | User interface for GRN creation |

### **Testing & Documentation**
| File | Purpose |
|------|---------|
| `tests.js` | PO system test suite |
| `grnTests.js` | GRN system test suite |
| `PROCESS_FLOW.md` | Complete process documentation |

---

## 🔄 **Complete Workflow**

### **Phase 1: SKU Classification → PO Creation**
```
Raw Sales Data → SKU Analysis → Purchase Recommendations → PO Generation
```

**Key Functions:**
- `classifySKUs()` - Analyzes performance and generates recommendations
- `generatePOsFromBatch()` - Creates POs from recommendations
- `createPOFromUI()` - Manual single PO creation

**Output:** Purchase orders ready for approval

### **Phase 2: PO Approval → Distributor Communication**
```
PO Created → Manual Approval → Email Generation → Distributor Notification
```

**Key Functions:**
- `sendApprovedPOs()` - Emails approved POs to distributors
- `exportSelectedColumnsPDF()` - Creates formatted PO documents

**Output:** POs sent to distributors with tracking enabled

### **Phase 3: Goods Receipt → Fulfillment Tracking**
```
Goods Delivered → GRN Creation → Auto-Approval → Metrics Update
```

**Key Functions:**
- `createGRN()` - Records goods receipt
- `autoApproveOldGRNs()` - Automated approval after 60 minutes
- `updatePOFulfillmentMetrics()` - Real-time fulfillment calculation

**Output:** Complete fulfillment visibility and metrics

### **Phase 4: PO Closure → Reporting**
```
10 Days After Send → Auto-Closure → Final Status → Analytics
```

**Key Functions:**
- `closeOldPOs()` - Automated closure with status assignment
- `handleLateGRN()` - Manages late deliveries

**Output:** Closed POs with complete fulfillment history

---

## 📊 **Data Structure**

### **POTracking Sheet**
**Core PO Information:**
- `PONumber` - Unique identifier
- `POType` - PO or CO (Customer Order)
- `Brand` - Product brand
- `OutletName` - Store location
- `POAmount` - Total order value
- `Status` - Current PO status
- `DateCreated` - Creation timestamp

**Distributor Information:**
- `DistributorName` - Supplier name
- `DistributorEmail` - Contact email
- `Link` - URL to PO document

**Fulfillment Tracking:**
- `FulfillmentAmount` - Total amount received
- `FulfillmentPercentage` - Fulfillment rate (%)
- `Approved` - Approval checkbox
- `EmailSent` - Send status

### **GRNTracking Sheet**
**Receipt Information:**
- `GRNNumber` - Auto-generated (GRN-PO1234-001)
- `PONumber` - Related PO reference
- `InvoiceNumber` - Distributor invoice
- `GRNDate` - Receipt date
- `GRNAmount` - Amount received

**Approval Tracking:**
- `Approved` - Approval checkbox
- `ApprovalType` - "Manual" or "Auto"
- `DateApproved` - Approval timestamp
- `Notes` - Optional comments

**Context Information:**
- `OutletName` - Delivery location
- `Brand` - Product brand

### **SKUClassification Sheet**
**Performance Metrics:**
- `RevClass` - Revenue ranking (A/B/C)
- `VolumeClass` - Sales velocity (Fast/Medium/Slow)
- `MarginClass` - Profitability tier
- `VelocityClass` - Inventory turnover rate

**Recommendations:**
- `UsageReco` - Usage recommendation
- `FinalOrderQty` - Calculated order quantity
- `SuggestedQty` - System suggestion
- `Justification` - Recommendation rationale

---

## 🎛️ **System Configuration**

### **Key Constants** (constants.js)
```javascript
// Timing Configuration
const PO_AUTO_CLOSE_DAYS = 10;           // Days before PO auto-closure
const GRN_AUTO_APPROVE_MINUTES = 60;     // Minutes before GRN auto-approval
const ACTIVE_DAYS_THRESHOLD = 180;       // Days to consider SKU active

// Classification Thresholds  
const REV_RANK_A = 0.70;                 // Top 70% revenue performers
const VOL_RANK_A = 0.70;                 // Top 70% volume performers
const TOS_THRESHOLD_HIGH = 150;          // High time-on-shelf threshold

// Email Configuration
const ccList = 'purchasemanager@poppatjamals.com,backoffice@poppatjamals.com';
const editors = ["karima@poppatjamals.com", "purchasemanager@poppatjamals.com"];
```

### **Status Definitions**
**PO Statuses:**
- `Pending` - Created, awaiting approval
- `Approved` - Approved for sending
- `Sent` - Emailed to distributor
- `Partially Received` - First GRN received
- `Closed - Complete` - 100% fulfilled
- `Closed - Partial` - Partially fulfilled after 10 days
- `Closed - No Receipt` - No GRNs after 10 days
- `Late Fulfillment` - GRN received after closure

**GRN Approval Types:**
- `Manual` - User-approved via checkbox
- `Auto` - System-approved after 60 minutes

---

## 🚀 **Setup & Installation**

### **1. Initial Setup**
```bash
# Deploy code to Google Apps Script
clasp push
```

### **2. Enable Automation (One-time)**
Run this function once in Apps Script editor:
```javascript
setupAllTriggers()
```

This creates:
- **Hourly trigger** for GRN auto-approval
- **Weekly trigger** for PO auto-closure (Mondays 9 AM)

### **3. Verify Setup**
Check that triggers are active:
```javascript
// List all triggers
ScriptApp.getProjectTriggers().forEach(trigger => {
  console.log(`Function: ${trigger.getHandlerFunction()}, Type: ${trigger.getEventType()}`);
});
```

### **4. Test System**
```javascript
// Run comprehensive tests
runPOTests()        // Test PO functionality
runAllGRNTests()    // Test GRN functionality
```

---

## 💼 **Daily Operations**

### **User Actions Required**
1. **Classify SKUs** (weekly/monthly)
   - Menu: "Classify SKUs"
   - Generates purchase recommendations

2. **Generate POs** (as needed)
   - Menu: "Generate POs from Batch" or "Create Single PO"
   - Creates orders from recommendations

3. **Approve POs** (daily check)
   - Check "Approved" checkbox in POTracking sheet
   - Change Status to "Approved"

4. **Send POs** (daily)
   - Menu: "Send Approved POs"
   - Emails POs to distributors

5. **Create GRNs** (when goods received)
   - Menu: "Create GRN"
   - Record goods receipt with invoice details

### **Automated Background Tasks**
- ✅ **GRN approval** (every hour)
- ✅ **PO closure** (every Monday)
- ✅ **Fulfillment calculations** (real-time)
- ✅ **Status updates** (automatic)

---

## 📈 **Reporting & Analytics**

### **Available Metrics**

**Fulfillment Performance:**
- Fulfillment rates by outlet, brand, distributor
- Time from PO sent to first GRN
- Percentage of complete vs partial fulfillments
- Late delivery frequency and patterns

**Operational Efficiency:**
- PO approval times
- Time from creation to distributor email
- Average PO values and quantities
- SKU performance trends

**Distributor Analysis:**
- Fulfillment reliability by supplier
- Average delivery times
- Invoice accuracy rates
- Communication responsiveness

### **Data Export Options**
All data available in Google Sheets for:
- **Pivot tables** for custom analysis
- **Charts and graphs** for visualization
- **Data export** to other systems
- **API integration** for external reporting

---

## 🔧 **Administration & Maintenance**

### **Trigger Management**
```javascript
// Enable all automation
setupAllTriggers()

// Disable all automation  
removeAllTriggers()

// Individual trigger control
setupAutoApprovalTrigger()      // GRN auto-approval
setupPOClosureTrigger()         // PO auto-closure
removeAutoApprovalTrigger()     // Disable GRN automation
removePOClosureTrigger()        // Disable PO automation
```

### **System Monitoring**
- **Debug Logs**: Check DebugLog sheet for errors
- **Execution Logs**: Review Apps Script execution history
- **Performance**: Monitor trigger execution times
- **Data Quality**: Validate fulfillment calculations

### **Regular Maintenance Tasks**

**Weekly:**
- Review pending approvals
- Check automation execution logs
- Monitor fulfillment rates

**Monthly:**
- Run comprehensive test suite
- Review and update distributor information
- Analyze performance trends

**Quarterly:**
- Archive old data
- Review and adjust thresholds
- Update classification parameters

---

## 🧪 **Testing Framework**

### **PO System Tests**
```javascript
setupTestData()           // Create test data
runPOTests()             // Basic functionality tests
testPOCreation()         // PO creation workflow
testDropdownData()       // UI data validation
testSendPOWorkflow()     // Email delivery test
cleanupTestData()        // Remove test data
```

### **GRN System Tests**
```javascript
setupGRNTestData()       // Create test GRN data
runGRNTests()           // Basic GRN functionality
testGRNCreationWorkflow() // End-to-end GRN test
testAutoApproval()       // Auto-approval validation
testApprovalTypes()      // Manual vs auto approval
testPOStatusUpdates()    // Status change logic
testOldPOClosure()       // Auto-closure logic
cleanupGRNTestData()     // Remove test data
```

### **Integration Tests**
```javascript
runAllGRNTests()         // Complete GRN test suite
// Tests PO→GRN→Fulfillment→Closure workflow
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

**GRN Creation Fails:**
- ✅ Verify PO exists and has status "Sent", "Partially Received", or "Late Fulfillment"
- ✅ Check all required fields are filled
- ✅ Ensure PO number matches exactly

**Auto-Approval Not Working:**
- ✅ Verify triggers are set up: `ScriptApp.getProjectTriggers()`
- ✅ Check execution logs for errors
- ✅ Manually run: `autoApproveOldGRNs()`

**Fulfillment Metrics Wrong:**
- ✅ Ensure GRNs are approved before calculation
- ✅ Verify PO amount is correct
- ✅ Check for duplicate GRNs
- ✅ Manually recalculate: `updatePOFulfillmentMetrics(poNumber)`

**Email Sending Issues:**
- ✅ Check distributor email addresses
- ✅ Verify email permissions
- ✅ Review email quota limits
- ✅ Check OUTLET_EMAIL_RULES configuration

### **Debug Functions**
```javascript
debugLog(message)                    // Log to DebugLog sheet
validateAndGetPOData(poNumber)       // Check PO status
getEligiblePOsForGRN()              // List available POs for GRN
updatePOFulfillmentMetrics(poNumber) // Recalculate metrics
```

---

## 🔐 **Security & Access Control**

### **User Permissions**
- **Editors**: Can create, approve, and send POs and GRNs
- **Viewers**: Read-only access to data and reports
- **Admins**: Full system access including trigger management

### **Data Protection**
- **Audit Trails**: Complete history of all changes
- **Backup Strategy**: Regular data exports recommended
- **Access Logs**: Monitor user activity via Google Sheets history

### **Email Security**
- **Controlled Distribution**: Outlet-specific CC lists
- **Professional Templates**: Branded email formatting
- **Attachment Security**: PDF generation with proper formatting

---

## 🎯 **Performance Optimization**

### **System Efficiency**
- **Batch Operations**: Minimize individual cell updates
- **Smart Filtering**: Process only relevant records
- **Caching**: Reuse calculated values where possible
- **Error Handling**: Graceful degradation on failures

### **Scalability Considerations**
- **Data Archiving**: Regular cleanup of old records
- **Trigger Optimization**: Efficient execution patterns
- **Sheet Management**: Organized data structure
- **Memory Management**: Avoid large array operations

---

## 📞 **Support & Resources**

### **Documentation**
- **Process Flow**: Complete workflow documentation
- **Function Reference**: Inline code documentation
- **User Guide**: Step-by-step operational procedures

### **Training Resources**
- **Test Environment**: Safe testing with sample data
- **Help Menu**: Context-sensitive assistance
- **Error Messages**: Clear guidance on issues

### **Contact Information**
- **System Administrator**: Configure access and permissions
- **Technical Support**: Code issues and enhancements
- **Business Process**: Workflow and procedure questions

---

## 🚀 **Future Enhancements**

### **Planned Features**
- **Mobile Interface**: Responsive GRN creation
- **API Integration**: Connect with ERP systems
- **Advanced Analytics**: Machine learning insights
- **Workflow Automation**: Smart approval routing

### **Customization Options**
- **Configurable Thresholds**: Adjustable timing parameters
- **Custom Status Flows**: Business-specific workflows
- **Extended Reporting**: Additional metrics and KPIs
- **Integration Hooks**: Connect with external systems

The system is designed for easy extension and customization to meet evolving business needs while maintaining reliability and ease of use.
