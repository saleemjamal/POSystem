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
  } catch (err) {
    debugLog(`In grantEditAccessIfNotExists error:${err.message}`);
  }
}

/**
 * Logs debug messages to a DebugLog sheet and the Logger.
 */
function debugLog(msg, ss) {
  try {
    if (!ss) {
      ss = SpreadsheetApp.openById(MAIN_SS_ID);
    }
    var sheet = ss.getSheetByName('DebugLog');
    if (!sheet) {
      sheet = ss.insertSheet('DebugLog');
    }
    sheet.appendRow([new Date(), msg]);
    Logger.log(msg);
  } catch (e) {
    Logger.log('debugLog error: ' + e + ' | original message: ' + msg);
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