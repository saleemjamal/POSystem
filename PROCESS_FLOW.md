# Purchase Order & GRN Process Flow

## Overview
This document outlines the complete process flow from SKU classification and PO creation through GRN processing and PO closure. The system provides end-to-end visibility and automation for procurement operations.

---

## 📊 **Phase 1: SKU Analysis & Classification**

### **1.1 Data Preparation**
- **Input**: Raw sales data with SKU, outlet, brand, cost, quantity information
- **Process**: Data aggregation and analysis
- **Output**: Classified SKUs with purchase recommendations

### **1.2 SKU Classification Process**
```
Sales Data → SKU Classification Engine → Recommendations
```

**Classification Criteria:**
- **Revenue Rank**: A (Top 70%), B (70-95%), C (Bottom 5%)
- **Volume Velocity**: Fast, Medium, Slow based on sales frequency
- **Margin Analysis**: High, Medium, Low compared to outlet average
- **Time on Shelf**: Days since first inward vs. sales performance

**Automated Recommendations:**
- **Auto-ReOrder**: High-performing SKUs requiring regular restocking
- **Watch-List**: Moderate performers needing monitoring
- **Dead**: Poor performers recommended for discontinuation
- **New-Item**: Recently introduced products

### **1.3 Output**
- **SKUClassification Sheet**: Complete analysis with recommended order quantities
- **FinalOrderQty**: Calculated order quantity per SKU per outlet

---

## 🛒 **Phase 2: Purchase Order Creation**

### **2.1 PO Generation Options**

#### **Option A: Batch Generation**
```
SKU Classification → POBatch Sheet → Bulk PO Creation
```
1. **System analyzes** SKU recommendations
2. **Groups by** outlet and brand combinations
3. **Creates POBatch** entries for combinations with orders needed
4. **Bulk generates** POs via `generatePOsFromBatch()`

#### **Option B: Manual Single PO**
```
User Input → PO Creation Form → Individual PO
```
1. **User selects** outlet and brand via UI
2. **System filters** relevant SKUs with `FinalOrderQty > 0`
3. **Creates single PO** with selected items

### **2.2 PO Creation Process**
```
Input Validation → Line Item Generation → Archive Creation → Tracking Update
```

**Steps:**
1. **Generate PO Number**: Sequential numbering system
2. **Create Line Items**: Filter SKUs with order quantities > 0
3. **Archive PO**: Create sheet in daily archive file with full details
4. **Update Tracking**: Add entry to POTracking sheet
5. **Lookup Distributors**: Auto-populate distributor information

### **2.3 PO Structure**
**POTracking Sheet Columns:**
- PONumber, POType, Brand, OutletName, POName
- POAmount, Link, DistributorName, DistributorEmail
- Status, Approved, EmailSent, DateCreated
- FulfillmentAmount, FulfillmentPercentage (added by GRN system)

**PO Statuses:**
- **Pending**: Created but not yet approved
- **Approved**: Management approved for sending
- **Sent**: Emailed to distributor
- **Partially Received**: First GRN received
- **Closed - Complete**: 100% fulfilled after 10+ days
- **Closed - Partial**: Partially fulfilled after 10+ days
- **Closed - No Receipt**: No GRNs received after 10+ days
- **Late Fulfillment**: GRN received after auto-closure

---

## ✅ **Phase 3: PO Approval & Sending**

### **3.1 Approval Workflow**
```
PO Created → Manual Approval → Status Update → Ready for Sending
```

**Process:**
1. **Review PO**: Check POTracking sheet for new POs
2. **Verify Details**: Confirm amounts, distributors, line items
3. **Approve**: Check "Approved" checkbox in POTracking
4. **Status Update**: Manually change Status from "Pending" to "Approved"

### **3.2 Sending Process**
```
Approved POs → Email Generation → PDF Creation → Distributor Notification
```

**Automated Process:**
1. **Trigger**: Run "Send Approved POs" from menu
2. **Filter**: Find POs with Approved=true and EmailSent=false
3. **Generate PDF**: Create formatted PO with selected columns
4. **Send Email**: Email to distributor with PO attached
5. **Update Status**: Set EmailSent=true and Status="Sent"
6. **Archive Data**: Transfer PO line items to master database

**Email Features:**
- Professional HTML template
- Outlet-specific CC lists
- Branded formatting
- PDF attachment with proper formatting

---

## 📦 **Phase 4: Goods Receipt (GRN Process)**

### **4.1 GRN Creation Trigger**
```
Goods Delivered → Invoice Received → GRN Creation
```

**When to Create GRN:**
- Distributor delivers goods to outlet
- Physical goods received and verified
- Distributor invoice received
- Need to track partial or complete delivery

### **4.2 GRN Creation Process**
```
User Input → Validation → GRN Generation → Status Updates
```

**Steps:**
1. **Access Form**: Menu → "Create GRN"
2. **Select PO**: Dropdown shows only eligible POs (Sent, Partially Received, Late Fulfillment)
3. **Enter Details**:
   - Invoice number from distributor
   - Amount received (₹)
   - GRN date (defaults to today)
   - Optional notes
4. **Submit**: System validates and creates GRN

### **4.3 GRN Data Structure**
**GRNTracking Sheet:**
- GRNNumber (auto-generated: GRN-PO1234-001)
- PONumber, OutletName, Brand
- InvoiceNumber, GRNDate, GRNAmount
- Approved, ApprovalType, DateApproved, Notes

### **4.4 Automatic GRN Approval**
```
GRN Created → Wait 60 Minutes → Auto-Approval → Metrics Update
```

**Auto-Approval Process:**
- **Hourly trigger** checks for GRNs older than 60 minutes
- **Auto-approves** unapproved GRNs
- **Sets ApprovalType** = "Auto"
- **Updates fulfillment metrics** immediately

**Manual Approval Option:**
- Users can manually approve before 60 minutes
- Sets ApprovalType = "Manual"
- Same metric updates triggered

### **4.5 PO Status Updates on GRN**
```
First GRN → "Partially Received"
Subsequent GRNs → Remain "Partially Received"
```

**Immediate Updates:**
- PO Status updated to "Partially Received" on first GRN
- FulfillmentAmount calculated (sum of approved GRNs)
- FulfillmentPercentage calculated (fulfilled/total PO amount)

---

## 🔄 **Phase 5: PO Closure & Completion**

### **5.1 Automatic PO Closure Logic**
```
10 Days After Email Sent → Auto-Closure → Final Status Assignment
```

**Closure Criteria:**
- PO was emailed to distributor (EmailSent = true)
- 10+ days have passed since DateCreated
- Current status is "Sent" or "Partially Received"

**Status Assignment:**
- **Closed - Complete**: FulfillmentPercentage >= 100%
- **Closed - Partial**: FulfillmentPercentage > 0% but < 100%
- **Closed - No Receipt**: FulfillmentPercentage = 0%

### **5.2 Late Fulfillment Handling**
```
PO Closed → Late GRN Arrives → Status: "Late Fulfillment"
```

**Process:**
- System allows GRN creation even after PO closure
- Automatically updates status to "Late Fulfillment"
- Recalculates fulfillment metrics
- Maintains audit trail of late receipts

### **5.3 Manual Closure Option**
- **Trigger**: Menu → "Close Old POs"
- **Use Case**: Immediate closure or cleanup
- **Frequency**: Can be run manually or via scheduled trigger

---

## 📊 **Phase 6: Reporting & Analytics**

### **6.1 Available Metrics**

**Fulfillment Metrics:**
- Fulfillment rate by outlet, brand, distributor
- Time to fulfill (PO sent to first GRN)
- Partial delivery frequency
- Late fulfillment trends

**Process Metrics:**
- PO approval time
- Time from creation to sending
- Average PO values
- SKU performance tracking

### **6.2 Data Sources**
- **POTracking**: Master PO data with fulfillment metrics
- **GRNTracking**: Detailed receipt information
- **POLineItems**: Historical transaction data
- **SKUClassification**: Performance and recommendation data

---

## 🔧 **System Administration**

### **7.1 One-Time Setup**
1. **Upload Code**: Deploy all scripts via `clasp push`
2. **Configure Constants**: Review and adjust timing/thresholds
3. **Setup Triggers**: 
   - Run `setupAutoApprovalTrigger()` for GRN auto-approval
   - Optional: Time-based trigger for `closeOldPOs()`
4. **Test System**: Run comprehensive test suite
5. **Train Users**: Familiarize team with new GRN process

### **7.2 Ongoing Maintenance**
- **Monitor auto-approval**: Check execution logs for issues
- **Review fulfillment rates**: Identify problem distributors/SKUs
- **Clean old data**: Archive historical records periodically
- **Update distributor info**: Maintain current email addresses

### **7.3 Troubleshooting**
- **Debug logs**: Check DebugLog sheet for errors
- **Test functions**: Use test suite to validate functionality
- **Manual overrides**: Use manual triggers when needed

---

## 📋 **Process Summary Checklist**

### **Weekly Tasks**
- [ ] Review pending PO approvals
- [ ] Send approved POs to distributors
- [ ] Create GRNs for received goods
- [ ] Monitor late fulfillments

### **Monthly Tasks**
- [ ] Run SKU classification
- [ ] Generate POs from recommendations
- [ ] Review fulfillment metrics
- [ ] Update distributor information

### **Quarterly Tasks**
- [ ] Analyze SKU performance trends
- [ ] Review and adjust classification parameters
- [ ] Assess distributor performance
- [ ] Clean up old test data

---

## 🎯 **Key Benefits**

### **Efficiency Gains**
- **Automated SKU analysis** reduces manual classification time
- **Batch PO generation** streamlines procurement process
- **Auto-approval GRNs** eliminates approval bottlenecks
- **Automatic status updates** provide real-time visibility

### **Data Quality**
- **Systematic tracking** ensures no lost orders
- **Audit trails** maintain complete history
- **Standardized process** reduces human error
- **Real-time metrics** enable quick decision making

### **Business Intelligence**
- **Fulfillment visibility** identifies supplier issues
- **SKU performance** optimizes inventory decisions
- **Process metrics** highlight improvement opportunities
- **Trend analysis** supports strategic planning

---

## 📞 **Support & Documentation**

### **For Users**
- **Help Menu**: Available in spreadsheet interface
- **Test Functions**: Validate system behavior
- **Error Messages**: Clear feedback on issues

### **For Administrators**
- **Debug Logging**: Comprehensive error tracking
- **Test Suites**: Automated validation tools
- **Configuration**: Adjustable parameters and thresholds

### **Additional Resources**
- **GRN_README.md**: Detailed GRN system documentation
- **Function Documentation**: Inline code comments
- **Process Flows**: Visual workflow diagrams
