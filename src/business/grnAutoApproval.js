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
  
  debugLog('All automatic triggers set up successfully');
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Automation enabled! GRNs auto-approve hourly, POs auto-close weekly.', 
    'System Setup Complete', 
    10
  );
}

/**
 * Remove all system triggers (for maintenance or reset)
 */
function removeAllTriggers() {
  removeAutoApprovalTrigger();
  removePOClosureTrigger();
  
  debugLog('All automatic triggers removed');
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'All automation disabled. Manual operation only.', 
    'System Reset', 
    10
  );
}
