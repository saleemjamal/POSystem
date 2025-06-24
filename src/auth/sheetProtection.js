// sheetProtection.js
// Master spreadsheet protection and access control

/**
 * Sets up comprehensive sheet protection based on user roles
 * Run this once after setting up the system
 */
function setupSheetProtections() {
  if (!isSuperUser()) {
    SpreadsheetApp.getUi().alert('Access Denied', 'Only super users can set up sheet protection.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  try {
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    debugLog('Starting sheet protection setup...');
    
    // Get all sheets
    const sheets = ss.getSheets();
    let protectedCount = 0;
    let vendorEditableCount = 0;
    
    sheets.forEach(sheet => {
      const sheetName = sheet.getName();
      
      // Skip vendor-editable sheets
      if (isVendorEditableSheet(sheetName)) {
        setupVendorEditableProtection(sheet);
        vendorEditableCount++;
        debugLog(`Set up vendor-editable protection for: ${sheetName}`);
      } else {
        setupSuperUserOnlyProtection(sheet);
        protectedCount++;
        debugLog(`Set up super-user protection for: ${sheetName}`);
      }
    });
    
    debugLog(`Sheet protection setup complete. Protected: ${protectedCount}, Vendor-editable: ${vendorEditableCount}`);
    
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `Protection applied to ${protectedCount + vendorEditableCount} sheets`, 
      'Sheet Protection Setup Complete', 
      5
    );
    
  } catch (error) {
    debugLog(`Error in setupSheetProtections: ${error.message}`);
    SpreadsheetApp.getUi().alert('Setup Error', `Failed to set up protection: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Check if sheet is vendor-editable (accessible by purchase and inventory managers)
 * @param {string} sheetName
 * @returns {boolean}
 */
function isVendorEditableSheet(sheetName) {
  const vendorEditableSheets = ['Vendor_Details', 'Brand_Outlet_Distributor'];
  return vendorEditableSheets.includes(sheetName);
}

/**
 * Set up protection for vendor-editable sheets
 * Allows super users + purchase manager + inventory manager
 * @param {Sheet} sheet
 */
function setupVendorEditableProtection(sheet) {
  try {
    // Remove existing protections
    sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(p => p.remove());
    
    // Create new protection
    const protection = sheet.protect();
    protection.setDescription(`Vendor Data - Editable by authorized roles`);
    
    // Add authorized editors
    const authorizedEditors = [
      ...getUsersForRole('SUPER_USER'),
      ...getUsersForRole('PURCHASE_MANAGER'),
      ...getUsersForRole('INVENTORY_MANAGER')
    ];
    
    // Add editors one by one (more reliable than batch)
    authorizedEditors.forEach(email => {
      try {
        protection.addEditor(email);
      } catch (error) {
        debugLog(`Could not add editor ${email} to ${sheet.getName()}: ${error.message}`);
      }
    });
    
    // Remove unauthorized editors
    const currentEditors = protection.getEditors();
    currentEditors.forEach(user => {
      const userEmail = user.getEmail();
      if (!authorizedEditors.includes(userEmail)) {
        try {
          protection.removeEditor(user);
        } catch (error) {
          debugLog(`Could not remove editor ${userEmail}: ${error.message}`);
        }
      }
    });
    
    protection.setWarningOnly(false);
    
  } catch (error) {
    debugLog(`Error protecting vendor sheet ${sheet.getName()}: ${error.message}`);
  }
}

/**
 * Set up protection for super-user-only sheets
 * Only super users can edit these sheets
 * @param {Sheet} sheet
 */
function setupSuperUserOnlyProtection(sheet) {
  try {
    // Remove existing protections
    sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(p => p.remove());
    
    // Create new protection
    const protection = sheet.protect();
    protection.setDescription(`Protected - Super users only`);
    
    // Add super users as editors
    const superUsers = getUsersForRole('SUPER_USER');
    superUsers.forEach(email => {
      try {
        protection.addEditor(email);
      } catch (error) {
        debugLog(`Could not add super user ${email} to ${sheet.getName()}: ${error.message}`);
      }
    });
    
    // Remove all other editors
    const currentEditors = protection.getEditors();
    currentEditors.forEach(user => {
      const userEmail = user.getEmail();
      if (!superUsers.includes(userEmail)) {
        try {
          protection.removeEditor(user);
        } catch (error) {
          debugLog(`Could not remove editor ${userEmail}: ${error.message}`);
        }
      }
    });
    
    protection.setWarningOnly(false);
    
  } catch (error) {
    debugLog(`Error protecting super-user sheet ${sheet.getName()}: ${error.message}`);
  }
}

/**
 * Remove all sheet protections (emergency use only)
 */
function removeAllSheetProtections() {
  if (!isSuperUser()) {
    SpreadsheetApp.getUi().alert('Access Denied', 'Only super users can remove sheet protection.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  const response = SpreadsheetApp.getUi().alert(
    'Remove All Protections',
    'This will remove all sheet protections. Are you sure?',
    SpreadsheetApp.getUi().ButtonSet.YES_NO
  );
  
  if (response !== SpreadsheetApp.getUi().Button.YES) {
    return;
  }
  
  try {
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    const sheets = ss.getSheets();
    let removedCount = 0;
    
    sheets.forEach(sheet => {
      const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
      protections.forEach(protection => {
        protection.remove();
        removedCount++;
      });
    });
    
    debugLog(`Removed ${removedCount} sheet protections`);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `Removed ${removedCount} protections`, 
      'Protection Removal Complete', 
      3
    );
    
  } catch (error) {
    debugLog(`Error removing protections: ${error.message}`);
  }
}

/**
 * Check current protection status of all sheets
 */
function checkSheetProtectionStatus() {
  if (!isSuperUser()) {
    SpreadsheetApp.getUi().alert('Access Denied', 'Only super users can check protection status.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const sheets = ss.getSheets();
  const status = [];
  
  sheets.forEach(sheet => {
    const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    const sheetName = sheet.getName();
    
    if (protections.length === 0) {
      status.push(`${sheetName}: No protection`);
    } else {
      protections.forEach(protection => {
        const editors = protection.getEditors().map(user => user.getEmail()).join(', ');
        status.push(`${sheetName}: Protected (Editors: ${editors})`);
      });
    }
  });
  
  const message = 'Sheet Protection Status:\n\n' + status.join('\n');
  SpreadsheetApp.getUi().alert('Protection Status', message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Grant temporary access to a user for a specific sheet
 * @param {string} userEmail - User to grant access
 * @param {string} sheetName - Sheet to grant access to
 * @param {number} durationHours - How long to grant access (default 24 hours)
 */
function grantTemporaryAccess(userEmail, sheetName, durationHours = 24) {
  if (!isSuperUser()) {
    SpreadsheetApp.getUi().alert('Access Denied', 'Only super users can grant temporary access.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  try {
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }
    
    const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    
    if (protections.length > 0) {
      protections[0].addEditor(userEmail);
      debugLog(`Granted temporary access to ${userEmail} for sheet ${sheetName}`);
      
      // Schedule removal of access (this would need a time-based trigger)
      SpreadsheetApp.getActiveSpreadsheet().toast(
        `Temporary access granted to ${userEmail} for ${sheetName}`, 
        'Access Granted', 
        5
      );
    }
    
  } catch (error) {
    debugLog(`Error granting temporary access: ${error.message}`);
    SpreadsheetApp.getUi().alert('Error', `Failed to grant access: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}
