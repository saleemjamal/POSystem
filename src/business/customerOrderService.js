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
      if (item.itemCode === 'NEW_ITEM' && !item.itemName) {
        return { success: false, message: `Item ${i + 1}: New items must have a name` };
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
    
    // Create CO header record
    const coRecord = [
      coNumber,
      orderData.outletName,
      orderData.brand,
      orderData.customerName,
      orderData.customerEmail || '',
      orderData.customerPhone || '',
      totalQuantity, // Total items
      CO_STATUS.PENDING,
      new Date(),
      false, // Approved checkbox
      '', // ApprovalType (will be filled when approved)
      '', // Date Approved (will be filled when approved)
      orderData.notes || '',
      distributorName,
      distributorEmail,
      '' // Link (filled later when converted to PO)
    ];
    
    coSheet.appendRow(coRecord);
    
    // Ensure the Approved cell in the new row is a checkbox
    const lastRow = coSheet.getLastRow();
    coSheet.getRange(lastRow, 10).setDataValidation(
      SpreadsheetApp.newDataValidation().requireCheckbox().build()
    );
    
    // Create line items
    orderData.items.forEach((item, index) => {
      const itemInfo = validateItemCode(item.itemCode, item.itemName);
      
      const lineItemRecord = [
        coNumber,
        index + 1, // LineNumber
        item.itemCode,
        itemInfo.itemName,
        Number(item.quantity),
        itemInfo.isNewItem ? 'new_item' : 'existing',
        item.notes || ''
      ];
      
      lineItemsSheet.appendRow(lineItemRecord);
    });
    
    debugLog(`Customer Order created: ${coNumber} with ${orderData.items.length} items`);
    
    return {
      success: true,
      message: `Customer Order ${coNumber} created successfully with ${orderData.items.length} items`,
      coNumber: coNumber,
      totalItems: orderData.items.length
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
      'CustomerEmail', 'CustomerPhone', 'TotalQuantity', 'Status',
      'DateCreated', 'Approved', 'ApprovalType', 'DateApproved', 'Notes',
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
      'Quantity', 'ItemType', 'Notes'
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
    lineItemsSheet.setColumnWidth(7, 200);  // Notes
    
    // Set number formats
    lineItemsSheet.getRange('B:B').setNumberFormat('0'); // LineNumber
    lineItemsSheet.getRange('E:E').setNumberFormat('0'); // Quantity
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
