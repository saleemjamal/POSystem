# GRN (Goods Receipt Note) System

## Overview
The GRN system manages the receipt of goods after Purchase Orders are sent to distributors. It tracks partial deliveries, calculates fulfillment rates, and automatically updates PO statuses based on receipt timelines.

## Key Features

### 1. GRN Creation
- Create GRNs for approved and sent POs
- Track invoice numbers, amounts, and dates
- Support for multiple GRNs per PO (partial deliveries)
- Auto-generated GRN numbers in format: `GRN-PO1234-001`

### 2. Status Management
- **Days 0-10**: First GRN changes PO status to "Partially Received"
- **Day 10+**: Auto-close POs with appropriate status
- **Late GRNs**: Mark as "Late Fulfillment" after closure

### 3. Fulfillment Tracking
- Calculate fulfillment percentage (GRN amount vs PO amount)
- Track cumulative fulfillment across multiple GRNs
- Automatic metrics updates when GRNs are approved

### 4. Approval Workflow
- Manual checkbox-based approval system
- **Auto-approval after 60 minutes** for streamlined processing
- Automatic date stamping on approval
- **ApprovalType tracking**: "Manual" or "Auto"
- OnEdit triggers for real-time updates

## File Structure

### Core Files
- `grnService.js` - Main GRN functionality
- `grnAutoApproval.js` - Auto-approval functionality
- `createGRNForm.html` - UI for GRN creation
- `grnTests.js` - Comprehensive test suite
- `main.js` - Updated with GRN menu items and onEdit trigger
- `constants.js` - GRN-related constants

#### Data Management
```javascript
getEligiblePOsForGRN()
validateAndGetPOData(poNumber)
generateGRNNumber(poNumber)
```

### Key Functions

#### GRN Creation
```javascript
createGRN(poNumber, invoiceNumber, grnAmount, grnDate, notes)
createGRNFromUI(poNumber, invoiceNumber, grnAmount, grnDateStr, notes)
```

#### Status Management
```javascript
handleGRNApproval(editEvent)
updatePOFulfillmentMetrics(poNumber)
closeOldPOs()
handleLateGRN(poNumber)
```

#### Auto-Approval
```javascript
autoApproveOldGRNs()              // Auto-approve GRNs older than 60 minutes
setupAutoApprovalTrigger()        // Set up hourly auto-approval trigger
removeAutoApprovalTrigger()       // Remove auto-approval trigger
```

## Sheet Structure

### GRNTracking Sheet
| Column | Description |
|--------|-------------|
| GRNNumber | Auto-generated unique identifier |
| PONumber | Related PO number |
| OutletName | Store location |
| Brand | Product brand |
| InvoiceNumber | Distributor invoice number |
| GRNDate | Date of receipt |
| GRNAmount | Amount received (₹) |
| Approved | Checkbox for approval |
| ApprovalType | "Manual" or "Auto" |
| DateApproved | Auto-filled on approval |
| Notes | Optional comments |

### POTracking Updates
New columns added:
- `FulfillmentAmount` - Total received amount
- `FulfillmentPercentage` - Fulfillment rate (%)

## Usage

### 1. Create GRN
1. Go to **PO System → Create GRN**
2. Select eligible PO from dropdown
3. Enter invoice details and amount
4. Submit to create GRN

### 2. Approve GRN
**Manual Approval:**
1. Open GRNTracking sheet
2. Check the "Approved" checkbox for the GRN
3. System auto-updates PO fulfillment metrics
4. ApprovalType set to "Manual"

**Auto-Approval:**
- GRNs older than 60 minutes are automatically approved
- ApprovalType set to "Auto"
- Run **PO System → Auto-Approve Old GRNs** manually, or set up trigger

### 3. Setup Auto-Approval (One-time)
1. Go to **PO System → Setup → Setup Auto-Approval Trigger**
2. This creates an hourly trigger to auto-approve old GRNs
3. To disable: **PO System → Setup → Remove Auto-Approval Trigger**
### 4. Manage Old POs
- Run **PO System → Close Old POs** to process 10+ day old POs
- Or set up time-based trigger for automation

## Status Flow

```
PO Created → Approved → Sent
    ↓
First GRN → "Partially Received"
    ↓
Day 10+ → Auto-close:
    - "Closed - Complete" (100% fulfilled)
    - "Closed - Partial" (partial fulfillment)
    - "Closed - No Receipt" (no GRNs)
    ↓
Late GRN → "Late Fulfillment"
```

## Testing

### Setup Test Data
```javascript
setupGRNTestData()  // Creates test POs
```

### Run Tests
```javascript
runGRNTests()               // Basic functionality tests
testGRNCreationWorkflow()   // End-to-end workflow
testPOStatusUpdates()       // Status change logic
testOldPOClosure()          // Auto-closure logic
runAllGRNTests()            // Complete test suite
```

### Cleanup
```javascript
cleanupGRNTestData()  // Removes test data
```

## Configuration

### Constants (in constants.js)
- `GRN_SHEET_NAME`: Sheet name for GRN tracking
- `PO_AUTO_CLOSE_DAYS`: Days before auto-closing POs (default: 10)
- `GRN_STATUS_MAPPING`: Status labels mapping

### Customization
- Modify status logic in `closeOldPOs()`
- Adjust fulfillment calculation in `updatePOFulfillmentMetrics()`
- Update UI elements in `createGRNForm.html`

## Integration Points

### With Existing PO System
- Uses POTracking sheet for PO data
- Updates PO status automatically
- Maintains data consistency

### Future Enhancements
- Time-based triggers for auto-closure
- Distributor performance metrics
- Integration with customer orders
- Advanced reporting dashboard

## Error Handling

The system includes comprehensive error handling:
- PO validation before GRN creation
- Graceful handling of missing data
- Debug logging for troubleshooting
- User-friendly error messages

## Maintenance

### Regular Tasks
1. Run `closeOldPOs()` weekly
2. Monitor GRN approval backlog
3. Review fulfillment metrics
4. Clean up old test data

### Monitoring
- Check DebugLog sheet for errors
- Review fulfillment percentages regularly
- Monitor late fulfillment trends
- Track distributor performance

## Troubleshooting

### Common Issues

#### GRN Creation Fails
- Check if PO exists and has correct status
- Verify PO is in eligible status (Sent, Partially Received, Late Fulfillment)
- Ensure all required fields are filled

#### Status Not Updating
- Verify onEdit trigger is working
- Check if GRN is properly approved
- Review debug logs for errors

#### Fulfillment Calculation Wrong
- Ensure GRNs are approved before calculation
- Check PO amount is correct
- Verify no duplicate GRNs exist

### Debug Functions
```javascript
debugLog(message)  // Logs to DebugLog sheet
validateAndGetPOData(poNumber)  // Check PO status
updatePOFulfillmentMetrics(poNumber)  // Recalculate metrics
```

## Performance Considerations

- GRN sheet will grow over time - consider archiving old records
- Fulfillment calculations run on each approval - optimize for large datasets
- Index frequently searched columns for better performance
- Regular cleanup of test data and old records

## Security & Access Control

- Same approval permissions as PO system
- GRN creation restricted to authorized users
- Read-only access for reporting users
- Audit trail through DateApproved column

## Reporting & Analytics

### Available Metrics
- Fulfillment rates by outlet/brand/distributor
- Time to fulfill (PO sent to first GRN)
- Partial delivery frequency
- Late fulfillment tracking

### Sample Reports
```javascript
// Fulfillment rate by outlet
SELECT OutletName, AVG(FulfillmentPercentage) as AvgFulfillment
FROM POTracking 
WHERE Status LIKE 'Closed%'
GROUP BY OutletName

// Time to fulfill analysis
SELECT PONumber, DateCreated, MIN(GRNDate) as FirstGRN,
       DATEDIFF(MIN(GRNDate), DateCreated) as DaysToFulfill
FROM POTracking p JOIN GRNTracking g ON p.PONumber = g.PONumber
WHERE g.Approved = TRUE
GROUP BY PONumber
```

## API Integration (Future)

The system is designed to support future API integrations:
- Webhook endpoints for distributor updates
- REST API for mobile GRN creation
- Integration with ERP systems
- Real-time inventory updates

## Best Practices

1. **Data Entry**
   - Always use proper invoice numbers
   - Verify amounts before submission
   - Add meaningful notes for tracking

2. **Approval Process**
   - Review GRNs promptly to maintain accurate metrics
   - Cross-check with physical receipts
   - Document any discrepancies in notes

3. **Monitoring**
   - Set up regular review cycles
   - Monitor for unusual patterns
   - Keep distributors informed of delays

4. **System Maintenance**
   - Regular backup of GRN data
   - Periodic cleanup of test records
   - Update constants as business rules change

## Support & Documentation

For additional help:
- Check the Help menu in the application
- Review test functions for usage examples
- Contact system administrator for access issues
- Refer to main PO system documentation for related processes
