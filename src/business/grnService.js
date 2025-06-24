// grnService.js
// GRN (Goods Receipt Note) creation, tracking, and status management

/**
 * Creates a new GRN and updates related PO status
 * @param {string} poNumber - The PO number this GRN relates to
 * @param {string} invoiceNumber - Invoice number from distributor
 * @param {number} grnAmount - Amount of this GRN
 * @param {Date} grnDate - Date of GRN (defaults to today)
 * @param {string} notes - Optional notes
 * @returns {Object} Success/error result with GRN number
 */
function createGRN(poNumber, invoiceNumber, grnAmount, grnDate = null, notes = '') {
  try {
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    
    // Validate PO exists
    const poData = validateAndGetPOData(poNumber);
    if (!poData.success) {
      return { success: false, message: poData.message };
    }
    
    // Generate GRN number
    const grnNumber = generateGRNNumber(poNumber);
    
    // Get or create GRN sheet
    const grnSheet = getOrCreateGRNSheet(ss);
    
    // Always use a full timestamp for GRNDate
    let grnDateValue;
    if (grnDate) {
      // If grnDate is a string (from HTML input), parse as local date and add current time
      if (typeof grnDate === 'string' && grnDate.length === 10) {
        const parts = grnDate.split('-');
        const now = new Date();
        grnDateValue = new Date(
          Number(parts[0]),
          Number(parts[1]) - 1,
          Number(parts[2]),
          now.getHours(),
          now.getMinutes(),
          now.getSeconds()
        );
      } else {
        grnDateValue = new Date(grnDate);
      }
    } else {
      grnDateValue = new Date();
    }
    
    // Create GRN record
    const grnRecord = [
      grnNumber,
      poNumber,
      poData.outlet,
      poData.brand,
      invoiceNumber,
      grnDateValue, // Always a full timestamp
      Number(grnAmount),
      false, // Approved checkbox (will be formatted as checkbox by column validation)
      '', // ApprovalType (will be filled when approved)
      '', // Date Approved (will be filled when approved)
      notes || ''
    ];
    
    grnSheet.appendRow(grnRecord);
    // Ensure the Approved cell in the new row is a checkbox
    const lastRow = grnSheet.getLastRow();
    grnSheet.getRange(lastRow, 8).setDataValidation(
      SpreadsheetApp.newDataValidation().requireCheckbox().build()
    );
    
    // Update PO status if this is the first GRN
    updatePOStatusOnGRNCreation(poNumber, poData);
    
    debugLog(`GRN created: ${grnNumber} for PO: ${poNumber}`);
    
    return {
      success: true,
      message: `GRN ${grnNumber} created successfully`,
      grnNumber: grnNumber
    };
    
  } catch (error) {
    debugLog(`Error creating GRN: ${error.message}`);
    return {
      success: false,
      message: `Error creating GRN: ${error.message}`
    };
  }
}

/**
 * Validates PO exists and returns PO data
 * @param {string} poNumber
 * @returns {Object} Validation result with PO data
 */
function validateAndGetPOData(poNumber) {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const poSheet = ss.getSheetByName('POTracking');
  
  if (!poSheet) {
    return { success: false, message: 'POTracking sheet not found' };
  }
  
  const data = poSheet.getDataRange().getValues();
  const headers = data[0];
  const poCol = headers.indexOf('PONumber');
  const outletCol = headers.indexOf('OutletName');
  const brandCol = headers.indexOf('Brand');
  const statusCol = headers.indexOf('Status');
  
  if (poCol === -1) {
    return { success: false, message: 'PONumber column not found in POTracking' };
  }
  
  // Find PO row
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][poCol]) === String(poNumber)) {
      const status = data[i][statusCol];
      
      // Check if PO is in valid state for GRN creation
      if (!['Sent', 'Partially Received', 'Late Fulfillment'].includes(status)) {
        return { 
          success: false, 
          message: `Cannot create GRN for PO with status: ${status}` 
        };
      }
      
      return {
        success: true,
        outlet: data[i][outletCol],
        brand: data[i][brandCol],
        status: status,
        rowIndex: i
      };
    }
  }
  
  return { success: false, message: `PO ${poNumber} not found` };
}

/**
 * Generates sequential GRN number in format GRN-PO1234-001
 * @param {string} poNumber
 * @returns {string} GRN number
 */
function generateGRNNumber(poNumber) {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const grnSheet = getOrCreateGRNSheet(ss);
  
  // Count existing GRNs for this PO
  const data = grnSheet.getDataRange().getValues();
  if (data.length <= 1) return `GRN-${poNumber}-001`;
  
  const headers = data[0];
  const poCol = headers.indexOf('PONumber');
  
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][poCol]) === String(poNumber)) {
      count++;
    }
  }
  
  const sequence = String(count + 1).padStart(3, '0');
  return `GRN-${poNumber}-${sequence}`;
}

/**
 * Gets or creates the GRNTracking sheet
 * @param {Spreadsheet} ss
 * @returns {Sheet} GRN sheet
 */
function getOrCreateGRNSheet(ss) {
  let grnSheet = ss.getSheetByName('GRNTracking');
  
  if (!grnSheet) {
    grnSheet = ss.insertSheet('GRNTracking');
    
    // Create headers
    const headers = [
      'GRNNumber', 'PONumber', 'OutletName', 'Brand', 
      'InvoiceNumber', 'GRNDate', 'GRNAmount', 'Approved', 
      'ApprovalType', 'DateApproved', 'Notes'
    ];
    
    grnSheet.appendRow(headers);
    
    // Format the sheet
    const headerRange = grnSheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#e1f5fe');
    
    // Set column widths
    grnSheet.setColumnWidth(1, 120); // GRNNumber
    grnSheet.setColumnWidth(2, 100); // PONumber
    grnSheet.setColumnWidth(3, 200); // OutletName
    grnSheet.setColumnWidth(4, 120); // Brand
    grnSheet.setColumnWidth(5, 120); // InvoiceNumber
    grnSheet.setColumnWidth(6, 100); // GRNDate
    grnSheet.setColumnWidth(7, 100); // GRNAmount
    grnSheet.setColumnWidth(8, 80);  // Approved
    grnSheet.setColumnWidth(9, 80);  // ApprovalType
    grnSheet.setColumnWidth(10, 100); // DateApproved
    grnSheet.setColumnWidth(11, 200); // Notes
    
    // Set number formats
    grnSheet.getRange('F:F').setNumberFormat('dd/mm/yyyy'); // GRNDate
    grnSheet.getRange('G:G').setNumberFormat('"₹"#,##,##0.00'); // GRNAmount
    grnSheet.getRange('J:J').setNumberFormat('dd/mm/yyyy'); // DateApproved
    
    // Set checkbox validation for Approved column
    grnSheet.getRange('H2:H1000').setDataValidation(
      SpreadsheetApp.newDataValidation().requireCheckbox().build()
    );
  }
  
  return grnSheet;
}

/**
 * Updates PO status when first GRN is created
 * @param {string} poNumber
 * @param {Object} poData
 */
function updatePOStatusOnGRNCreation(poNumber, poData) {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const poSheet = ss.getSheetByName('POTracking');
  const data = poSheet.getDataRange().getValues();
  const headers = data[0];
  
  const poCol = headers.indexOf('PONumber');
  const statusCol = headers.indexOf('Status');
  
  // Find PO row and update status if currently "Sent"
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][poCol]) === String(poNumber)) {
      const currentStatus = data[i][statusCol];
      if (currentStatus === 'Sent') {
        poSheet.getRange(i + 1, statusCol + 1).setValue('Partially Received');
        debugLog(`Updated PO ${poNumber} status to 'Partially Received'`);
      }
      break;
    }
  }
}

/**
 * Handles GRN approval and updates PO status accordingly
 * Called by onEdit trigger when Approved checkbox is changed
 * @param {Object} editEvent - The edit event from onEdit
 */
function handleGRNApproval(editEvent) {
  const sheet = editEvent.source.getActiveSheet();
  if (sheet.getName() !== 'GRNTracking') return;
  
  const range = editEvent.range;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const approvedCol = headers.indexOf('Approved');
  
  // Check if the edit was to the Approved column
  if (range.getColumn() !== approvedCol + 1) return;
  
  const row = range.getRow();
  if (row === 1) return; // Skip header row
  
  const isApproved = range.getValue() === true;
  if (!isApproved) return;
  
  // Set approval date
  const dateApprovedCol = headers.indexOf('DateApproved');
  if (dateApprovedCol !== -1) {
    sheet.getRange(row, dateApprovedCol + 1).setValue(new Date());
  }
  
  // Set approval type to Manual
  const approvalTypeCol = headers.indexOf('ApprovalType');
  if (approvalTypeCol !== -1) {
    sheet.getRange(row, approvalTypeCol + 1).setValue('Manual');
  }
  
  // Get GRN data
  const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const poNumber = rowData[headers.indexOf('PONumber')];
  
  // Update PO fulfillment metrics
  updatePOFulfillmentMetrics(poNumber);
  
  debugLog(`GRN approved for PO: ${poNumber}`);
}

/**
 * Updates PO fulfillment metrics and status based on approved GRNs
 * @param {string} poNumber
 */
function updatePOFulfillmentMetrics(poNumber) {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  
  // Calculate total approved GRN amount for this PO
  const grnSheet = ss.getSheetByName('GRNTracking');
  const grnData = grnSheet.getDataRange().getValues();
  const grnHeaders = grnData[0];
  
  const grnPoCol = grnHeaders.indexOf('PONumber');
  const grnAmountCol = grnHeaders.indexOf('GRNAmount');
  const grnApprovedCol = grnHeaders.indexOf('Approved');
  
  let totalGRNAmount = 0;
  for (let i = 1; i < grnData.length; i++) {
    if (String(grnData[i][grnPoCol]) === String(poNumber) && 
        grnData[i][grnApprovedCol] === true) {
      totalGRNAmount += Number(grnData[i][grnAmountCol]);
    }
  }
  
  // Get PO amount and update fulfillment
  const poSheet = ss.getSheetByName('POTracking');
  const poData = poSheet.getDataRange().getValues();
  const poHeaders = poData[0];
  
  const poNumCol = poHeaders.indexOf('PONumber');
  const poAmountCol = poHeaders.indexOf('POAmount');
  const statusCol = poHeaders.indexOf('Status');
  let fulfillmentCol = poHeaders.indexOf('FulfillmentAmount');
  let fulfillmentPctCol = poHeaders.indexOf('FulfillmentPercentage');
  
  // Add columns if they don't exist
  if (fulfillmentCol === -1) {
    poSheet.getRange(1, poSheet.getLastColumn() + 1).setValue('FulfillmentAmount');
    fulfillmentCol = poSheet.getLastColumn() - 1;
  }
  if (fulfillmentPctCol === -1) {
    poSheet.getRange(1, poSheet.getLastColumn() + 1).setValue('FulfillmentPercentage');
    fulfillmentPctCol = poSheet.getLastColumn() - 1;
  }
  
  // Update PO fulfillment data
  for (let i = 1; i < poData.length; i++) {
    if (String(poData[i][poNumCol]) === String(poNumber)) {
      const poAmount = Number(poData[i][poAmountCol]);
      const fulfillmentPct = poAmount > 0 ? (totalGRNAmount / poAmount) * 100 : 0;
      const currentStatus = poData[i][statusCol];
      
      poSheet.getRange(i + 1, fulfillmentCol + 1).setValue(totalGRNAmount)
             .setNumberFormat('"₹"#,##,##0.00');
      poSheet.getRange(i + 1, fulfillmentPctCol + 1).setValue(fulfillmentPct / 100)
             .setNumberFormat('0.00%');
      
      // Update status based on fulfillment if currently "Partially Received"
      if (currentStatus === 'Partially Received' && fulfillmentPct >= 100) {
        poSheet.getRange(i + 1, statusCol + 1).setValue('Closed - Complete');
        debugLog(`PO ${poNumber} status updated to 'Closed - Complete' (100% fulfilled)`);
      }
      
      debugLog(`Updated fulfillment for PO ${poNumber}: ${fulfillmentPct.toFixed(1)}%`);
      break;
    }
  }
}

/**
 * Closes old POs (10+ days) and handles late fulfillment
 * Should be called manually or via time trigger
 */
function closeOldPOs() {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const poSheet = ss.getSheetByName('POTracking');
  if (!poSheet) return;
  
  const data = poSheet.getDataRange().getValues();
  const headers = data[0];
  
  const statusCol = headers.indexOf('Status');
  const emailSentCol = headers.indexOf('EmailSent');
  const dateCreatedCol = headers.indexOf('DateCreated');
  const poNumCol = headers.indexOf('PONumber');
  
  if (statusCol === -1 || dateCreatedCol === -1) return;
  
  const today = new Date();
  const tenDaysAgo = new Date(today.getTime() - (10 * 24 * 60 * 60 * 1000));
  
  for (let i = 1; i < data.length; i++) {
    const status = data[i][statusCol];
    const dateCreated = new Date(data[i][dateCreatedCol]);
    const emailSent = data[i][emailSentCol];
    const poNumber = data[i][poNumCol];
    
    // Only process POs that are old enough and in correct status
    if (dateCreated < tenDaysAgo && 
        emailSent === true && 
        ['Sent', 'Partially Received'].includes(status)) {
      
      // Calculate fulfillment percentage
      const fulfillmentPctCol = headers.indexOf('FulfillmentPercentage');
      let fulfillmentPct = 0;
      
      if (fulfillmentPctCol !== -1) {
        fulfillmentPct = Number(data[i][fulfillmentPctCol]) * 100;
      }
      
      // Determine new status
      let newStatus;
      if (fulfillmentPct >= 100) {
        newStatus = 'Closed - Complete';
      } else if (fulfillmentPct > 0) {
        newStatus = 'Closed - Partial';
      } else {
        newStatus = 'Closed - No Receipt';
      }
      
      poSheet.getRange(i + 1, statusCol + 1).setValue(newStatus);
      debugLog(`Auto-closed PO ${poNumber} with status: ${newStatus}`);
    }
  }
}

/**
 * Handles late GRN creation (after PO was auto-closed)
 * Updates status to "Late Fulfillment"
 * @param {string} poNumber
 */
function handleLateGRN(poNumber) {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const poSheet = ss.getSheetByName('POTracking');
  const data = poSheet.getDataRange().getValues();
  const headers = data[0];
  
  const poCol = headers.indexOf('PONumber');
  const statusCol = headers.indexOf('Status');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][poCol]) === String(poNumber)) {
      const currentStatus = data[i][statusCol];
      
      // If PO was closed, mark as late fulfillment
      if (currentStatus.startsWith('Closed')) {
        poSheet.getRange(i + 1, statusCol + 1).setValue('Late Fulfillment');
        debugLog(`Updated PO ${poNumber} to Late Fulfillment`);
      }
      break;
    }
  }
}

/**
 * UI function to create GRN from form
 * @param {string} poNumber
 * @param {string} invoiceNumber  
 * @param {number} grnAmount
 * @param {string} grnDateStr - Date string in format 'YYYY-MM-DD'
 * @param {string} notes
 * @returns {Object} Result object
 */
function createGRNFromUI(poNumber, invoiceNumber, grnAmount, grnDateStr, notes) {
  try {
    const grnDate = grnDateStr ? new Date(grnDateStr) : new Date();
    return createGRN(poNumber, invoiceNumber, grnAmount, grnDate, notes);
  } catch (error) {
    return {
      success: false,
      message: `Error creating GRN: ${error.message}`
    };
  }
}

/**
 * Gets list of POs that can have GRNs created
 * @returns {Array} Array of PO objects with number, outlet, brand, status
 */
function getEligiblePOsForGRN() {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const poSheet = ss.getSheetByName('POTracking');
  if (!poSheet) return [];
  
  const data = poSheet.getDataRange().getValues();
  const headers = data[0];
  
  const poCol = headers.indexOf('PONumber');
  const outletCol = headers.indexOf('OutletName');
  const brandCol = headers.indexOf('Brand');
  const statusCol = headers.indexOf('Status');
  
  const eligiblePOs = [];
  const validStatuses = ['Sent', 'Partially Received', 'Late Fulfillment'];
  
  for (let i = 1; i < data.length; i++) {
    const status = data[i][statusCol];
    if (validStatuses.includes(status)) {
      eligiblePOs.push({
        poNumber: data[i][poCol],
        outlet: data[i][outletCol],
        brand: data[i][brandCol],
        status: status
      });
    }
  }
  
  return eligiblePOs.sort((a, b) => b.poNumber - a.poNumber); // Latest first
}
