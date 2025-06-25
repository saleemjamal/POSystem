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
    const required = ['outletName', 'brand', 'customerName', 'itemCode', 'quantity'];
    for (const field of required) {
      if (!orderData[field]) {
        return { success: false, message: `Missing required field: ${field}` };
      }
    }

    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    const coSheet = getOrCreateCustomerOrdersSheet(ss);
    
    // Generate CO number
    const coNumber = generateCONumber(orderData.outletName);
    
    // Get or create customer
    const customer = getOrCreateCustomer(orderData);
    
    // Validate item code
    const itemInfo = validateItemCode(orderData.itemCode, orderData.itemName);
    
    // Create CO record
    const coRecord = [
      coNumber,
      orderData.outletName,
      orderData.brand,
      orderData.customerName,
      orderData.customerEmail || '',
      orderData.customerPhone || '',
      orderData.customerPIC || '',
      orderData.itemCode,
      itemInfo.itemName,
      Number(orderData.quantity),
      CO_STATUS.PENDING,
      new Date(),
      '', // ApprovedBy
      orderData.notes || '',
      '', // DistributorName (filled later)
      '', // DistributorEmail (filled later)
      '' // Link (filled later)
    ];
    
    coSheet.appendRow(coRecord);
    debugLog(`Customer Order created: ${coNumber}`);
    
    return {
      success: true,
      message: `Customer Order ${coNumber} created successfully`,
      coNumber: coNumber
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
 * Generates sequential CO number in format CO-OUTLET-YYYYMMDD-001
 * @param {string} outletName
 * @returns {string} CO number
 */
function generateCONumber(outletName) {
  const outletCode = outletShort[outletName] || 'UNK';
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const coSheet = getOrCreateCustomerOrdersSheet(ss);
  
  // Count existing COs for today
  const data = coSheet.getDataRange().getValues();
  if (data.length <= 1) return `CO-${outletCode}-${today}-001`;
  
  const headers = data[0];
  const coCol = headers.indexOf('CONumber');
  const prefix = `CO-${outletCode}-${today}`;
  
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
      'CustomerEmail', 'CustomerPhone', 'CustomerPIC',
      'ItemCode', 'ItemName', 'Quantity', 'Status',
      'DateCreated', 'ApprovedBy', 'Notes', 
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
    coSheet.setColumnWidth(11, 100); // Status
    coSheet.setColumnWidth(12, 100); // DateCreated
    
    // Set number formats
    coSheet.getRange('L:L').setNumberFormat('dd/mm/yyyy'); // DateCreated
    coSheet.getRange('J:J').setNumberFormat('0'); // Quantity
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
    customerData.customerPIC || '',
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
      'CustomerPhone', 'CustomerPIC', 'OutletName',
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
 * Generates unique customer ID
 * @returns {string} Customer ID
 */
function generateCustomerId() {
  const timestamp = new Date().getTime();
  return `CUST${timestamp.toString().slice(-8)}`;
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
  
  // Check against SKU master
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const skuSheet = ss.getSheetByName('SKUClassification');
  
  if (!skuSheet) {
    return {
      isValid: false,
      itemName: itemName || itemCode,
      isNewItem: false,
      error: 'SKU master not found'
    };
  }
  
  const data = skuSheet.getDataRange().getValues();
  const headers = data[0];
  const skuCol = headers.indexOf('SKU');
  const nameCol = headers.indexOf('ItemName');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][skuCol] === itemCode) {
      return {
        isValid: true,
        itemName: data[i][nameCol],
        isNewItem: false
      };
    }
  }
  
  return {
    isValid: false,
    itemName: itemName || itemCode,
    isNewItem: false,
    error: 'Item code not found in SKU master'
  };
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
 * Gets all available items for dropdown (SKUs + NEW_ITEM option)
 * @returns {Array} Array of item options
 */
function getAvailableItems() {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const skuSheet = ss.getSheetByName('SKUClassification');
  
  const items = [{ code: 'NEW_ITEM', name: 'New Item (Not in catalog)' }];
  
  if (skuSheet) {
    const data = skuSheet.getDataRange().getValues();
    const headers = data[0];
    const skuCol = headers.indexOf('SKU');
    const nameCol = headers.indexOf('ItemName');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][skuCol]) {
        items.push({
          code: data[i][skuCol],
          name: `${data[i][skuCol]} - ${data[i][nameCol]}`
        });
      }
    }
  }
  
  return items.sort((a, b) => a.code.localeCompare(b.code));
}
