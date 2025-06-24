function testOnEdit(e) {
  SpreadsheetApp.getActiveSpreadsheet().toast(e ? e.value : "Event is undefined");
}
/**
 * Process a single PO row.
 * Returns "OK" | "MISSING_SHEET" | "INVALID_LINK" | "EMAIL_FAIL" | "ERROR"
 */
function processPORow(rowArr, rowNum, headerMap, sheet) {
  const STATUS_APPROVED = 'Approved';
  const EMAIL_SENT_MARKER = 'Sent';
  debugLog(`In processPORow`)

  const isApproved = rowArr[headerMap.Approved] === true;
  const isEmailSent = rowArr[headerMap.EmailSent] === true;
  if (!isApproved || isEmailSent) { return 'SKIPPED'; }

  // 1. Parse link
  const poLink   = rowArr[headerMap.Link];
  const poName = rowArr[headerMap.POName];
     
  const matches  = poLink ? poLink.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)\/.*[#&]gid=(\d+)/) : null;
  if (!matches) {
    sheet.getRange(rowNum, headerMap.EmailSent + 1).setValue("Invalid Link");
    return "INVALID_LINK";
  }
  const [ , fileId, gidStr ] = matches;
  // 2. Open file & locate sheet
  let poSheet;
  var now = new Date();
  //var normalizedOutletName = rowArr[headerMap.OutletName].replace(/\s+/g, ' ').trim(); 
  //var brandName = rowArr[headerMap.Brand]
  //debugLog(`Normalized shortened Outlet:${outletShortName}, Brand:${brandName}, Todays Date:${todaysDate}`)
  
  try {
    // 1️⃣ Read the exact sheet name you stored earlier:
      debugLog(`POName:${poName}`)
      if (!poName) {
        sheet.getRange(rowNum, headerMap.EmailSent + 1).setValue("Missing POName");
        return "ERROR";
      }
      // 2️⃣ Open it directly:
      let poSheet = SpreadsheetApp
                .openById(fileId)
                .getSheetByName(poName);

      // 1. Grab the fresh amount from L1
      const freshAmount = poSheet.getRange('L1').getValue();

      // 2. Write it back to POTracking
      sheet.getRange(rowNum, headerMap.POAmount + 1)   // same row you're emailing
          .setValue(freshAmount)
          .setNumberFormat('"₹"#,##,##0.00');

      
      if (!poSheet) {
        sheet.getRange(rowNum, headerMap.EmailSent + 1).setValue("Sheet Not Found");
        return "MISSING_SHEET";
      }
  } catch (err) {
    // bad fileId or access; flag and exit
    sheet.getRange(rowNum, headerMap.EmailSent + 1).setValue("Bad FileId/Access");
    return "ERROR";
  }
  
  // 3 – 7. normal processing
  try {
    //debugLog(`Before GID:${poSheet.getSheetId()}`)
    let poSheet = SpreadsheetApp
                .openById(fileId)
                .getSheetByName(poName);
    
    cleanPO(poSheet)

      // 1. Grab the fresh amount from L1
    const freshAmount = poSheet.getRange('L1').getValue();
    protectExternalSheet(fileId,poName);
    SpreadsheetApp.flush();
    const tempSS = SpreadsheetApp.create('PDF_TEMP_' + Date.now());
    const pdfBlob = exportSelectedColumnsPDF(
      fileId,poName, wantedColumns,
      { poNumber: rowArr[headerMap.PONumber],
        brand    : rowArr[headerMap.Brand],
        outlet   : rowArr[headerMap.OutletName],
        dateCreated: rowArr[headerMap.DateCreated],
        poAmount : freshAmount },
        tempSS
    );

    const emailResult = sendEmailToDistributor(
      rowArr[headerMap.DistributorEmail],
      rowArr[headerMap.Brand],
      rowArr[headerMap.OutletName],
      rowArr[headerMap.DistributorName],
      pdfBlob
    );

    if (emailResult !== "SUCCESS") {
      sheet.getRange(rowNum, headerMap.EmailSent + 1).setValue(emailResult);
      return "EMAIL_FAIL";
    }

    sheet.getRange(rowNum, headerMap.EmailSent + 1).setValue(true);
    transferPOtoPOLineItems(fileId,poName);
    DriveApp.getFileById(tempSS.getId()).setTrashed(true);
    return "OK";

  } catch (err) {
    sheet.getRange(rowNum, headerMap.EmailSent + 1).setValue("Script Error");
    Logger.log(`Row ${rowNum} – unexpected error: ${err.message}`);
    return err.message;
  }
}


/**
 * Send the most-recent version of an already-created PO.
 * Called by a webhook / AppSheet "Run script" action with JSON: { "poNumber": "12345" }
 *
 * @param {string|number} poNumber  – the PO number (must match POTracking column exactly)
 * @returns {string}  Same status codes as processPORow: "OK" | "SKIPPED" | …
 */
function sendUpdatedPO(poNumber) {

  // 1️⃣  Open POTracking and build header map
  const ss        = SpreadsheetApp.openById(MAIN_SS_ID);
  const sheet     = ss.getSheetByName('POTracking');
  if (!sheet) {debugLog('POTracking sheet not found');return 'ERROR';}
  else {debugLog('POTracking sheet found');}

  const data      = sheet.getDataRange().getValues();
  const headers   = data[0];
  const headerMap = headers.reduce((m, h, i) => (m[h] = i, m), {});

  // 2️⃣  Find the row with this PONumber
  let rowIdx = -1;
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][headerMap.PONumber]) === String(poNumber)) {
      rowIdx = r;
      break;
    }
  }
  if (rowIdx === -1) {
    debugLog(`PONumber ${poNumber} not found in POTracking`);
  }
  debugLog(`Row to sendPO:${rowIdx}, RowData:${data[rowIdx]}`)

  // 3️⃣  Run your existing processing routine on that one row
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10 * 1000)) debugLog('Could not obtain script lock');


  try {
    const status = processPORow(
      data[rowIdx],      // row array
      rowIdx + 1,        // 1-based row number for write-back
      headerMap,
      sheet
    );
    debugLog(`sendUpdatedPO → row ${rowIdx + 1}: ${status}`);
    return status;       // "OK", "SKIPPED", "EMAIL_FAIL", etc.

  } finally {
    lock.releaseLock();
  }
}


