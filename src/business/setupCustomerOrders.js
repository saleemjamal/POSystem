// setupCustomerOrders.js
// One-time setup script for Customer Orders system

/**
 * One-time setup function to create CustomerOrders and CustomerMaster sheets
 * Run this once to initialize the customer order system
 */
function setupCustomerOrderSystem() {
  try {
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    
    // Create CustomerOrders sheet
    const coSheet = getOrCreateCustomerOrdersSheet(ss);
    debugLog('CustomerOrders sheet created/verified');
    
    // Create CustomerMaster sheet  
    const customerSheet = getOrCreateCustomerMasterSheet(ss);
    debugLog('CustomerMaster sheet created/verified');
    
    // Update sheet protection for new role
    if (isSuperUser()) {
      setupCustomerOrderProtections();
      debugLog('Customer order sheet protections applied');
    }
    
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Customer Order system is ready! Store managers can now create customer orders.', 
      'Setup Complete', 
      8
    );
    
    return {
      success: true,
      message: 'Customer Order system setup completed successfully'
    };
    
  } catch (error) {
    debugLog(`Error setting up customer order system: ${error.message}`);
    SpreadsheetApp.getUi().alert('Setup Error', `Failed to setup customer order system: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
    
    return {
      success: false,
      message: `Setup failed: ${error.message}`
    };
  }
}

/**
 * Apply appropriate sheet protection for customer order sheets
 */
function setupCustomerOrderProtections() {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  
  // CustomerOrders sheet: Store managers can create, admins can edit all
  const coSheet = ss.getSheetByName('CustomerOrders');
  if (coSheet) {
    setupCustomerOrdersProtection(coSheet);
  }
  
  // CustomerMaster sheet: Store managers can edit customer data, admins full access
  const customerSheet = ss.getSheetByName('CustomerMaster');
  if (customerSheet) {
    setupCustomerMasterProtection(customerSheet);
  }
}

/**
 * Set up protection for CustomerOrders sheet
 * @param {Sheet} sheet
 */
function setupCustomerOrdersProtection(sheet) {
  try {
    // Remove existing protections
    sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(p => p.remove());
    
    // Create new protection
    const protection = sheet.protect();
    protection.setDescription(`Customer Orders - Store managers can create, admins manage`);
    
    // Add authorized editors (admins + store managers)
    const authorizedEditors = [
      ...getUsersForRole('SUPER_USER'),
      ...getUsersForRole('STORE_MANAGER')
    ];
    
    authorizedEditors.forEach(email => {
      try {
        protection.addEditor(email);
      } catch (error) {
        debugLog(`Could not add editor ${email} to CustomerOrders: ${error.message}`);
      }
    });
    
    protection.setWarningOnly(false);
    debugLog('CustomerOrders sheet protection applied');
    
  } catch (error) {
    debugLog(`Error protecting CustomerOrders sheet: ${error.message}`);
  }
}

/**
 * Set up protection for CustomerMaster sheet
 * @param {Sheet} sheet
 */
function setupCustomerMasterProtection(sheet) {
  try {
    // Remove existing protections
    sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(p => p.remove());
    
    // Create new protection
    const protection = sheet.protect();
    protection.setDescription(`Customer Master - Store managers can edit, admins manage`);
    
    // Add authorized editors (admins + store managers)
    const authorizedEditors = [
      ...getUsersForRole('SUPER_USER'),
      ...getUsersForRole('STORE_MANAGER')
    ];
    
    authorizedEditors.forEach(email => {
      try {
        protection.addEditor(email);
      } catch (error) {
        debugLog(`Could not add editor ${email} to CustomerMaster: ${error.message}`);
      }
    });
    
    protection.setWarningOnly(false);
    debugLog('CustomerMaster sheet protection applied');
    
  } catch (error) {
    debugLog(`Error protecting CustomerMaster sheet: ${error.message}`);
  }
}
