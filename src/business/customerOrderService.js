// customerOrderService.js
// Customer Order creation, tracking, and management

/**
 * Creates a new Customer Order
 * @param {Object} orderData - Customer order data
 * @returns {Object} Success/error result with CO number
 */
function createCustomerOrder(orderData) {
  try {
    // Validate required fields
    const required = ['outletName', 'brand', 'customerName', 'items'];
    for (const field of required) {
      if (!orderData[field]) {
        return { success: false, message: `Missing required field: ${field}` };
      }
    }

    // Validate items array
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      return { success: false, message: 'At least one item is required' };
    }

    // Validate each item
    for (let i = 0; i < orderData.items.length; i++) {
      const item = orderData.items[i];
      if (!item.itemCode || !item.quantity || item.quantity <= 0) {
        return { success: false, message: `Item ${i + 1}: Missing item code or invalid quantity` };
      }
      if (item.itemCode === 'NEW_ITEM') {
        if (!item.itemName) {
          return { success: false, message: `Item ${i + 1}: New items must have a name` };
        }
        if (!item.costPrice || item.costPrice <= 0) {
          return { success: false, message: `Item ${i + 1}: New items must have a valid cost price` };
        }
      }
    }

    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    const coSheet = getOrCreateCustomerOrdersSheet(ss);
    const lineItemsSheet = getOrCreateCOLineItemsSheet(ss);
    
    // Generate CO number with brand
    //debugLog(`Generating CO number for ${orderData.outletName} - ${orderData.brand}`);
    const coNumber = generateCONumber(orderData.outletName, orderData.brand);
    debugLog(`CO Number: ${coNumber}`);
    
    // Get or create customer
    const customer = getOrCreateCustomer(orderData);
    
    // Lookup distributor information
    const normalizedOutletName = orderData.outletName.replace(/\s+/g, ' ').trim();
    const distributorName = lookupDistributor(orderData.brand, normalizedOutletName);
    const distributorEmail = lookupDistributorEmail(distributorName);
    debugLog(`Distributor Name: ${distributorName}`);
    debugLog(`Distributor Email: ${distributorEmail}`);
    // Calculate total quantity
    const totalQuantity = orderData.items.reduce((sum, item) => sum + Number(item.quantity), 0);
    
    // Calculate CO value and check for new items
    let coValue = 0;
    let hasNewItems = false;
    
    for (const item of orderData.items) {
      if (item.itemCode === 'NEW_ITEM') {
        hasNewItems = true;
        coValue += Number(item.quantity) * Number(item.costPrice);
      } else {
        const itemCostPrice = lookupItemCostPrice(item.itemCode);
        coValue += Number(item.quantity) * itemCostPrice;
      }
    }
    
    // Determine if auto-approval is allowed
    const requiresManualApproval = hasNewItems || coValue >= CO_AUTO_APPROVE_THRESHOLD;
    const autoApproved = !requiresManualApproval;
    
    debugLog(`CO Value: ₹${coValue}, Has New Items: ${hasNewItems}, Auto-approved: ${autoApproved}`);
    
    // Create CO header record
    const coRecord = [
      coNumber,
      orderData.outletName,
      orderData.brand,
      orderData.customerName,
      orderData.customerEmail || '',
      orderData.customerPhone || '',
      totalQuantity,
      coValue, // CO Value
      autoApproved ? CO_STATUS.APPROVED : CO_STATUS.PENDING,
      new Date(),
      autoApproved, // Approved checkbox (true for auto, false for manual)
      autoApproved, // Sent checkbox (true for auto, false for manual)
      autoApproved ? CO_APPROVAL_TYPES.AUTO : '', // ApprovalType
      autoApproved ? new Date() : '', // Date Approved
      orderData.notes || '',
      distributorName,
      distributorEmail,
      '' // Link (filled later when converted to PO)
    ];
    
    coSheet.appendRow(coRecord);
    
    // Ensure the Approved and Sent cells in the new row are checkboxes
    const lastRow = coSheet.getLastRow();
    coSheet.getRange(lastRow, 11).setDataValidation(
      SpreadsheetApp.newDataValidation().requireCheckbox().build()
    );
    coSheet.getRange(lastRow, 12).setDataValidation(
      SpreadsheetApp.newDataValidation().requireCheckbox().build()
    );
    
    // Create line items
    orderData.items.forEach((item, index) => {
      const itemInfo = validateItemCode(item.itemCode, item.itemName);
      
      // Get cost price - from item data for NEW_ITEM or lookup for existing items
      const itemCostPrice = item.itemCode === 'NEW_ITEM' 
        ? Number(item.costPrice) 
        : lookupItemCostPrice(item.itemCode);
      
      const lineItemRecord = [
        coNumber,
        index + 1, // LineNumber
        item.itemCode,
        itemInfo.itemName,
        Number(item.quantity),
        itemInfo.isNewItem ? 'new_item' : 'existing',
        itemCostPrice, // ItemCostPrice
        item.notes || ''
      ];
      
      lineItemsSheet.appendRow(lineItemRecord);
    });
    
    // If auto-approved, send email immediately
    if (autoApproved) {
      try {
        sendCOToDistributor(lastRow, coSheet);
        debugLog(`Auto-approved CO ${coNumber} sent to distributor immediately`);
      } catch (emailError) {
        debugLog(`Error sending auto-approved CO email: ${emailError.message}`);
        // Update ApprovalType to show email error but don't fail the CO creation
        coSheet.getRange(lastRow, 12).setValue(`AUTO - Email Error: ${emailError.message}`);
      }
    }
    
    debugLog(`Customer Order created: ${coNumber} with ${orderData.items.length} items, Value: ₹${coValue}, Auto-approved: ${autoApproved}`);
    
    const approvalMessage = autoApproved 
      ? ` (Auto-approved and sent to distributor)`
      : ` (Pending approval - value ₹${coValue.toLocaleString('en-IN')}${hasNewItems ? ', contains new items' : ''})`;
    
    return {
      success: true,
      message: `Customer Order ${coNumber} created successfully with ${orderData.items.length} items${approvalMessage}`,
      coNumber: coNumber,
      totalItems: orderData.items.length,
      coValue: coValue,
      autoApproved: autoApproved
    };
    
  } catch (error) {
    debugLog(`Error creating customer order: ${error.message}`);
    return {
      success: false,
      message: `Error creating customer order: ${error.message}`
    };
  }
}

/**
 * Generates sequential CO number in format CO-OUTLET-BRAND-YYMMDD-001
 * @param {string} outletName
 * @param {string} brandName
 * @returns {string} CO number
 */
function generateCONumber(outletName, brandName) {
  // Normalize outlet name by removing extra spaces
  const normalizedOutletName = outletName.replace(/\s+/g, ' ').trim();
  const outletCode = outletShort[normalizedOutletName] || 'UNK';
  
  // Normalize brand name for CO number (remove spaces, limit length)
  const brandCode = brandName.replace(/\s+/g, '').substring(0, 6).toUpperCase();
  debugLog(`Brand Code: ${brandCode}`);
  
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMdd');
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const coSheet = getOrCreateCustomerOrdersSheet(ss);
  
  // Count existing COs for today with same outlet and brand
  const data = coSheet.getDataRange().getValues();
  if (data.length <= 1) return `CO-${outletCode}-${brandCode}-${today}-001`;

  
  const headers = data[0];
  const coCol = headers.indexOf('CONumber');
  const prefix = `CO-${outletCode}-${brandCode}-${today}`;
  
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][coCol]).startsWith(prefix)) {
      count++;
    }
  }
  
  const sequence = String(count + 1).padStart(3, '0');
  return `${prefix}-${sequence}`;
}

/**
 * Gets or creates CustomerOrders sheet
 * @param {Spreadsheet} ss
 * @returns {Sheet} CustomerOrders sheet
 */
function getOrCreateCustomerOrdersSheet(ss) {
  let coSheet = ss.getSheetByName('CustomerOrders');
  
  if (!coSheet) {
    coSheet = ss.insertSheet('CustomerOrders');
    
    // Create headers
    const headers = [
      'CONumber', 'OutletName', 'Brand', 'CustomerName', 
      'CustomerEmail', 'CustomerPhone', 'TotalQuantity', 'COValue', 'Status',
      'DateCreated', 'Approved', 'Sent', 'ApprovalType', 'DateApproved', 'Notes',
      'DistributorName', 'DistributorEmail', 'Link'
    ];
    
    coSheet.appendRow(headers);
    
    // Format the sheet
    const headerRange = coSheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#e1f5fe');
    
    // Set column widths
    coSheet.setColumnWidth(1, 120);  // CONumber
    coSheet.setColumnWidth(2, 200);  // OutletName
    coSheet.setColumnWidth(3, 120);  // Brand
    coSheet.setColumnWidth(4, 150);  // CustomerName
    coSheet.setColumnWidth(5, 180);  // CustomerEmail
    coSheet.setColumnWidth(6, 120);  // CustomerPhone
    coSheet.setColumnWidth(7, 100);  // TotalQuantity
    coSheet.setColumnWidth(8, 120);  // COValue
    coSheet.setColumnWidth(10, 100); // DateCreated
    
    // Set number formats
    coSheet.getRange('J:J').setNumberFormat('dd/mm/yyyy'); // DateCreated
    coSheet.getRange('G:G').setNumberFormat('0'); // TotalQuantity
    coSheet.getRange('H:H').setNumberFormat('"₹"#,##,##0.00'); // COValue
  }
  
  return coSheet;
}

/**
 * Gets or creates customer in Customer Master
 * @param {Object} customerData
 * @returns {Object} Customer information
 */
function getOrCreateCustomer(customerData) {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const customerSheet = getOrCreateCustomerMasterSheet(ss);
  
  // Check if customer exists
  const data = customerSheet.getDataRange().getValues();
  const headers = data[0];
  
  const emailCol = headers.indexOf('CustomerEmail');
  const phoneCol = headers.indexOf('CustomerPhone');
  const nameCol = headers.indexOf('CustomerName');
  
  // Look for existing customer by email or phone
  for (let i = 1; i < data.length; i++) {
    if ((customerData.customerEmail && data[i][emailCol] === customerData.customerEmail) ||
        (customerData.customerPhone && data[i][phoneCol] === customerData.customerPhone)) {
      
      // Update last order date and increment total orders
      const totalOrdersCol = headers.indexOf('TotalOrders');
      const lastOrderCol = headers.indexOf('LastOrderDate');
      
      customerSheet.getRange(i + 1, totalOrdersCol + 1).setValue((data[i][totalOrdersCol] || 0) + 1);
      customerSheet.getRange(i + 1, lastOrderCol + 1).setValue(new Date());
      
      return { customerId: data[i][0], isNew: false };
    }
  }
  
  // Create new customer
  const customerId = generateCustomerId();
  const customerRecord = [
    customerId,
    customerData.customerName,
    customerData.customerEmail || '',
    customerData.customerPhone || '',
    customerData.outletName,
    new Date(), // DateFirstOrder
    1, // TotalOrders
    new Date() // LastOrderDate
  ];
  
  customerSheet.appendRow(customerRecord);
  return { customerId: customerId, isNew: true };
}

/**
 * Gets or creates Customer Master sheet
 * @param {Spreadsheet} ss
 * @returns {Sheet} Customer Master sheet
 */
function getOrCreateCustomerMasterSheet(ss) {
  let customerSheet = ss.getSheetByName('CustomerMaster');
  
  if (!customerSheet) {
    customerSheet = ss.insertSheet('CustomerMaster');
    
    // Headers for Customer Master
    const headers = [
      'CustomerID', 'CustomerName', 'CustomerEmail', 
      'CustomerPhone', 'OutletName',
      'DateFirstOrder', 'TotalOrders', 'LastOrderDate'
    ];
    
    customerSheet.appendRow(headers);
    
    // Format header
    const headerRange = customerSheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#e8f5e8');
    
    // Set column widths
    customerSheet.setColumnWidth(1, 120);  // CustomerID
    customerSheet.setColumnWidth(2, 150);  // CustomerName
    customerSheet.setColumnWidth(3, 180);  // CustomerEmail
    customerSheet.setColumnWidth(4, 120);  // CustomerPhone
    customerSheet.setColumnWidth(6, 200);  // OutletName
    
    // Format columns
    customerSheet.getRange('G:G').setNumberFormat('dd/mm/yyyy'); // DateFirstOrder
    customerSheet.getRange('I:I').setNumberFormat('dd/mm/yyyy'); // LastOrderDate
    customerSheet.getRange('H:H').setNumberFormat('0'); // TotalOrders
  }
  
  return customerSheet;
}

/**
 * Gets or creates COLineItems sheet
 * @param {Spreadsheet} ss
 * @returns {Sheet} COLineItems sheet
 */
function getOrCreateCOLineItemsSheet(ss) {
  let lineItemsSheet = ss.getSheetByName('COLineItems');
  
  if (!lineItemsSheet) {
    lineItemsSheet = ss.insertSheet('COLineItems');
    
    // Create headers
    const headers = [
      'CONumber', 'LineNumber', 'ItemCode', 'ItemName', 
      'Quantity', 'ItemType', 'ItemCostPrice', 'Notes'
    ];
    
    lineItemsSheet.appendRow(headers);
    
    // Format the sheet
    const headerRange = lineItemsSheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#fff3e0');
    
    // Set column widths
    lineItemsSheet.setColumnWidth(1, 120);  // CONumber
    lineItemsSheet.setColumnWidth(2, 80);   // LineNumber
    lineItemsSheet.setColumnWidth(3, 120);  // ItemCode
    lineItemsSheet.setColumnWidth(4, 250);  // ItemName
    lineItemsSheet.setColumnWidth(5, 80);   // Quantity
    lineItemsSheet.setColumnWidth(6, 100);  // ItemType
    lineItemsSheet.setColumnWidth(7, 120);  // ItemCostPrice
    lineItemsSheet.setColumnWidth(8, 200);  // Notes
    
    // Set number formats
    lineItemsSheet.getRange('B:B').setNumberFormat('0'); // LineNumber
    lineItemsSheet.getRange('E:E').setNumberFormat('0'); // Quantity
    lineItemsSheet.getRange('G:G').setNumberFormat('"₹"#,##,##0.00'); // ItemCostPrice
  }
  
  return lineItemsSheet;
}

/**
 * Generates unique customer ID
 * @returns {string} Customer ID
 */
function generateCustomerId() {
  const timestamp = new Date().getTime();
  return `CUST${timestamp.toString().slice(-8)}`;
}

/**
 * Looks up cost price for an item from ItemMaster
 * @param {string} itemCode
 * @returns {number} Cost price or 0 if not found
 */
function lookupItemCostPrice(itemCode) {
  try {
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    const itemSheet = ss.getSheetByName('ItemMaster');
    
    if (!itemSheet) {
      return 0;
    }
    
    const data = itemSheet.getDataRange().getValues();
    
    // ItemMaster columns: Brand=A(0), ItemName=B(1), SKU=C(2), Avg.Cost Price=D(3)
    const skuCol = 2;
    const costPriceCol = 3;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][skuCol] && data[i][skuCol].toString() === itemCode.toString()) {
        return parseFloat(data[i][costPriceCol]) || 0;
      }
    }
    
    return 0;
    
  } catch (error) {
    debugLog(`Error looking up cost price for ${itemCode}: ${error.message}`);
    return 0;
  }
}

/**
 * Validates item code against SKU master
 * @param {string} itemCode
 * @param {string} itemName
 * @returns {Object} Item validation result
 */
function validateItemCode(itemCode, itemName) {
  if (itemCode === 'NEW_ITEM') {
    return {
      isValid: true,
      itemName: itemName || 'New Item',
      isNewItem: true
    };
  }
  
  // Check against ItemMaster sheet
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const itemSheet = ss.getSheetByName('ItemMaster');
  
  if (!itemSheet) {
    return {
      isValid: false,
      itemName: itemName || itemCode,
      isNewItem: false,
      error: 'ItemMaster sheet not found'
    };
  }
  
  const data = itemSheet.getDataRange().getValues();
  
  // ItemMaster columns: Brand=A(0), ItemName=B(1), SKU=C(2)
  const skuCol = 2;
  const nameCol = 1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][skuCol] && data[i][skuCol].toString() === itemCode.toString()) {
      return {
        isValid: true,
        itemName: data[i][nameCol] || itemCode,
        isNewItem: false
      };
    }
  }
  
  return {
    isValid: false,
    itemName: itemName || itemCode,
    isNewItem: false,
    error: `Item code ${itemCode} not found in ItemMaster`
  };
}

/**
 * Validates CustomerOrders sheet structure and logs any issues
 * @returns {boolean} True if valid, false otherwise
 */
function validateCOSheetStructure() {
  try {
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    const coSheet = ss.getSheetByName('CustomerOrders');
    
    if (!coSheet) {
      debugLog('ERROR: CustomerOrders sheet does not exist');
      return false;
    }
    
    const columnMap = getCOColumnMapping(coSheet);
    if (!columnMap) {
      debugLog('ERROR: CustomerOrders sheet failed column validation');
      return false;
    }
    
    // Expected column order
    const expectedColumns = [
      'CONumber', 'OutletName', 'Brand', 'CustomerName', 
      'CustomerEmail', 'CustomerPhone', 'TotalQuantity', 'COValue', 'Status',
      'DateCreated', 'Approved', 'Sent', 'ApprovalType', 'DateApproved', 'Notes',
      'DistributorName', 'DistributorEmail', 'Link'
    ];
    
    const actualHeaders = coSheet.getRange(1, 1, 1, coSheet.getLastColumn()).getValues()[0];
    
    // Check if all expected columns exist
    const missingColumns = expectedColumns.filter(col => !(col in columnMap));
    if (missingColumns.length > 0) {
      debugLog(`WARNING: CustomerOrders sheet missing columns: ${missingColumns.join(', ')}`);
    }
    
    // Check for unexpected columns
    const actualColumns = actualHeaders.filter(h => h && h.trim());
    const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
    if (extraColumns.length > 0) {
      debugLog(`INFO: CustomerOrders sheet has extra columns: ${extraColumns.join(', ')}`);
    }
    
    debugLog(`CustomerOrders sheet validation successful. Found ${actualColumns.length} columns.`);
    return true;
    
  } catch (error) {
    debugLog(`Error validating CustomerOrders sheet structure: ${error.message}`);
    return false;
  }
}

/**
 * UI function to create CO from form
 * @param {Object} formData - Form data from UI
 * @returns {Object} Result object
 */
function createCOFromUI(formData) {
  try {
    return createCustomerOrder(formData);
  } catch (error) {
    return {
      success: false,
      message: `Error creating customer order: ${error.message}`
    };
  }
}

/**
 * Processes approved Customer Orders and sends emails to distributors
 * Called by installable trigger on sheet edit
 * @param {Event} e - The edit event
 */
function processCOApprovals(e) {
  try {
    debugLog(`=== PROCESS CO APPROVALS TRIGGERED ===`);
    debugLog(`Event details: ${JSON.stringify({
      hasEvent: !!e,
      hasSource: !!(e && e.source),
      sheetName: e && e.source ? e.source.getActiveSheet().getName() : 'unknown'
    })}`);
    
    // Only process if this is the CustomerOrders sheet
    if (!e || !e.source || e.source.getActiveSheet().getName() !== 'CustomerOrders') {
      debugLog(`Exiting - not CustomerOrders sheet`);
      return;
    }
    
    const sheet = e.source.getActiveSheet();
    debugLog(`Processing CO approval for sheet: ${sheet.getName()}`);
    
    // Get column mapping
    const columnMap = getCOColumnMapping(sheet);
    if (!columnMap) {
      debugLog('CRITICAL ERROR: Failed to get column mapping for CO approval processing');
      return;
    }
    debugLog(`Column mapping retrieved: ${JSON.stringify(columnMap)}`);
    
    // Only process if the Approved column was changed
    const editedColumn = e.range.getColumn();
    const approvedColumn = columnMap['Approved'] + 1; // Convert to 1-based
    
    debugLog(`Edited column: ${editedColumn}, Approved column: ${approvedColumn}`);
    
    if (editedColumn !== approvedColumn) {
      debugLog(`Exiting - edited column (${editedColumn}) is not the Approved column (${approvedColumn})`);
      return;
    }
    
    const editedRow = e.range.getRow();
    debugLog(`Processing approval for row: ${editedRow}`);
    
    // Skip header row
    if (editedRow === 1) {
      debugLog(`Exiting - header row edited`);
      return;
    }
    
    // Get the data for this row
    const rowData = sheet.getRange(editedRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    debugLog(`Row data: ${JSON.stringify(rowData.slice(0, 8))}...`);
    
    // Check if this CO was just approved and hasn't been sent yet
    const isApproved = rowData[columnMap['Approved']];
    const approvalType = rowData[columnMap['ApprovalType']];
    const coNumber = rowData[columnMap['CONumber']];
    
    debugLog(`CO ${coNumber} - isApproved: ${isApproved}, approvalType: ${approvalType}`);
    
    if (isApproved && !approvalType) {
      debugLog(`Triggering sendCOToDistributor for CO: ${coNumber}`);
      sendCOToDistributor(editedRow, sheet);
    } else {
      debugLog(`No action needed - CO ${coNumber} already processed or not approved`);
    }
    
    debugLog(`=== END PROCESS CO APPROVALS ===`);
    
  } catch (error) {
    debugLog(`CRITICAL ERROR in processCOApprovals: ${error.message}`);
    debugLog(`Error stack: ${error.stack}`);
  }
}

/**
 * Gets column mapping for CustomerOrders sheet with validation
 * @param {Sheet} sheet - CustomerOrders sheet
 * @returns {Object} Column mapping object or null if validation fails
 */
function getCOColumnMapping(sheet) {
  try {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Required columns for CO processing
    const requiredColumns = [
      'CONumber', 'OutletName', 'Brand', 'CustomerName',
      'DistributorName', 'DistributorEmail', 'ApprovalType'
    ];
    
    const columnMap = {};
    
    // Build column mapping
    headers.forEach((header, index) => {
      if (header) {
        columnMap[header] = index;
      }
    });
    
    // Validate all required columns exist
    const missingColumns = requiredColumns.filter(col => !(col in columnMap));
    
    if (missingColumns.length > 0) {
      debugLog(`ERROR: Missing required columns in CustomerOrders sheet: ${missingColumns.join(', ')}`);
      return null;
    }
    
    debugLog(`CO Column mapping validated successfully. Headers: ${Object.keys(columnMap).join(', ')}`);
    return columnMap;
    
  } catch (error) {
    debugLog(`Error getting CO column mapping: ${error.message}`);
    return null;
  }
}

/**
 * Sends Customer Order email to distributor
 * @param {number} rowNumber - Row number in CustomerOrders sheet
 * @param {Sheet} sheet - CustomerOrders sheet
 */
function sendCOToDistributor(rowNumber, sheet) {
  try {
    debugLog(`=== STARTING CO APPROVAL PROCESS ===`);
    debugLog(`Row number: ${rowNumber}, Sheet: ${sheet.getName()}`);
    
    // Get and validate column mapping
    const columnMap = getCOColumnMapping(sheet);
    if (!columnMap) {
      debugLog('CRITICAL ERROR: Failed to get column mapping for CustomerOrders sheet');
      return;
    }
    debugLog(`Column mapping successful: ${JSON.stringify(columnMap)}`);
    
    const rowData = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
    debugLog(`Row data retrieved: ${JSON.stringify(rowData.slice(0, 5))}...`);
    
    // Extract CO data using column mapping
    const coNumber = rowData[columnMap['CONumber']];
    const outletName = rowData[columnMap['OutletName']];
    const brand = rowData[columnMap['Brand']];
    const customerName = rowData[columnMap['CustomerName']];
    const distributorName = rowData[columnMap['DistributorName']];
    const distributorEmail = rowData[columnMap['DistributorEmail']];
    
    debugLog(`CO Data - Number: ${coNumber}, Outlet: ${outletName}, Brand: ${brand}`);
    debugLog(`Customer: ${customerName}, Distributor: ${distributorName}, Email: ${distributorEmail}`);
    
    if (!distributorEmail) {
      const errorMsg = 'ERROR: No distributor email';
      sheet.getRange(rowNumber, columnMap['ApprovalType'] + 1).setValue(errorMsg);
      debugLog(`CRITICAL ERROR: No distributor email found for CO: ${coNumber}`);
      return;
    }
    
    // Get line items for this CO
    debugLog(`Fetching line items for CO: ${coNumber}`);
    const lineItems = getCOLineItems(coNumber);
    debugLog(`Found ${lineItems.length} line items`);
    
    // Create PDF with CO details
    debugLog(`Creating PDF for CO: ${coNumber}`);
    const pdfBlob = createCOPDF(coNumber, outletName, brand, distributorName, lineItems);
    debugLog(`PDF created successfully`);
    
    // Send email
    debugLog(`Attempting to send email to: ${distributorEmail}`);
    const emailResult = sendCOEmail(
      distributorEmail,
      distributorName,
      brand,
      outletName,
      customerName,
      coNumber,
      pdfBlob
    );
    debugLog(`Email send result: ${emailResult}`);
    
    if (emailResult === "SUCCESS") {
      // Update approval details using column mapping
      sheet.getRange(rowNumber, columnMap['Sent'] + 1).setValue(true); // Mark as sent
      sheet.getRange(rowNumber, columnMap['ApprovalType'] + 1).setValue('Manual');
      if (columnMap['DateApproved']) {
        sheet.getRange(rowNumber, columnMap['DateApproved'] + 1).setValue(new Date());
      }
      debugLog(`SUCCESS: CO ${coNumber} sent successfully to ${distributorName}`);
    } else {
      sheet.getRange(rowNumber, columnMap['ApprovalType'] + 1).setValue(`ERROR: ${emailResult}`);
      debugLog(`FAILURE: Failed to send CO ${coNumber}: ${emailResult}`);
    }
    
    debugLog(`=== END CO APPROVAL PROCESS ===`);
    
  } catch (error) {
    debugLog(`CRITICAL ERROR in sendCOToDistributor: ${error.message}`);
    debugLog(`Error stack: ${error.stack}`);
    // Use column mapping for error handling
    const columnMap = getCOColumnMapping(sheet);
    if (columnMap) {
      sheet.getRange(rowNumber, columnMap['ApprovalType'] + 1).setValue(`ERROR: ${error.message}`);
    }
  }
}

/**
 * Gets line items for a Customer Order
 * @param {string} coNumber - CO Number
 * @returns {Array} Array of line items
 */
function getCOLineItems(coNumber) {
  try {
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    const lineItemsSheet = ss.getSheetByName('COLineItems');
    
    if (!lineItemsSheet) {
      return [];
    }
    
    const data = lineItemsSheet.getDataRange().getValues();
    const lineItems = [];
    
    // Skip header row and find matching CO number
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === coNumber) { // CONumber column
        lineItems.push({
          lineNumber: data[i][1],
          itemCode: data[i][2],
          itemName: data[i][3],
          quantity: data[i][4],
          itemType: data[i][5],
          itemCostPrice: data[i][6],
          notes: data[i][7]
        });
      }
    }
    
    return lineItems.sort((a, b) => a.lineNumber - b.lineNumber);
    
  } catch (error) {
    debugLog(`Error getting CO line items: ${error.message}`);
    return [];
  }
}

/**
 * Creates PDF for Customer Order using professional formatting
 * @param {string} coNumber - CO Number
 * @param {string} outletName - Outlet name
 * @param {string} brand - Brand name
 * @param {string} distributorName - Distributor name
 * @param {Array} lineItems - Array of line items
 * @returns {Blob} PDF blob
 */
function createCOPDF(coNumber, outletName, brand, distributorName, lineItems) {
  try {
    // Calculate CO value
    const coValue = lineItems.reduce((sum, item) => sum + (item.quantity * item.itemCostPrice), 0);
    
    debugLog(`Creating professional CO PDF using exportCOColumnsPDF function`);
    
    // Create temporary spreadsheet for professional PDF generation
    const tempSS = SpreadsheetApp.create(`TEMP_CO_PDF_${Date.now()}`);
    
    try {
      // Use the professional PDF formatting function from helpers.js
      const pdfBlob = exportCOColumnsPDF(
        coNumber, 
        outletName, 
        brand, 
        distributorName, 
        coValue, 
        lineItems, 
        tempSS
      );
      
      debugLog(`Professional CO PDF created successfully`);
      
      return pdfBlob;
      
    } finally {
      // Cleanup - delete the temporary spreadsheet
      try {
        DriveApp.getFileById(tempSS.getId()).setTrashed(true);
      } catch (cleanupError) {
        debugLog(`Warning: Could not delete temp spreadsheet: ${cleanupError.message}`);
      }
    }
    
  } catch (error) {
    debugLog(`Error creating CO PDF: ${error.message}`);
    debugLog(`Error stack: ${error.stack}`);
    throw error;
  }
}

/**
 * Sends Customer Order email to distributor
 * @param {string} email - Distributor email
 * @param {string} distributor - Distributor name
 * @param {string} brand - Brand name
 * @param {string} outlet - Outlet name
 * @param {string} customerName - Customer name
 * @param {string} coNumber - CO Number
 * @param {Blob} pdfBlob - PDF attachment
 * @returns {string} Success or error message
 */
function sendCOEmail(email, distributor, brand, outlet, customerName, coNumber, pdfBlob) {
  try {
    // Enhanced debugging
    debugLog(`=== CO EMAIL DEBUG ===`);
    debugLog(`TO: ${email}`);
    debugLog(`Distributor: ${distributor}`);
    debugLog(`Brand: ${brand}`);
    debugLog(`Outlet: ${outlet}`);
    debugLog(`CO Number: ${coNumber}`);
    debugLog(`PDF Blob: ${pdfBlob ? 'Created' : 'NULL'}`);
    
    // Validate email address
    if (!email || !email.includes('@')) {
      debugLog(`ERROR: Invalid email address: ${email}`);
      return `ERROR: Invalid email address: ${email}`;
    }
    
    const subject = `Customer Order - ${brand} (${outlet})`;
    const htmlBody = CO_EMAIL_TEMPLATE(distributor, brand, outlet, customerName, coNumber);
    const rules = OUTLET_EMAIL_RULES[outlet] || {};
    
    debugLog(`Subject: ${subject}`);
    debugLog(`CC Rules: ${rules.cc || 'None'}`);
    debugLog(`HTML Body length: ${htmlBody.length} characters`);
    
    // Check daily email quota
    const quotaUsed = MailApp.getRemainingDailyQuota();
    debugLog(`Remaining email quota: ${quotaUsed}`);
    
    if (quotaUsed <= 0) {
      debugLog(`ERROR: Daily email quota exceeded`);
      return `ERROR: Daily email quota exceeded`;
    }
    
    // Send email
    debugLog(`Attempting to send email...`);
    MailApp.sendEmail({
      to: email,
      cc: rules.cc,
      subject: subject,
      htmlBody: htmlBody,
      attachments: [pdfBlob]
    });
    
    debugLog(`SUCCESS: CO Email sent to ${email} with PDF attachment`);
    debugLog(`=== END CO EMAIL DEBUG ===`);
    return "SUCCESS";
    
  } catch (err) {
    debugLog(`ERROR sending CO email to ${email}: ${err.message}`);
    debugLog(`Error stack: ${err.stack}`);
    return `ERROR: ${err.message}`;
  }
}

/**
 * Sends all approved but unsent Customer Orders to distributors
 * Called from menu action: "Send Approved COs"
 */
function sendApprovedCOs() {
  try {
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    const coSheet = ss.getSheetByName('CustomerOrders');
    
    if (!coSheet) {
      SpreadsheetApp.getUi().alert('Error', 'CustomerOrders sheet not found.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    // Get column mapping
    const columnMap = getCOColumnMapping(coSheet);
    if (!columnMap) {
      SpreadsheetApp.getUi().alert('Error', 'Failed to read CustomerOrders sheet structure.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    const data = coSheet.getDataRange().getValues();
    let processedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process each row (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const isApproved = row[columnMap['Approved']];
      const approvalType = row[columnMap['ApprovalType']];
      const coNumber = row[columnMap['CONumber']];
      
      // Send if approved but not yet sent (Sent checkbox is false and ApprovalType is empty)
      const isSent = row[columnMap['Sent']];
      if (isApproved && !isSent && !approvalType) {
        try {
          debugLog(`Processing approved CO: ${coNumber}`);
          sendCOToDistributor(i + 1, coSheet);
          processedCount++;
        } catch (error) {
          errorCount++;
          errors.push(`${coNumber}: ${error.message}`);
          debugLog(`Error processing CO ${coNumber}: ${error.message}`);
        }
      }
    }
    
    // Show results to user
    let message = '';
    if (processedCount > 0) {
      message += `✅ Successfully sent ${processedCount} Customer Order(s) to distributors.\n\n`;
    }
    if (errorCount > 0) {
      message += `❌ Failed to send ${errorCount} Customer Order(s):\n${errors.join('\n')}\n\n`;
    }
    if (processedCount === 0 && errorCount === 0) {
      message = '📋 No approved Customer Orders found that need to be sent.';
    }
    
    SpreadsheetApp.getUi().alert(
      '📧 Send Approved COs Result', 
      message, 
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
    debugLog(`sendApprovedCOs completed: ${processedCount} sent, ${errorCount} errors`);
    
  } catch (error) {
    debugLog(`Error in sendApprovedCOs: ${error.message}`);
    SpreadsheetApp.getUi().alert(
      'Error', 
      `Failed to process approved Customer Orders: ${error.message}`, 
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Gets all available items from Item Master sheet for dropdown (SKUs + NEW_ITEM option)
 * @returns {Array} Array of item options with brand info
 */
function getAvailableItems() {
  try {
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    // First try ItemMaster, then SKUClassification as fallback
    let itemSheet = ss.getSheetByName('ItemMaster');
    let sheetSource = 'ItemMaster';
    if (!itemSheet) {
      itemSheet = ss.getSheetByName('SKUClassification');
      sheetSource = 'SKUClassification';
    }
    
    console.log(`Using sheet: ${sheetSource}`);
    
    const items = [{ code: 'NEW_ITEM', name: 'New Item (Not in catalog)', brand: '' }];
    
    if (itemSheet) {
      const data = itemSheet.getDataRange().getValues();
      console.log(`Sheet found with ${data.length} rows`);
      
      if (data.length < 2) {
        console.log('Item sheet has no data rows');
        return items;
      }
      
      const headers = data[0];
      console.log('Headers found:', headers);
      
      // For ItemMaster sheet, use exact column positions based on your screenshot
      let skuIndex, nameIndex, brandIndex;
      
      if (sheetSource === 'ItemMaster') {
        brandIndex = 0;  // Column A
        nameIndex = 1;   // Column B  
        skuIndex = 2;    // Column C
        console.log('Using ItemMaster column mapping: Brand=0, ItemName=1, SKU=2');
      } else {
        // Fallback to dynamic detection for other sheets
        skuIndex = headers.indexOf('SKU');
        if (skuIndex === -1) skuIndex = headers.indexOf('ItemCode');
        if (skuIndex === -1) skuIndex = headers.indexOf('Code');
        if (skuIndex === -1) skuIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('sku'));
        
        nameIndex = headers.indexOf('ItemName');
        if (nameIndex === -1) nameIndex = headers.indexOf('Item Name');
        if (nameIndex === -1) nameIndex = headers.indexOf('Item');
        if (nameIndex === -1) nameIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('name'));
        
        brandIndex = headers.indexOf('Brand');
        if (brandIndex === -1) brandIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('brand'));
        
        console.log(`Dynamic column mapping - SKU: ${skuIndex}, Name: ${nameIndex}, Brand: ${brandIndex}`);
      }
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const sku = skuIndex >= 0 && row[skuIndex] ? row[skuIndex] : null;
        const itemName = nameIndex >= 0 && row[nameIndex] ? row[nameIndex] : null;
        const brand = brandIndex >= 0 && row[brandIndex] ? row[brandIndex] : '';
        
        if (sku && itemName) {
          items.push({
            code: sku.toString(),
            name: `${sku} - ${itemName}`,
            brand: brand.toString(),
            itemName: itemName.toString()
          });
        }
      }
      console.log(`Loaded ${items.length - 1} items from ${sheetSource}`);
    } else {
      console.log('Neither ItemMaster nor SKUClassification sheet found - only NEW_ITEM option will be available');
    }
    
    return items.sort((a, b) => {
      return a.code.localeCompare(b.code);
    });
  } catch (error) {
    console.error('Error in getAvailableItems:', error);
    return [{ code: 'NEW_ITEM', name: 'New Item (Not in catalog)', brand: '' }];
  }
}
