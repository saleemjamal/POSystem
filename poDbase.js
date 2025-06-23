function transferPOtoPOLineItems(fileId,poName) {
  var ss = SpreadsheetApp.openById(MAIN_SS_ID);
  var poLineSheet = ss.getSheetByName('POLineItems');

  debugLog(`In transfer!${poLineSheet.getSheetId()}`,ss)
  let poSheet = SpreadsheetApp.openById(fileId).getSheetByName(poName);
  var poData = poSheet.getDataRange().getValues(); // Includes header
  var poHeaders = poData[0];
  
  // Build new data: add LineItemID as the first column
  var newRows = poData.slice(1);

  // Option 1: Append to existing database (usual if POLineItems is historical)
  try{
    if (newRows.length > 0) {
      poLineSheet.getRange(poLineSheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
      debugLog("SUCCESS:POLINEITEMS_WRITE",ss)
    }
  }catch(err){
    debugLog("ERROR:POLINEITEMS_WRITE")
  }
}

/**
 *  Move approved PO/CO line items to the POLineItems sheet.
 *
 *  @param {string} fileId      The source file ID.
 *  @param {string} sheetName   The source sheet name (also your POName/COName).
 *  @param {string} orderType   "PO" or "CO". Default to "PO"
 */
function transferOrderToPOLineItems(
  fileId, 
  sheetName, 
  orderType="PO") {

  const masterSS      = SpreadsheetApp.openById(MAIN_SS_ID);
  const destSheet     = masterSS.getSheetByName('POLineItems');

  const srcSheet      = SpreadsheetApp.openById(fileId)
                                       .getSheetByName(sheetName);
  const srcData       = srcSheet.getDataRange().getValues();  // header + rows
  if (srcData.length <= 1) return;                            // nothing to copy

  const rows          = srcData.slice(1);                     // skip header
  const numRows       = rows.length;
  const numCols       = rows[0].length;

  // --- paste rows ---
  const destStartRow  = destSheet.getLastRow() + 1;
  destSheet
      .getRange(destStartRow, 1, numRows, numCols)
      .setValues(rows);

  // --- overwrite the POType column for the whole block ---
  const headers       = destSheet.getRange(1, 1, 1, destSheet.getLastColumn())
                                 .getValues()[0];
  const poTypeColIdx  = headers.indexOf('POType');
  if (poTypeColIdx !== -1) {
    destSheet
      .getRange(destStartRow, poTypeColIdx + 1, numRows, 1)
      .setValue(orderType);          // "PO" or "CO"
  }

  debugLog(`${orderType} ${sheetName} → POLineItems (${numRows} rows)`);
}
