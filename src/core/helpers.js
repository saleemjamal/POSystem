// helpers.js
// Shared utility/helper functions for Google Apps Script

/**
 * Looks up the distributor for a given brand and outlet.
 */
function lookupDistributor(brand, outlet) {
  var ss = SpreadsheetApp.openById(MAIN_SS_ID);
  var matrixSheet = ss.getSheetByName("Brand_Outlet_Distributor");
  var data = matrixSheet.getDataRange().getValues();
  var headerRow = data[0];
  var brandCol = 0;
  var outletCol = headerRow.indexOf(outlet);
  for (var i = 1; i < data.length; i++) {
    if (data[i][brandCol] == brand) {
      return data[i][outletCol];
    }
  }
  return "";
}

/**
 * Looks up the email for a given distributor name.
 */
function lookupDistributorEmail(distributorName) {
  var ss = SpreadsheetApp.openById(MAIN_SS_ID);
  var vendorSheet = ss.getSheetByName('Vendor_Details');
  var data = vendorSheet.getDataRange().getValues();
  var headerRow = data[0];
  var nameCol = headerRow.indexOf("DISTRIBUTOR NAME");
  var emailCol = headerRow.indexOf("EMAIL ID");
  for (var i = 1; i < data.length; i++) {
    if (data[i][nameCol] && data[i][nameCol].toString().toLowerCase() == distributorName.toString().toLowerCase()) {
      return data[i][emailCol];
    }
  }
  return "";
}

/**
 * Grants edit access to a file for a list of user emails if not already present.
 * Now includes role-based access control for archive files.
 */
function grantEditAccessIfNotExists(fileId, userEmails) {
  var file = DriveApp.getFileById(fileId);
  try {
    var currentEditors = file.getEditors().map(function(u) { return u.getEmail().toLowerCase(); });
    userEmails.forEach(function(email) {
      if (currentEditors.indexOf(email.toLowerCase()) === -1) {
        file.addEditor(email);
      }
    });
    
    // Apply role-based access control for archive files
    applyArchiveFileAccess(fileId);
    
  } catch (err) {
    debugLog(`In grantEditAccessIfNotExists error:${err.message}`);
  }
}

/**
 * Apply role-based access control to archive files
 * @param {string} fileId - The file ID to apply access control to
 */
function applyArchiveFileAccess(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const fileName = file.getName();
    
    // Check if this is a PO archive file
    if (fileName.includes('POs-') || fileName.includes('PO-')) {
      setupPOArchiveAccess(file);
    }
    
  } catch (error) {
    debugLog(`Error applying archive file access: ${error.message}`);
  }
}

/**
 * Set up access control for PO archive files
 * Super users: Full edit access
 * Purchase managers: Edit access to PO archives
 * Inventory managers: View-only access
 * @param {File} file - The Drive file to configure
 */
function setupPOArchiveAccess(file) {
  try {
    // Get current permissions
    const currentViewers = file.getViewers().map(user => user.getEmail().toLowerCase());
    const currentEditors = file.getEditors().map(user => user.getEmail().toLowerCase());
    
    // Get required permissions by role
    const requiredEditors = [
      ...getUsersForRole('SUPER_USER'),
      ...getUsersForRole('PURCHASE_MANAGER')
    ].map(email => email.toLowerCase());
    
    const requiredViewers = getUsersForRole('INVENTORY_MANAGER').map(email => email.toLowerCase());
    
    // Only add editors who don't already have edit access
    requiredEditors.forEach(email => {
      if (!currentEditors.includes(email)) {
        try {
          file.addEditor(email);
          debugLog(`Added editor: ${email}`);
        } catch (error) {
          debugLog(`Could not add editor ${email}: ${error.message}`);
        }
      }
    });
    
    // Only add viewers who don't already have any access
    requiredViewers.forEach(email => {
      if (!currentEditors.includes(email) && !currentViewers.includes(email)) {
        try {
          file.addViewer(email);
          debugLog(`Added viewer: ${email}`);
        } catch (error) {
          debugLog(`Could not add viewer ${email}: ${error.message}`);
        }
      }
    });
    
    debugLog(`Archive access configured for: ${file.getName()}`);
    
  } catch (error) {
    debugLog(`Error setting up PO archive access: ${error.message}`);
  }
}

/**
 * Enhanced version that applies role-based access to existing archive files
 * Run this to update access on all existing archive files
 */
function updateAllArchiveFileAccess() {
  if (!isSuperUser()) {
    SpreadsheetApp.getUi().alert('Access Denied', 'Only super users can update archive file access.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  
  try {
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    const file = DriveApp.getFileById(ss.getId());
    const folders = file.getParents();
    
    if (!folders.hasNext()) {
      throw new Error('No parent folder found for main spreadsheet');
    }
    
    const parentFolder = folders.next();
    const poFolder = getOrCreatePOFolder(parentFolder);
    
    // Get all monthly folders
    const monthFolders = poFolder.getFolders();
    let updatedCount = 0;
    
    while (monthFolders.hasNext()) {
      const monthFolder = monthFolders.next();
      const archiveFiles = monthFolder.getFiles();
      
      while (archiveFiles.hasNext()) {
        const archiveFile = archiveFiles.next();
        
        if (archiveFile.getName().includes('POs-')) {
          setupPOArchiveAccess(archiveFile);
          updatedCount++;
        }
      }
    }
    
    debugLog(`Updated access for ${updatedCount} archive files`);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `Updated access for ${updatedCount} archive files`, 
      'Archive Access Update Complete', 
      5
    );
    
  } catch (error) {
    debugLog(`Error updating archive file access: ${error.message}`);
    SpreadsheetApp.getUi().alert('Update Error', `Failed to update archive access: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Get or create the Purchase Orders folder
 * @param {Folder} parentFolder - Parent folder
 * @returns {Folder} PO folder
 */
function getOrCreatePOFolder(parentFolder) {
  const folders = parentFolder.getFoldersByName('Purchase Orders');
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder('Purchase Orders');
  }
}

/**
 * Check archive file access for current user
 * @param {string} fileId - File ID to check
 * @returns {string} Access level: 'edit', 'view', or 'none'
 */
function checkArchiveFileAccess(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const currentUser = Session.getActiveUser().getEmail().toLowerCase();
    
    // Check if user is an editor
    const editors = file.getEditors().map(user => user.getEmail().toLowerCase());
    if (editors.includes(currentUser)) {
      return 'edit';
    }
    
    // Check if user is a viewer
    const viewers = file.getViewers().map(user => user.getEmail().toLowerCase());
    if (viewers.includes(currentUser)) {
      return 'view';
    }
    
    return 'none';
    
  } catch (error) {
    debugLog(`Error checking archive file access: ${error.message}`);
    return 'none';
  }
}

/**
 * Logs debug messages to a DebugLog sheet, Logger, and file.
 */
function debugLog(msg, ss) {
  try {
    const timestamp = new Date();
    const logMessage = `[${timestamp.toISOString()}] ${msg}`;
    
    // Log to console/Logger
    Logger.log(logMessage);
    console.log(logMessage);
    
    // Log to sheet (existing functionality)
    if (!ss) {
      ss = SpreadsheetApp.openById(MAIN_SS_ID);
    }
    var sheet = ss.getSheetByName('DebugLog');
    if (!sheet) {
      sheet = ss.insertSheet('DebugLog');
    }
    sheet.appendRow([timestamp, msg]);
    
    // Log to file (new functionality)
    try {
      // Note: Google Apps Script doesn't have direct file system access
      // This would require Drive API integration for persistent file logging
      // For now, using console.log for better debugging
    } catch (fileError) {
      Logger.log('File logging not available: ' + fileError.message);
    }
    
  } catch (e) {
    Logger.log('debugLog error: ' + e + ' | original message: ' + msg);
    console.error('debugLog error: ' + e + ' | original message: ' + msg);
  }
}

/**
 * Sends an email to a distributor with a PDF attachment.
 */
function sendEmailToDistributor(email, brand, outlet, distributor, pdfBlob){
    var subject = `Purchase Order - ${brand} (${outlet})`;
    var htmlBody = PO_EMAIL_TEMPLATE(distributor, brand, outlet);
    const rules   = OUTLET_EMAIL_RULES[outlet] || {};        // empty object if no rule
    try{
      MailApp.sendEmail({
        to: email,
        cc: rules.cc,
        subject: subject,
        htmlBody: htmlBody,
        attachments: [pdfBlob]
      });
      debugLog("SUCCESS: EMAIL")
      return ("SUCCESS");
    }catch(err){
      debugLog("ERROR(email sending):" + email + " - " + err);
      return (`ERROR: ${err.message}`)
    }
}

/**
 * Protects an external sheet by removing old protections and setting new ones.
 */
function protectExternalSheet(fileId, poName) {
  const ss    = SpreadsheetApp.openById(fileId);
  const sheet = ss.getSheetByName(poName);
  if (!sheet) {
    debugLog(`protectExternalSheet – sheet "${poName}" not found in ${fileId}`);
    return 'MISSING_SHEET';
  }
  try {
    sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(p => p.remove());
    const me   = Session.getEffectiveUser();
    const prot = sheet.protect().setDescription('Locked after approval');
    prot.addEditor(me)
        .removeEditors(prot.getEditors().filter(u => u.getEmail() !== me.getEmail()))
        .setDomainEdit(false)
        .setWarningOnly(false);
    debugLog('SUCCESS: PROTECT_SHEET');
    return 'SUCCESS';
  } catch (err) {
    debugLog(`ERROR (protect sheet): ${err.message}`);
    return `ERROR: ${err.message}`;
  }
}

/**
 * Build a nicely-formatted PDF for Customer Orders. Returns a Blob ready to attach to email.
 */
function exportCOColumnsPDF(coNumber, outletName, brand, distributorName, coValue, lineItems, tempSS) {
  const tempSheet = tempSS.getSheets()[0];
  
  // Prepare line items data for PDF
  const headerRow = ['Line', 'Item Code', 'Item Name', 'Quantity', 'Cost Price', 'Notes'];
  const dataRows = lineItems.map(item => [
    item.lineNumber,
    item.itemCode,
    item.itemName,
    item.quantity,
    item.itemCostPrice,
    item.notes || ''
  ]);
  
  const colCount = headerRow.length;
  const padRow = arr => arr.concat(Array(colCount - arr.length).fill(""));
  
  // Build header rows for CO
  const headerRows = [
    [`CO Number: ${coNumber || ''}`],
    [`Date: ${formatDateForIndia(new Date()) || ''}`],
    [`Brand: ${brand || ''}`],
    [`Outlet: ${outletName || ''}`],
    Array(colCount).fill(""),
    padRow([`CO Value:`, "", coValue ? Number(coValue) : ""]),
    headerRow
  ].map(r => padRow(r));
  
  const finalData = headerRows.concat(dataRows);
  
  // Set data in temp sheet
  tempSheet.getRange(1, 1, finalData.length, colCount).setValues(finalData);
  
  // Merge header cells
  for (let i = 1; i <= 4; i++) {
    tempSheet.getRange(i, 1, 1, colCount).merge();
  }
  
  // Set professional column widths (matching PO format)
  tempSheet.setColumnWidths(1, colCount, 120);
  tempSheet.setColumnWidth(1, 60);   // Line number - narrow
  tempSheet.setColumnWidth(2, 120);  // Item Code
  tempSheet.setColumnWidth(3, 300);  // Item Name - wider for readability
  tempSheet.setColumnWidth(4, 80);   // Quantity - narrow
  tempSheet.setColumnWidth(5, 120);  // Cost Price
  tempSheet.setColumnWidth(6, 200);  // Notes - wider
  
  // Apply professional formatting
  tempSheet.getRange(1, 1, finalData.length, colCount).setFontFamily('Roboto');
  tempSheet.getRange(1, 1, 7, colCount).setFontWeight('bold');
  
  // Strategic background highlighting (item name column)
  tempSheet.getRange(8, 3, dataRows.length, 1).setBackground('#f8f9fa');
  
  // Professional alignment
  tempSheet.getRange(6, 3).setFontWeight('bold').setHorizontalAlignment('right'); // CO Value
  tempSheet.getRange(6, 1).setFontWeight('bold');
  tempSheet.getRange(8, 1, dataRows.length, 1).setHorizontalAlignment('center'); // Line numbers
  tempSheet.getRange(8, 4, dataRows.length, 1).setHorizontalAlignment('center'); // Quantity
  tempSheet.getRange(8, 5, dataRows.length, 1).setHorizontalAlignment('right');  // Cost Price
  
  // Format currency
  tempSheet.getRange(6, 3).setNumberFormat('"₹"#,##0.00'); // CO Value
  if (dataRows.length > 0) {
    tempSheet.getRange(8, 5, dataRows.length, 1).setNumberFormat('"₹"#,##0.00'); // Cost prices
  }
  
  // Professional table borders
  tempSheet.getRange(7, 1, finalData.length - 6, colCount)
           .setBorder(true, true, true, true, true, true);
  
  // Alternating row colors (professional pattern)
  for (let i = 1; i <= dataRows.length; i += 2) {
    tempSheet.getRange(7 + i, 1, 1, colCount).setBackground('#f3f3f3');
  }
  
  // Professional layout settings
  tempSheet.setRowHeights(7, finalData.length - 6, 22);
  tempSheet.setFrozenRows(7);
  tempSheet.getRange(1, 1, 6, colCount).setHorizontalAlignment("left");
  
  // Generate PDF with professional settings
  const url = `https://docs.google.com/spreadsheets/d/${tempSS.getId()}` +
              `/export?format=pdf&size=A4&portrait=true&fitw=true` +
              `&sheetnames=false&printtitle=false&pagenumbers=false` +
              `&gridlines=false&fzr=false&gid=${tempSheet.getSheetId()}`;
  
  const pdfBlob = UrlFetchApp.fetch(url, {
                   headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
                 }).getBlob().setName(`Customer_Order_${coNumber}.pdf`);
  
  return pdfBlob;
}

/**
 * Build a nicely-formatted PDF of selected columns without touching the live PO workbook. Returns a Blob ready to attach to email.
 */
function exportSelectedColumnsPDF(fileId,poName, wantedColumns, poDetails,tempSS) {
  let sourceSheet = SpreadsheetApp.openById(fileId).getSheetByName(poName);
  const tempSheet = tempSS.getSheets()[0];
  const data = sourceSheet.getDataRange().getValues();
  if (!wantedColumns || wantedColumns.length === 0) {
    wantedColumns = data[0].map((_, i) => i + 1);
  }
  const selected = data.map(r => wantedColumns.map(c => r[c - 1]));
  const colCount  = wantedColumns.length;
  const padRow    = arr => arr.concat(Array(colCount - arr.length).fill(""));
  const headerRows = [
    [`PO Number: ${poDetails.poNumber || ''}`],
    [`Date: ${formatDateForIndia(poDetails.dateCreated) || ''}`],
    [`Brand: ${poDetails.brand || ''}`],
    [`Outlet: ${poDetails.outlet || ''}`],
    Array(colCount).fill(""),
    padRow([`Amount:`, "", poDetails.poAmount ? Number(poDetails.poAmount) : ""]),
    selected[0]
  ].map(r => padRow(r));
  const finalData = headerRows.concat(selected.slice(1));
  tempSheet.getRange(1, 1, finalData.length, colCount).setValues(finalData);
  for (let i = 1; i <= 4; i++) {
    tempSheet.getRange(i, 1, 1, colCount).merge();
  }
  tempSheet.setColumnWidths(1, colCount, 120);
  tempSheet.setColumnWidth(2, 420);
  tempSheet.setColumnWidth(3, 100);
  tempSheet.getRange(1, 1, finalData.length, colCount).setFontFamily('Roboto');
  tempSheet.getRange(1, 1, 7, colCount).setFontWeight('bold');
  tempSheet.getRange(7, 2, finalData.length - 5, 1).setBackground('#f8f9fa');
  tempSheet.getRange(6, 3).setFontWeight('bold').setHorizontalAlignment('right');
  tempSheet.getRange(6, 1).setFontWeight('bold');
  tempSheet.getRange(7, 1, finalData.length - 5, 1).setHorizontalAlignment('center');
  tempSheet.getRange(7, 3, finalData.length - 5, 1).setHorizontalAlignment('center');
  tempSheet.getRange(6, 3).setNumberFormat('"₹"#,##0.00');
  tempSheet.getRange(7, 1, finalData.length - 6, colCount)
           .setBorder(true, true, true, true, true, true);
  for (let i = 1; i <= (finalData.length - 6); i += 2) {
    tempSheet.getRange(7 + i, 1, 1, colCount - 1).setBackground('#f3f3f3');
  }
  tempSheet.setRowHeights(7, finalData.length - 5, 22);
  tempSheet.setFrozenRows(7);
  tempSheet.getRange(1, 1, 6, colCount).setHorizontalAlignment("left");
  const url = `https://docs.google.com/spreadsheets/d/${tempSS.getId()}` +
              `/export?format=pdf&size=A4&portrait=true&fitw=true` +
              `&sheetnames=false&printtitle=false&pagenumbers=false` +
              `&gridlines=false&fzr=false&gid=${tempSheet.getSheetId()}`;
  const pdfBlob = UrlFetchApp.fetch(url, {
                   headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
                 }).getBlob().setName('PO.pdf');
  return pdfBlob;
}

/**
 * Formats a date for India timezone.
 */
function formatDateForIndia(dateObj) {
  return Utilities.formatDate(new Date(dateObj), "Asia/Kolkata", "dd-MMM-yyyy");
}

/**
 * Returns unique outlets and a mapping of outlets to their brands from SKUClassification.
 * Used by the PO creation UI and tests.
 */
function getOutletAndBrandData() {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const skuSheet = ss.getSheetByName('SKUClassification');
  if (!skuSheet) {
    return { error: 'SKUClassification sheet not found. Please run SKU classification first.' };
  }
  const data = skuSheet.getDataRange().getValues();
  const headers = data[0];
  const outletCol = headers.indexOf('Outlet');
  const brandCol = headers.indexOf('Brand');
  if (outletCol === -1 || brandCol === -1) {
    return { error: 'Required columns (Outlet, Brand) not found in SKUClassification sheet.' };
  }
  // Get unique outlets
  const outlets = [...new Set(data.slice(1).map(row => row[outletCol]).filter(Boolean))].sort();
  // Create outlet-brand mapping
  const outletBrands = {};
  data.slice(1).forEach(row => {
    const outlet = row[outletCol];
    const brand = row[brandCol];
    if (outlet && brand) {
      if (!outletBrands[outlet]) {
        outletBrands[outlet] = [];
      }
      if (!outletBrands[outlet].includes(brand)) {
        outletBrands[outlet].push(brand);
      }
    }
  });
  // Sort brands for each outlet
  Object.keys(outletBrands).forEach(outlet => {
    outletBrands[outlet].sort();
  });
  return {
    outlets: outlets,
    outletBrands: outletBrands
  };
}

/**
 * Removes rows whose OrderQty = 0 and sorts the rest ascending on that column.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} poSheet - The PO sheet to clean.
 * @param {string} [qtyHeader='OrderQty'] - Header text of the qty column.
 * @throws {Error} If the quantity column is not found.
 */
const cleanPO = (poSheet, qtyHeader = 'OrderQty') => {
  const data = poSheet.getDataRange().getValues();
  const headers = data[0];
  const qtyColIdx = headers.indexOf(qtyHeader);
  if (qtyColIdx === -1) {
    throw new Error(`Column "${qtyHeader}" not found in ${poSheet.getName()}`);
  }
  // Delete rows whose qty is 0 (bottom-up loop)
  for (let r = data.length - 1; r >= 1; r--) {
    if (Number(data[r][qtyColIdx]) === 0) {
      poSheet.deleteRow(r + 1);
    }
  }
  // Sort remaining rows by qty ascending
  const lastRow = poSheet.getLastRow();
  const lastCol = poSheet.getLastColumn();
  if (lastRow > 1) {
    poSheet.getRange(2, 1, lastRow - 1, lastCol)
      .sort({ column: qtyColIdx + 1, ascending: true });
  }
}; 