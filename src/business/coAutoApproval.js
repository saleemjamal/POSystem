// coAutoApproval.js
// Customer Order auto-approval system (similar to GRN auto-approval)

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
  
  const dateCreatedCol = headers.indexOf('DateCreated');
  const approvedCol = headers.indexOf('Approved');
  const dateApprovedCol = headers.indexOf('DateApproved');
  const approvalTypeCol = headers.indexOf('ApprovalType');
  const statusCol = headers.indexOf('Status');
  
  const now = new Date();
  const autoApprovalCutoff = new Date(now.getTime() - (60 * 60 * 1000)); // 60 minutes ago
  
  let autoApprovedCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const dateCreated = new Date(data[i][dateCreatedCol]);
    const isApproved = data[i][approvedCol];
    const currentStatus = data[i][statusCol];
    
    // Auto-approve if: not already approved AND older than cutoff time AND status is Pending
    if (!isApproved && dateCreated < autoApprovalCutoff && currentStatus === CO_STATUS.PENDING) {
      // Set approved checkbox to true
      coSheet.getRange(i + 1, approvedCol + 1).setValue(true);
      // Set approval date
      coSheet.getRange(i + 1, dateApprovedCol + 1).setValue(now);
      // Set approval type
      coSheet.getRange(i + 1, approvalTypeCol + 1).setValue('Auto');
      // Update status to Approved
      coSheet.getRange(i + 1, statusCol + 1).setValue(CO_STATUS.APPROVED);
      
      autoApprovedCount++;
      debugLog(`Auto-approved CO: ${data[i][headers.indexOf('CONumber')]}`);
    }
  }
  
  if (autoApprovedCount > 0) {
    debugLog(`Auto-approved ${autoApprovedCount} Customer Orders`);
  }
}

/**
 * Handle manual CO approval when checkbox is changed
 * Similar to GRN approval workflow
 * @param {Object} editEvent - The edit event from onEdit
 */
function handleCOApproval(editEvent) {
  const sheet = editEvent.source.getActiveSheet();
  if (sheet.getName() !== 'CustomerOrders') return;
  
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
  
  // Update status to Approved
  const statusCol = headers.indexOf('Status');
  if (statusCol !== -1) {
    sheet.getRange(row, statusCol + 1).setValue(CO_STATUS.APPROVED);
  }
  
  // Get CO data
  const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const coNumber = rowData[headers.indexOf('CONumber')];
  
  debugLog(`CO manually approved: ${coNumber}`);
}

/**
 * Setup trigger for CO auto-approval (add to existing trigger setup)
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
 * Remove CO auto-approval trigger
 */
function removeCOAutoApprovalTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'autoApproveOldCOs') {
      ScriptApp.deleteTrigger(trigger);
      debugLog('CO auto-approval trigger removed');
    }
  });
}
