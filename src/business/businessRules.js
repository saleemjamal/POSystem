// businessRules.js
// Business rules engine for custom quantity overrides in PO system

/**
 * Applies business rules to override standard quantity calculations
 * @param {string} sku - The SKU/item code
 * @param {string} vendor - Vendor/distributor name  
 * @param {string} brand - Brand name
 * @param {string} itemName - Product name
 * @param {string} outlet - Outlet name
 * @param {number} currentStock - Current stock level
 * @param {number} standardQty - Standard calculated quantity
 * @returns {Object} {quantity: number, justification: string|null}
 */
function applyBusinessRules(sku, vendor, brand, itemName, outlet, currentStock, standardQty) {
  try {
    // Check if BusinessRules sheet exists
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    const rulesSheet = ss.getSheetByName('BusinessRules');
    
    if (!rulesSheet) {
      // No business rules sheet - return standard calculation
      return { quantity: standardQty, justification: null };
    }
    
    // Get column mapping for BusinessRules sheet
    const columnMap = getBusinessRulesColumnMapping();
    const data = rulesSheet.getDataRange().getValues();
    const headers = data[0];
    
    // Skip header row and get all rules with validation
    const rules = data.slice(1).filter(row => {
      // Only process rows that have a rule name and are active
      const ruleName = row[columnMap['RuleName']];
      const active = row[columnMap['Active']];
      
      // Basic validation - rule must have name and be active
      if (!ruleName || String(active).toUpperCase() !== 'TRUE') {
        return false;
      }
      
      // Validate required fields
      const stockCondition = getRuleValue(row[columnMap['StockCondition']]);
      const orderQuantity = row[columnMap['OrderQuantity']];
      
      // Rule must have a stock condition and order quantity
      if (stockCondition === 'ANY' || isNaN(Number(orderQuantity))) {
        debugLog(`Invalid rule skipped: ${ruleName} - Missing stock condition or invalid order quantity`);
        return false;
      }
      
      return true;
    });
    
    // Sort rules by priority (lower number = higher priority)
    rules.sort((a, b) => {
      const priorityA = Number(a[columnMap['Priority']]) || 999;
      const priorityB = Number(b[columnMap['Priority']]) || 999;
      return priorityA - priorityB;
    });
    
    // Process rules in priority order - first match wins
    for (const rule of rules) {
      const ruleResult = evaluateRule(rule, columnMap, vendor, brand, itemName, outlet, currentStock);
      
      if (ruleResult.matches) {
        // Rule matched - return overridden quantity and justification
        const ruleName = rule[columnMap['RuleName']];
        const notes = rule[columnMap['Notes']] || '';
        const quantity = ruleResult.quantity;
        
        const justification = `Business Rule: ${ruleName}${notes ? ' - ' + notes : ''}`;
        
        debugLog(`Business rule applied: ${ruleName} for SKU ${sku}. Override quantity: ${quantity}`);
        
        return { quantity: quantity, justification: justification };
      }
    }
    
    // No rules matched - return standard calculation
    return { quantity: standardQty, justification: null };
    
  } catch (error) {
    debugLog(`Error in applyBusinessRules for SKU ${sku}: ${error.message}`);
    // On error, return standard calculation
    return { quantity: standardQty, justification: null };
  }
}

/**
 * Evaluates if a single rule matches the given criteria and returns the quantity
 * @param {Array} rule - Rule row data
 * @param {Object} columnMap - Column mapping object
 * @param {string} vendor - Vendor name
 * @param {string} brand - Brand name  
 * @param {string} itemName - Product name
 * @param {string} outlet - Outlet name
 * @param {number} currentStock - Current stock level
 * @returns {Object} {matches: boolean, quantity: number}
 */
function evaluateRule(rule, columnMap, vendor, brand, itemName, outlet, currentStock) {
  try {
    // Extract rule criteria with proper null/undefined handling
    const ruleVendor = getRuleValue(rule[columnMap['Vendor']]);
    const ruleBrand = getRuleValue(rule[columnMap['Brand']]);
    const ruleProductFilter = getRuleValue(rule[columnMap['ProductFilter']]);
    const ruleOutlet = getRuleValue(rule[columnMap['Outlet']]);
    const stockCondition = getRuleValue(rule[columnMap['StockCondition']]);
    const stockValue1 = Number(rule[columnMap['StockValue1']]) || 0;
    const stockValue2 = Number(rule[columnMap['StockValue2']]) || 0;
    const orderQuantity = Number(rule[columnMap['OrderQuantity']]) || 0;
    const alternateQuantity = Number(rule[columnMap['AlternateQuantity']]) || 0;
    
    // Check vendor match
    if (!matchesCriteria(vendor, ruleVendor)) {
      return { matches: false, quantity: 0 };
    }
    
    // Check brand match
    if (!matchesCriteria(brand, ruleBrand)) {
      return { matches: false, quantity: 0 };
    }
    
    // Check product filter match (case-insensitive contains)
    if (!matchesProductFilter(itemName, ruleProductFilter)) {
      return { matches: false, quantity: 0 };
    }
    
    // Check outlet match
    if (!matchesCriteria(outlet, ruleOutlet)) {
      return { matches: false, quantity: 0 };
    }
    
    // Check stock condition
    const stockConditionMet = evaluateStockCondition(currentStock, stockCondition, stockValue1, stockValue2);
    
    // All criteria matched - return appropriate quantity
    const quantity = stockConditionMet ? orderQuantity : alternateQuantity;
    
    return { matches: true, quantity: quantity };
    
  } catch (error) {
    debugLog(`Error evaluating rule: ${error.message}`);
    return { matches: false, quantity: 0 };
  }
}

/**
 * Helper function to safely extract rule values from sheet cells
 * @param {any} cellValue - Raw cell value from sheet
 * @returns {string} Cleaned string value
 */
function getRuleValue(cellValue) {
  if (cellValue === null || cellValue === undefined || cellValue === '') {
    return 'ANY'; // Treat empty cells as wildcards
  }
  return String(cellValue).trim();
}

/**
 * Checks if a value matches criteria (exact match or "ANY" wildcard)
 * @param {string} value - Value to check
 * @param {string} criteria - Criteria to match against
 * @returns {boolean} True if matches
 */
function matchesCriteria(value, criteria) {
  if (!criteria || String(criteria).trim().toUpperCase() === 'ANY') {
    return true;
  }
  
  return String(value).toLowerCase() === String(criteria).toLowerCase();
}

/**
 * Checks if product name contains the filter text (case-insensitive)
 * @param {string} itemName - Product name
 * @param {string} filter - Filter text
 * @returns {boolean} True if matches
 */
function matchesProductFilter(itemName, filter) {
  if (!filter || String(filter).trim().toUpperCase() === 'ANY') {
    return true;
  }
  
  return String(itemName).toLowerCase().includes(String(filter).toLowerCase());
}

/**
 * Evaluates stock condition against threshold values
 * @param {number} currentStock - Current stock level
 * @param {string} condition - Condition type (<=, >=, =, between)
 * @param {number} value1 - First threshold value
 * @param {number} value2 - Second threshold value (for between)
 * @returns {boolean} True if condition is met
 */
function evaluateStockCondition(currentStock, condition, value1, value2) {
  const stock = Number(currentStock) || 0;
  const val1 = Number(value1) || 0;
  const val2 = Number(value2) || 0;
  
  switch (String(condition).trim()) {
    case '<=':
      return stock <= val1;
    case '>=':
      return stock >= val1;
    case '=':
      return stock === val1;
    case 'between':
      return stock >= val1 && stock <= val2;
    default:
      debugLog(`Unknown stock condition: ${condition}`);
      return false;
  }
}

/**
 * Helper function to get BusinessRules sheet column mapping
 * Returns object with header names as keys and column indexes as values
 */
function getBusinessRulesColumnMapping() {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const sheet = ss.getSheetByName('BusinessRules');
  if (!sheet) {
    throw new Error('BusinessRules sheet not found. Please run createBusinessRulesSheet() first.');
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const columnMap = {};
  headers.forEach((header, index) => {
    if (header) columnMap[header] = index;
  });
  
  // Validate required columns exist
  const requiredColumns = [
    'RuleName', 'Vendor', 'Brand', 'ProductFilter', 'Outlet',
    'StockCondition', 'StockValue1', 'StockValue2', 
    'OrderQuantity', 'AlternateQuantity', 'Priority', 'Active', 'Notes'
  ];
  
  const missingColumns = requiredColumns.filter(col => columnMap[col] === undefined);
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns in BusinessRules sheet: ${missingColumns.join(', ')}`);
  }
  
  return columnMap;
}

