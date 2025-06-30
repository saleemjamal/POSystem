/**
 * Auto-approve GRNs that are older than 60 minutes
 * Run this via time-based trigger every hour
 */
function autoApproveOldGRNs() {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const grnSheet = ss.getSheetByName('GRNTracking');
  if (!grnSheet) return;
  
  const data = grnSheet.getDataRange().getValues();
  const headers = data[0];
  
  const grnDateCol = headers.indexOf('GRNDate');
  const approvedCol = headers.indexOf('Approved');
  const dateApprovedCol = headers.indexOf('DateApproved');
  const approvalTypeCol = headers.indexOf('ApprovalType');
  
  const now = new Date();
  const autoApprovalCutoff = new Date(now.getTime() - (GRN_AUTO_APPROVE_MINUTES * 60 * 1000));
  
  let autoApprovedCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const grnDate = new Date(data[i][grnDateCol]);
    const isApproved = data[i][approvedCol];
    
    // Auto-approve if: not already approved AND older than cutoff time
    if (!isApproved && grnDate < autoApprovalCutoff) {
      // Set approved checkbox to true
      grnSheet.getRange(i + 1, approvedCol + 1).setValue(true);
      // Set approval date
      grnSheet.getRange(i + 1, dateApprovedCol + 1).setValue(now);
      // Set approval type
      grnSheet.getRange(i + 1, approvalTypeCol + 1).setValue('Auto');
      
      // Trigger the same workflow as manual approval
      const poNumber = data[i][headers.indexOf('PONumber')];
      updatePOFulfillmentMetrics(poNumber);
      
      autoApprovedCount++;
      debugLog(`Auto-approved GRN: ${data[i][headers.indexOf('GRNNumber')]}`);
    }
  }
  
  if (autoApprovedCount > 0) {
    debugLog(`Auto-approved ${autoApprovedCount} GRNs`);
  }
}

/**
 * One-time setup function to create the auto-approval trigger
 * Run this once to set up hourly auto-approval
 */
function setupAutoApprovalTrigger() {
  // Delete existing triggers for this function (avoid duplicates)
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'autoApproveOldGRNs') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new hourly trigger
  ScriptApp.newTrigger('autoApproveOldGRNs')
    .timeBased()
    .everyHours(1) // Run every hour
    .create();
    
  debugLog('Auto-approval trigger created - runs every hour');
}

/**
 * Remove the auto-approval trigger (for maintenance or disable)
 */
function removeAutoApprovalTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'autoApproveOldGRNs') {
      ScriptApp.deleteTrigger(trigger);
      debugLog('Auto-approval trigger removed');
    }
  });
}

/**
 * Auto-approve Customer Orders that are older than 60 minutes
 * Run this via time-based trigger every hour
 */
function autoApproveOldCOs() {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const coSheet = ss.getSheetByName('CustomerOrders');
  if (!coSheet) return;
  
  const data = coSheet.getDataRange().getValues();
  const headers = data[0];
  
  // Build column mapping
  const columnMap = {};
  headers.forEach((header, index) => {
    if (header) columnMap[header] = index;
  });
  
  // Validate required columns exist
  const requiredColumns = ['DateCreated', 'Approved', 'Sent', 'DateApproved', 'ApprovalType'];
  const missingColumns = requiredColumns.filter(col => !(col in columnMap));
  
  if (missingColumns.length > 0) {
    debugLog(`ERROR: Missing required columns in CustomerOrders for auto-approval: ${missingColumns.join(', ')}`);
    return;
  }
  
  const dateCreatedCol = columnMap['DateCreated'];
  const approvedCol = columnMap['Approved'];
  const sentCol = columnMap['Sent'];
  const dateApprovedCol = columnMap['DateApproved'];
  const approvalTypeCol = columnMap['ApprovalType'];
  
  const now = new Date();
  const autoApprovalCutoff = new Date(now.getTime() - (CO_AUTO_APPROVE_MINUTES * 60 * 1000));
  
  let autoApprovedCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const dateCreated = new Date(data[i][dateCreatedCol]);
    const isApproved = data[i][approvedCol];
    
    // Auto-approve if: not already approved AND older than cutoff time
    if (!isApproved && dateCreated < autoApprovalCutoff) {
      // Set approved checkbox to true
      coSheet.getRange(i + 1, approvedCol + 1).setValue(true);
      // Set approval date
      coSheet.getRange(i + 1, dateApprovedCol + 1).setValue(now);
      // Set approval type to Auto
      coSheet.getRange(i + 1, approvalTypeCol + 1).setValue(CO_APPROVAL_TYPES.AUTO);
      
      // Trigger email sending workflow (this will set Sent=true on success)
      sendCOToDistributor(i + 1, coSheet);
      
      autoApprovedCount++;
      debugLog(`Auto-approved CO: ${data[i][columnMap['CONumber'] || 0]}`);
    }
  }
  
  if (autoApprovedCount > 0) {
    debugLog(`Auto-approved ${autoApprovedCount} Customer Orders`);
  }
}

/**
 * One-time setup function to create the CO auto-approval trigger
 * Run this once to set up hourly CO auto-approval
 */
function setupCOAutoApprovalTrigger() {
  // Delete existing triggers for this function (avoid duplicates)
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'autoApproveOldCOs') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new hourly trigger
  ScriptApp.newTrigger('autoApproveOldCOs')
    .timeBased()
    .everyHours(1) // Run every hour
    .create();
    
  debugLog('CO auto-approval trigger created - runs every hour');
}

/**
 * Remove the CO auto-approval trigger (for maintenance or disable)
 */
function removeCOAutoApprovalTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'autoApproveOldCOs') {
      ScriptApp.deleteTrigger(trigger);
      debugLog('CO auto-approval trigger removed');
    }
  });
}

/**
 * One-time setup function to create the PO closure trigger
 * Run this once to set up weekly PO closure
 */
function setupPOClosureTrigger() {
  // Delete existing triggers for this function (avoid duplicates)
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'closeOldPOs') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new weekly trigger (every Monday at 9 AM)
  ScriptApp.newTrigger('closeOldPOs')
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .create();
    
  debugLog('PO closure trigger created - runs every Monday at 9 AM');
}

/**
 * Remove the PO closure trigger (for maintenance or disable)
 */
function removePOClosureTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'closeOldPOs') {
      ScriptApp.deleteTrigger(trigger);
      debugLog('PO closure trigger removed');
    }
  });
}

/**
 * One-time setup function to create all system triggers
 * Run this once to set up complete automation
 */
function setupAllTriggers() {
  // Set up GRN auto-approval (hourly)
  setupAutoApprovalTrigger();
  
  // Set up PO closure (weekly)
  setupPOClosureTrigger();
  
  // Set up CO auto-approval (hourly)
  setupCOAutoApprovalTrigger();
  
  debugLog('All automatic triggers set up successfully');
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Automation enabled! GRNs and COs auto-approve hourly, POs auto-close weekly.', 
    'System Setup Complete', 
    10
  );
}

// CO approval trigger functions removed - now using menu-based workflow

/**
 * Remove all system triggers (for maintenance or reset)
 */
function removeAllTriggers() {
  removeAutoApprovalTrigger();
  removePOClosureTrigger();
  removeCOAutoApprovalTrigger();
  
  debugLog('All automatic triggers removed');
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'All automation disabled. Manual operation only.', 
    'System Reset', 
    10
  );
}
