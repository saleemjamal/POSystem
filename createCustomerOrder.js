function createCustomerOrder(event) {
  const row     = event.newValues;
  const headers = event.columnHeaders;
  const idx     = c => headers.indexOf(c);

  const poNumber = row[idx('PONumber')];          // CO key
  const outlet   = row[idx('OutletName')];
  const brand    = row[idx('Brand')];

  /* --- gather the child rows AppSheet just wrote ----------------- */
  const ss         = SpreadsheetApp.openById(MAIN_SS_ID);
  const lineSheet  = ss.getSheetByName('POLineItems');
  const linesHead  = lineSheet.getDataRange().getValues()[0];
  const lnIdx      = linesHead.indexOf('PONumber');
  const block      = lineSheet.getDataRange().getValues()
                     .filter(r => r[lnIdx] === poNumber);

  /* --- hand off to the generic createPO() with orderType = "CO" -- */
  createPO(outlet, brand, poNumber, "CO", block);
}
