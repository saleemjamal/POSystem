// poService.js
// All Purchase Order (PO) creation, archiving, and tracking logic for Google Apps Script

/**
 * Creates a PO or CO sheet, archives it, and updates POTracking.
 * @param {string} outletName
 * @param {string} brandName
 * @param {string} poNumber
 * @param {string} orderType
 * @param {Object[][]} poRows
 */
function createPO(outletName, brandName, poNumber, orderType = "PO", poRows = null) {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const skuSheet = ss.getSheetByName('SKUClassification');
  const now = new Date();
  const prefix = (orderType === "CO") ? "CO" : "PO";
  const outletKey = outletShort[outletName.replace(/\s+/g, ' ').trim()] || 'UNK';
  const poName = `${prefix}-${outletKey}-${brandName}-${Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), 'yyMMdd')}`;

  let newRows = poRows;
  if (!newRows) {
    const data = skuSheet.getDataRange().getValues();
    const head = data[0];
    const idx = {
      outlet: head.indexOf('Outlet'),
      brand: head.indexOf('Brand'),
      sku: head.indexOf('SKU'),
      name: head.indexOf('ItemName'),
      cost: head.indexOf('AvgCost'),
      qty: head.indexOf('FinalOrderQty'),
      stock: head.indexOf('CS'),
    };
    newRows = data.slice(1)
      .filter(r => r[idx.outlet].replace(/\s+/g, ' ').trim() === outletName && r[idx.brand] === brandName)
      .map(r => [
        Utilities.getUuid(),
        poNumber,
        poName,
        outletName,
        brandName,
        r[idx.sku],
        r[idx.name],
        Number(r[idx.cost]).toFixed(2),
        r[idx.qty],
        Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd'),
        r[idx.stock],
        orderType
      ]);
  }
  if (newRows.length === 0) {
    Logger.log(`No line items for ${outletName} – ${brandName}. Skipping.`);
    return;
  }
  newRows.sort((a, b) => Number(a[8]) - Number(b[8]));
  const arch = addOrderSheetToDailyArchive(poName, newRows, poNumber, orderType);
  const poUrl = `https://docs.google.com/spreadsheets/d/${arch.archiveFileId}/edit#gid=${arch.sheet.getSheetId()}`;
  updateTrackingSheet(poNumber, poName, arch.archiveFileId, poUrl, brandName, outletName, orderType);
}

/**
 * UI entry point for creating a PO from the sidebar/webapp.
 * @param {string} outletName
 * @param {string} brandName
 * @returns {Object}
 */
function createPOFromUI(outletName, brandName) {
  try {
    const poNumber = makeSequentialPONumber();
    createPO(outletName, brandName, poNumber);
    return {
      success: true,
      message: `PO created successfully!\n\nPO Number: ${poNumber}\nOutlet: ${outletName}\nBrand: ${brandName}`,
      poNumber: poNumber
    };
  } catch (error) {
    return {
      success: false,
      message: `Error creating PO: ${error.message}`
    };
  }
}

/**
 * Generates a sequential PO number.
 * @returns {string}
 */
function makeSequentialPONumber() {
  const prop = PropertiesService.getDocumentProperties();
  const last = Number(prop.getProperty('LAST_PO_NUM') || 1000);
  const next = last + 1;
  prop.setProperty('LAST_PO_NUM', String(next));
  return next;
}

/**
 * Adds a PO/CO sheet to the daily archive file.
 * @param {string} sheetName
 * @param {Array} orderData
 * @param {string} docNumber
 * @param {string} orderType
 * @returns {Object}
 */
function addOrderSheetToDailyArchive(sheetName, orderData, docNumber, orderType = "PO") {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const file = DriveApp.getFileById(ss.getId());
  const headerRow = [
    "LineItemID", "PONumber", "OrderType", "POName",
    "Outlet", "Brand", "SKU", "ItemName",
    "AvgCost", "OrderQty", "Date", "CurrentStock"
  ];
  const folders = file.getParents();
  const parentFolder = folders.hasNext() ? folders.next() : null;
  if (!parentFolder) throw new Error("No parent folder for main SS!");
  const archiveFile = getOrCreateTodayOrderArchive(parentFolder);
  grantEditAccessIfNotExists(archiveFile.getId(), editors);
  const newSheet = createOrReplacePOSheet(archiveFile.getId(), sheetName);
  newSheet.appendRow(headerRow);
  orderData.forEach(r => {
    newSheet.appendRow([r[0], r[1], orderType, ...r.slice(2)]);
  });
  newSheet.getRange("L1").setFormula("=SUMPRODUCT(I2:I,J2:J)").setNumberFormat('"₹"#,##,##0.00');
  return { sheet: newSheet, archiveFileId: archiveFile.getId() };
}

/**
 * Updates the POTracking sheet with new PO info.
 * @param {string} poNumber
 * @param {string} poSheetName
 * @param {string} fileId
 * @param {string} hyperlinkFormula
 * @param {string} brandName
 * @param {string} outletName
 * @param {string} orderType
 */
function updateTrackingSheet(poNumber, poSheetName, fileId, hyperlinkFormula, brandName, outletName, orderType = "PO") {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const poTrackingSheet = ss.getSheetByName("POTracking");
  const trackingData = poTrackingSheet.getDataRange().getValues();
  const headers = trackingData[0];
  const idx = col => headers.indexOf(col);
  const colNum = idx("PONumber");
  const colType = idx("POType");
  const colAmount = idx("POAmount");
  const colLink = idx("Link");
  const colOutlet = idx("OutletName");
  const colBrand = idx("Brand");
  const colSheetName = idx("POName");
  const colStatus = idx("Status");
  const colDistName = idx("DistributorName");
  const colDistEmail = idx("DistributorEmail");
  const colDateCreated = idx("DateCreated");
  const colApproved = idx("Approved");
  const colEmailSent = idx("EmailSent");
  const poSheet = SpreadsheetApp.openById(fileId).getSheetByName(poSheetName);
  const amount = poSheet.getRange("L1").getValue();
  let targetRow = trackingData.findIndex(r => String(r[colNum]) === String(poNumber));
  if (targetRow === -1) {
    const lastRow = poTrackingSheet.getLastRow();
    const lastRowData = poTrackingSheet.getRange(lastRow, 1, 1, poTrackingSheet.getLastColumn()).getValues()[0];
    const isLastRowEmpty = lastRowData.every(cell => cell === '' || cell === null);
    if (isLastRowEmpty && lastRow > 1) {
      targetRow = lastRow - 1; // Use the existing empty row (0-based)
    } else {
      poTrackingSheet.insertRowAfter(lastRow);
      targetRow = lastRow; // The new row is now at lastRow + 1 (0-based)
    }
  }
  const rowRange = r => poTrackingSheet.getRange(targetRow + 1, r + 1);
  rowRange(colNum).setValue(poNumber);
  rowRange(colType).setValue(orderType);
  rowRange(colBrand).setValue(brandName);
  rowRange(colOutlet).setValue(outletName);
  rowRange(colSheetName).setValue(poSheetName);
  rowRange(colAmount).setValue(amount).setNumberFormat('"₹"#,##,##0.00');
  rowRange(colLink).setValue(hyperlinkFormula);
  const distributorName = lookupDistributor(brandName, outletName.replace(/\s+/g, " ").trim());
  const distributorEmail = lookupDistributorEmail(distributorName);
  rowRange(colDistName).setValue(distributorName);
  rowRange(colDistEmail).setValue(distributorEmail);
  if (colStatus !== -1 && !rowRange(colStatus).getValue()) {
    rowRange(colStatus).setValue("Pending");
  }
  if (colApproved !== -1) {
    const approvedCell = rowRange(colApproved);
    approvedCell.setValue(false);
    approvedCell.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  }
  if (colEmailSent !== -1) {
    const emailSentCell = rowRange(colEmailSent);
    emailSentCell.setValue(false);
    emailSentCell.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  }
  if (colDateCreated !== -1) {
    const now = new Date();
    const dateCell = rowRange(colDateCreated);
    if (!dateCell.getValue()) {
      dateCell.setValue(now).setNumberFormat("dd/mm/yy");
    }
  }
  debugLog(`Tracking updated for ${orderType} ${poNumber}`, ss);
}

/**
 * Gets or creates today's PO archive file in the parent folder.
 * @param {Folder} parentFolder
 * @returns {Spreadsheet}
 */
function getOrCreateTodayOrderArchive(parentFolder) {
  try {
    // Find or create the 'Purchase Orders' subfolder
    let poFolder;
    const folders = parentFolder.getFoldersByName('Purchase Orders');
    if (folders.hasNext()) {
      poFolder = folders.next();
    } else {
      poFolder = parentFolder.createFolder('Purchase Orders');
    }
    // Find or create the monthly subfolder (e.g., '2025-06')
    const now = new Date();
    const monthName = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
    let monthFolder;
    const monthFolders = poFolder.getFoldersByName(monthName);
    if (monthFolders.hasNext()) {
      monthFolder = monthFolders.next();
    } else {
      monthFolder = poFolder.createFolder(monthName);
    }
    const today = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");
    const baseName = "POs-" + today;
    const files = monthFolder.getFilesByName(baseName);
    if (files.hasNext()) {
      return SpreadsheetApp.openById(files.next().getId());
    } else {
      const newFile = SpreadsheetApp.create(baseName);
      const newDriveFile = DriveApp.getFileById(newFile.getId());
      monthFolder.addFile(newDriveFile);
      DriveApp.getRootFolder().removeFile(newDriveFile);
      return SpreadsheetApp.openById(newFile.getId());
    }
  } catch (err) {
    debugLog(`In getOrCreateTodayOrderArchive error:${err.message}`);
  }
}

/**
 * Ensures the PO sheet inside the archive file is recreated safely.
 * Returns the (new) sheet object so the caller can continue.
 */
function createOrReplacePOSheet(fileId, poName) {
  const ss = SpreadsheetApp.openById(fileId);
  let sheet = ss.getSheetByName(poName);
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  sheet = ss.insertSheet(poName);
  return sheet;
}

/**
 * Sends all approved POs that have not yet been sent.
 * Loops through POTracking, finds approved and unsent POs, and calls sendUpdatedPO for each.
 * Alerts the user with a summary of results.
 */
function sendApprovedPOs() {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const trackingSheet = ss.getSheetByName('POTracking');
  if (!trackingSheet) {
    SpreadsheetApp.getUi().alert('POTracking sheet not found!');
    return;
  }
  const data = trackingSheet.getDataRange().getValues();
  const headers = data[0];
  const headerMap = headers.reduce((m, h, i) => (m[h] = i, m), {});
  const requiredColumns = ['Approved', 'PONumber', 'EmailSent', 'Status'];
  for (const col of requiredColumns) {
    if (headerMap[col] === undefined) {
      SpreadsheetApp.getUi().alert(`Required column '${col}' not found in POTracking!`);
      return;
    }
  }
  let sentCount = 0;
  let errorCount = 0;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const isApproved = row[headerMap.Approved] === true;
    const emailSent = row[headerMap.EmailSent] === true;
    const poNumber = row[headerMap.PONumber];
    if (!isApproved || emailSent) {
      continue;
    }
    try {
      const result = sendUpdatedPO(poNumber);
      if (result === 'OK') {
        sentCount++;
        trackingSheet.getRange(i + 1, headerMap.EmailSent + 1).setValue(true);
        trackingSheet.getRange(i + 1, headerMap.Status + 1).setValue('Sent');
      } else {
        errorCount++;
        debugLog(`PO ${poNumber} failed to send: ${result}`);
      }
    } catch (error) {
      errorCount++;
      debugLog(`PO ${poNumber} send error: ${error.message}`);
    }
  }
  if (errorCount === 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast('All POs sent successfully!', 'Send PO Results', 10);
  } else {
    SpreadsheetApp.getActiveSpreadsheet().toast('Some POs failed to send. Check the log for details.', 'Send PO Results', 10);
  }
  debugLog(`PO Sending Complete! Sent: ${sentCount}, Errors: ${errorCount}`);
} 


/**
 * Refreshes PO values for unapproved and unsent POs by reading from archive sheets.
 * Only updates POs where Approved = false AND EmailSent = false.
 */
function refreshPOValues() {
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const trackingSheet = ss.getSheetByName('POTracking');
  if (!trackingSheet) {
    SpreadsheetApp.getUi().alert('POTracking sheet not found!');
    return;
  }

  const data = trackingSheet.getDataRange().getValues();
  const headers = data[0];
  const headerMap = headers.reduce((m, h, i) => (m[h] = i, m), {});
  
  const requiredColumns = ['Approved', 'EmailSent', 'PONumber', 'POAmount', 'Link'];
  for (const col of requiredColumns) {
    if (headerMap[col] === undefined) {
      SpreadsheetApp.getUi().alert(`Required column '${col}' not found in POTracking!`);
      return;
    }
  }

  let updatedCount = 0;
  let errorCount = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const isApproved = row[headerMap.Approved] === true;
    const emailSent = row[headerMap.EmailSent] === true;
    const poNumber = row[headerMap.PONumber];
    const linkUrl = row[headerMap.Link];

    // Only process unapproved and unsent POs
    if (isApproved || emailSent || !poNumber || !linkUrl) {
      continue;
    }

    try {
      // Extract file ID and sheet name from the link URL
      const fileIdMatch = linkUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const sheetIdMatch = linkUrl.match(/#gid=(\d+)/);
      
      if (!fileIdMatch) {
        errorCount++;
        debugLog(`PO ${poNumber}: Could not extract file ID from link`);
        continue;
      }

      const fileId = fileIdMatch[1];
      const archiveFile = SpreadsheetApp.openById(fileId);
      
      let targetSheet;
      if (sheetIdMatch) {
        const sheetId = parseInt(sheetIdMatch[1]);
        targetSheet = archiveFile.getSheets().find(sheet => sheet.getSheetId() === sheetId);
      }
      
      if (!targetSheet) {
        // Fallback: find sheet by PO number in name
        targetSheet = archiveFile.getSheets().find(sheet => 
          sheet.getName().includes(poNumber.toString())
        );
      }

      if (!targetSheet) {
        errorCount++;
        debugLog(`PO ${poNumber}: Could not find archive sheet`);
        continue;
      }

      // Read the L1 value (SUMPRODUCT formula result)
      const l1Value = targetSheet.getRange("L1").getValue();
      if (typeof l1Value === 'number' && l1Value > 0) {
        // Update the POAmount in tracking sheet
        trackingSheet.getRange(i + 1, headerMap.POAmount + 1)
          .setValue(l1Value)
          .setNumberFormat('"₹"#,##,##0.00');
        updatedCount++;
        debugLog(`PO ${poNumber}: Updated amount to ₹${l1Value.toFixed(2)}`);
      } else {
        errorCount++;
        debugLog(`PO ${poNumber}: Invalid L1 value: ${l1Value}`);
      }

    } catch (error) {
      errorCount++;
      debugLog(`PO ${poNumber}: Error refreshing value - ${error.message}`);
    }
  }

  const message = `PO Values Refresh Complete!\n\nUpdated: ${updatedCount} POs\nErrors: ${errorCount} POs`;
  if (errorCount === 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast(message, 'Refresh Complete', 5);
  } else {
    SpreadsheetApp.getUi().alert('Refresh Results', message);
  }
  
  debugLog(`PO Values Refresh: Updated ${updatedCount}, Errors ${errorCount}`);
}

/**
 * Run manually (menu, button, or time-based trigger) to create POs
 * for every row in POBatch that is not yet marked DONE.
 */
function generatePOsFromBatch() {

  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const batchSheet = ss.getSheetByName('POBatch');
  if (!batchSheet) throw new Error('POBatch sheet not found');

  const data = batchSheet.getDataRange().getValues();
  const hdr = data[0];
  const colOutlet = hdr.indexOf('Outlet');
  const colBrand = hdr.indexOf('Brand');
  const colPO = hdr.indexOf('PONumber');
  const colStatus = hdr.indexOf('Status');

  for (let r = 1; r < data.length; r++) {

      const status = (colStatus === -1) ? '' : data[r][colStatus];
      if (String(status).trim().toUpperCase() === 'DONE') continue;   // skip

      const outletName = data[r][colOutlet];
      const brandName = data[r][colBrand];
      if (!outletName && !brandName) break;                           // Break on first blank

      // Generate or use existing PO number
      let poNumber = (colPO !== -1 && data[r][colPO]) ? data[r][colPO] : makeSequentialPONumber();

      // ---- create the PO (all your heavy lifting lives inside) ----
      debugLog(
          `Row ${r + 1}: outlet="${outletName}", brand="${brandName}", status="${status}"`
      );

      createPO(outletName.replace(/\s+/g, ' ').trim(), brandName, poNumber);

      // ---- mark row as processed so you can re-run safely ----
      //if (colStatus === -1) { batchSheet.getRange(1, hdr.length + 1).setValue('Status'); }  // add header once
      batchSheet.getRange(r + 1, (colStatus === -1 ? hdr.length : colStatus) + 1).setValue('DONE');
      batchSheet.getRange(r + 1, (colStatus === -1 ? hdr.length : colPO) + 1).setValue(poNumber);
      SpreadsheetApp.flush();   // optional: writeback each loop
  }

  SpreadsheetApp.getUi().alert('Bulk PO generation finished 🎉');
}





