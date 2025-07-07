// businessRulesSetup.js
// One-time setup script to create BusinessRules sheets with instructions
// Run createBusinessRulesSheet() once from Apps Script editor to set up the system

/**
 * Creates BusinessRules sheet with headers, formatting, sample data, and usage instructions
 * Run this function once from the Apps Script editor to set up the sheet
 */
function createBusinessRulesSheet() {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  
  // Check if sheets already exist
  let rulesSheet = ss.getSheetByName('BusinessRules');
  let instructionsSheet = ss.getSheetByName('BusinessRules_Help');
  
  if (rulesSheet || instructionsSheet) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert('Sheets Exist', 'BusinessRules and/or BusinessRules_Help sheets already exist. Do you want to replace them?', ui.ButtonSet.YES_NO);
    if (response === ui.Button.YES) {
      if (rulesSheet) ss.deleteSheet(rulesSheet);
      if (instructionsSheet) ss.deleteSheet(instructionsSheet);
    } else {
      ui.alert('Operation cancelled.');
      return;
    }
  }
  
  // Create instructions sheet first
  createInstructionsSheet(ss);
  
  // Create main BusinessRules sheet
  createMainRulesSheet(ss);
  
  SpreadsheetApp.getUi().alert('Success!', 'BusinessRules sheets created successfully with instructions and sample data.', SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Creates the main BusinessRules sheet with header-based indexing
 */
function createMainRulesSheet(ss) {
  const sheet = ss.insertSheet('BusinessRules');
  
  // Define headers
  const headers = [
    'RuleName', 'Vendor', 'Brand', 'ProductFilter', 'Outlet',
    'StockCondition', 'StockValue1', 'StockValue2', 
    'OrderQuantity', 'AlternateQuantity', 'Priority', 'Active', 'Notes'
  ];
  
  // Set headers
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Create header mapping for all column operations
  const getColumnIndex = (headerName) => {
    const index = headers.indexOf(headerName);
    if (index === -1) throw new Error(`Header '${headerName}' not found`);
    return index + 1; // +1 for 1-based indexing
  };
  
  // Add detailed comments to headers
  const headerComments = {
    'RuleName': 'Descriptive name for this rule (e.g., "Dankotuwa Plates MOQ")',
    'Vendor': 'Vendor/distributor name. Use "ANY" to match all vendors.',
    'Brand': 'Brand name. Use "ANY" to match all brands.',
    'ProductFilter': 'Product name contains this text (case-insensitive). Use "ANY" to match all products.\nExample: "plates" matches "Dinner Plates", "Tea Plates", etc.',
    'Outlet': 'Outlet name. Use "ANY" to match all outlets.\nExample: "POPPAT JAMALS ADYAR"',
    'StockCondition': 'How to compare current stock to StockValue1.\nOptions: <=, >=, =, between',
    'StockValue1': 'First threshold value for stock comparison.\nFor "between" condition, this is the minimum value.',
    'StockValue2': 'Second threshold value (only used for "between" condition).\nFor "between", this is the maximum value.',
    'OrderQuantity': 'Quantity to order when the rule condition is met.',
    'AlternateQuantity': 'Quantity to order when rule condition is NOT met.\nOften set to 0 to skip ordering.',
    'Priority': 'Rule priority (1 = highest priority). Lower numbers processed first.\nFirst matching rule wins.',
    'Active': 'TRUE to enable this rule, FALSE to disable.\nDisabled rules are ignored.',
    'Notes': 'Business justification and details about this rule.'
  };
  
  // Add comments to headers using header-based indexing
  Object.keys(headerComments).forEach(headerName => {
    const colIndex = getColumnIndex(headerName);
    sheet.getRange(1, colIndex).setNote(headerComments[headerName]);
  });
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold')
             .setBackground('#4a90e2')
             .setFontColor('white')
             .setHorizontalAlignment('center');
  
  // Set column widths using header-based approach
  const columnWidths = {
    'RuleName': 200,
    'Vendor': 150,
    'Brand': 100,
    'ProductFilter': 150,
    'Outlet': 150,
    'StockCondition': 120,
    'StockValue1': 100,
    'StockValue2': 100,
    'OrderQuantity': 120,
    'AlternateQuantity': 150,
    'Priority': 80,
    'Active': 80,
    'Notes': 300
  };
  
  Object.keys(columnWidths).forEach(headerName => {
    const colIndex = getColumnIndex(headerName);
    sheet.setColumnWidth(colIndex, columnWidths[headerName]);
  });
  
  // Enhanced sample data
  const sampleData = [
    ['Dankotuwa Plates MOQ', 'ANY', 'Dankotuwa', 'plates', 'ANY', '<=', 3, '', 6, 0, 1, 'TRUE', 'Vendor requires minimum 6-piece orders for plates due to packaging'],
    ['Crystal Safety Stock', 'ANY', 'ANY', 'crystal', 'POPPAT JAMALS ADYAR', '<=', 2, '', 5, 0, 2, 'TRUE', 'Premium outlet needs higher safety stock for crystal items'],
    ['Seasonal Tea Sets', 'ANY', 'ANY', 'tea set', 'ANY', 'between', 5, 15, 20, 10, 3, 'TRUE', 'Seasonal boost: order more tea sets when stock is moderate'],
    ['Bulk Discount Rule', 'Premium Vendor', 'ANY', 'ANY', 'ANY', '>=', 50, '', 0, 100, 4, 'FALSE', 'Example: Skip small orders, place bulk orders instead (disabled)'],
    ['Dead Stock Prevention', 'ANY', 'ANY', 'discontinued', 'ANY', '>=', 0, '', 0, 0, 10, 'TRUE', 'Never order discontinued items regardless of stock level']
  ];
  
  // Add sample data
  sheet.getRange(2, 1, sampleData.length, headers.length).setValues(sampleData);
  
  // Add data validation using header-based indexing
  const maxRows = 1000;
  
  // StockCondition validation
  const conditionCol = getColumnIndex('StockCondition');
  const conditionRange = sheet.getRange(2, conditionCol, maxRows, 1);
  const conditionRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['<=', '>=', '=', 'between'])
    .setAllowInvalid(false)
    .setHelpText('Select comparison operator for stock condition')
    .build();
  conditionRange.setDataValidation(conditionRule);
  
  // Active validation
  const activeCol = getColumnIndex('Active');
  const activeRange = sheet.getRange(2, activeCol, maxRows, 1);
  const activeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['TRUE', 'FALSE'])
    .setAllowInvalid(false)
    .setHelpText('TRUE to enable rule, FALSE to disable')
    .build();
  activeRange.setDataValidation(activeRule);
  
  // Format numeric columns using header-based indexing
  const numericHeaders = ['StockValue1', 'StockValue2', 'OrderQuantity', 'AlternateQuantity', 'Priority'];
  numericHeaders.forEach(headerName => {
    const colIndex = getColumnIndex(headerName);
    sheet.getRange(2, colIndex, maxRows, 1).setNumberFormat('0');
  });
  
  // Center align specific columns using header-based indexing
  const centerAlignHeaders = ['StockCondition', 'Priority', 'Active'];
  centerAlignHeaders.forEach(headerName => {
    const colIndex = getColumnIndex(headerName);
    sheet.getRange(2, colIndex, maxRows, 1).setHorizontalAlignment('center');
  });
  
  // Freeze header and add formatting
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 50, headers.length).setBorder(true, true, true, true, true, true);
  sheet.getRange(2, 1, 48, headers.length).setBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
}

/**
 * Creates the instructions/help sheet
 */
function createInstructionsSheet(ss) {
  const sheet = ss.insertSheet('BusinessRules_Help');
  
  // Instructions content
  const content = [
    ['Business Rules System - Usage Guide', '', '', ''],
    ['', '', '', ''],
    ['OVERVIEW:', '', '', ''],
    ['This system allows you to define custom ordering rules that override', '', '', ''],
    ['the standard quantity calculations based on your business requirements.', '', '', ''],
    ['', '', '', ''],
    ['HOW IT WORKS:', '', '', ''],
    ['1. Rules are processed in PRIORITY order (1 = highest priority)', '', '', ''],
    ['2. First matching rule wins - processing stops after first match', '', '', ''],
    ['3. If no rules match, standard quantity calculation is used', '', '', ''],
    ['4. Only ACTIVE rules (Active = TRUE) are processed', '', '', ''],
    ['', '', '', ''],
    ['RULE MATCHING:', '', '', ''],
    ['A rule matches when ALL of these conditions are met:', '', '', ''],
    ['• Vendor matches (or is "ANY")', '', '', ''],
    ['• Brand matches (or is "ANY")', '', '', ''],
    ['• Product name contains ProductFilter text (or is "ANY")', '', '', ''],
    ['• Outlet matches (or is "ANY")', '', '', ''],
    ['• Current stock meets StockCondition criteria', '', '', ''],
    ['', '', '', ''],
    ['STOCK CONDITIONS:', '', '', ''],
    ['<= : Current stock is less than or equal to StockValue1', '', '', ''],
    ['>= : Current stock is greater than or equal to StockValue1', '', '', ''],
    ['= : Current stock exactly equals StockValue1', '', '', ''],
    ['between : Current stock is between StockValue1 and StockValue2', '', '', ''],
    ['', '', '', ''],
    ['EXAMPLES:', '', '', ''],
    ['', '', '', ''],
    ['Example 1: Minimum Order Quantity', '', '', ''],
    ['Problem: Vendor requires minimum 6 pieces for plates', '', '', ''],
    ['Rule: If stock <= 3, order 6; otherwise order 0', '', '', ''],
    ['RuleName: "Plates MOQ"', '', '', ''],
    ['ProductFilter: "plates"', '', '', ''],
    ['StockCondition: "<="', '', '', ''],
    ['StockValue1: 3', '', '', ''],
    ['OrderQuantity: 6', '', '', ''],
    ['AlternateQuantity: 0', '', '', ''],
    ['', '', '', ''],
    ['Example 2: Safety Stock for Premium Items', '', '', ''],
    ['Problem: Need higher safety stock for expensive crystal', '', '', ''],
    ['Rule: If crystal stock <= 2, order 5 pieces', '', '', ''],
    ['ProductFilter: "crystal"', '', '', ''],
    ['StockCondition: "<="', '', '', ''],
    ['StockValue1: 2', '', '', ''],
    ['OrderQuantity: 5', '', '', ''],
    ['', '', '', ''],
    ['Example 3: Seasonal Adjustments', '', '', ''],
    ['Problem: Order more tea sets during wedding season', '', '', ''],
    ['Rule: If tea set stock is between 5-15, order 20', '', '', ''],
    ['ProductFilter: "tea set"', '', '', ''],
    ['StockCondition: "between"', '', '', ''],
    ['StockValue1: 5', '', '', ''],
    ['StockValue2: 15', '', '', ''],
    ['OrderQuantity: 20', '', '', ''],
    ['', '', '', ''],
    ['BEST PRACTICES:', '', '', ''],
    ['• Use descriptive RuleName for easy identification', '', '', ''],
    ['• Test new rules with low priority first', '', '', ''],
    ['• Document business justification in Notes column', '', '', ''],
    ['• Use "ANY" for wildcards to match all values', '', '', ''],
    ['• Set Priority carefully - lower numbers = higher priority', '', '', ''],
    ['• Disable rules with Active=FALSE instead of deleting them', '', '', ''],
    ['• Review rule effectiveness regularly', '', '', ''],
    ['', '', '', ''],
    ['TIPS:', '', '', ''],
    ['• ProductFilter is case-insensitive partial matching', '', '', ''],
    ['• Hover over column headers for quick help tooltips', '', '', ''],
    ['• Use Priority 1-10 for critical rules, 11+ for optional ones', '', '', ''],
    ['• AlternateQuantity of 0 means "skip ordering"', '', '', ''],
    ['• Test rules on a few items before applying broadly', '', '', ''],
    ['', '', '', ''],
    ['INTEGRATION:', '', '', ''],
    ['Business rules are checked during PO quantity calculation:', '', '', ''],
    ['1. Standard quantity is calculated first', '', '', ''],
    ['2. Business rules are applied in priority order', '', '', ''],
    ['3. First matching rule overrides standard calculation', '', '', ''],
    ['4. If no rules match, standard quantity is used', '', '', ''],
    ['', '', '', ''],
    ['Need help? Check column header tooltips or contact system admin.', '', '', '']
  ];
  
  // Add content to sheet
  sheet.getRange(1, 1, content.length, 4).setValues(content);
  
  // Format the sheet using range-based approach (no hardcoded positions)
  const titleRange = sheet.getRange(1, 1);
  titleRange.setFontSize(16).setFontWeight('bold').setBackground('#4a90e2').setFontColor('white');
  
  // Format section headers by searching for them
  const data = sheet.getDataRange().getValues();
  const sectionHeaders = ['OVERVIEW:', 'HOW IT WORKS:', 'RULE MATCHING:', 'STOCK CONDITIONS:', 'EXAMPLES:', 'BEST PRACTICES:', 'TIPS:', 'INTEGRATION:'];
  
  data.forEach((row, rowIndex) => {
    if (sectionHeaders.includes(row[0])) {
      sheet.getRange(rowIndex + 1, 1).setFontWeight('bold').setFontSize(12);
    }
  });
  
  // Set column widths
  sheet.setColumnWidth(1, 500);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 100);
  
  // Merge title cell
  sheet.getRange(1, 1, 1, 4).merge();
  
  // Find and highlight example sections
  data.forEach((row, rowIndex) => {
    if (row[0].startsWith('Example 1:') || row[0].startsWith('Example 3:')) {
      // Light blue background for examples 1 and 3
      sheet.getRange(rowIndex + 1, 1, 8, 4).setBackground('#f0f8ff');
    } else if (row[0].startsWith('Example 2:')) {
      // Light gray background for example 2
      sheet.getRange(rowIndex + 1, 1, 6, 4).setBackground('#f5f5f5');
    }
  });
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
  
  return columnMap;
}

/**
 * Validates that all required columns exist in BusinessRules sheet
 */
function validateBusinessRulesSheet() {
  const requiredColumns = [
    'RuleName', 'Vendor', 'Brand', 'ProductFilter', 'Outlet',
    'StockCondition', 'StockValue1', 'StockValue2', 
    'OrderQuantity', 'AlternateQuantity', 'Priority', 'Active', 'Notes'
  ];
  
  try {
    const columnMap = getBusinessRulesColumnMapping();
    const missingColumns = requiredColumns.filter(col => columnMap[col] === undefined);
    
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }
    
    return true;
  } catch (error) {
    debugLog(`BusinessRules sheet validation failed: ${error.message}`);
    return false;
  }
}