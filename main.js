// main.js
// Entry points, menu setup, and UI triggers for Google Apps Script

/**
 * Adds custom menu to the Google Sheets UI.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('PO System')
    .addItem('Classify SKUs', 'classifySKUs')
    .addSeparator()
    .addItem('Generate POs from Batch', 'generatePOsFromBatch')
    .addItem('Create Single PO', 'showCreatePODialog')
    .addSeparator()
    .addItem('Send Approved POs', 'sendApprovedPOs')
    .addSeparator()
    .addItem('Create GRN', 'showCreateGRNDialog')
    .addSeparator()
    .addItem('Help', 'showHelpDialog')
    .addToUi();
}

/**
 * Shows the Create GRN dialog/sidebar.
 */
function showCreateGRNDialog() {
  const html = HtmlService.createHtmlOutputFromFile('createGRNForm.html')
    .setTitle('Create Goods Receipt Note (GRN)')
    .setWidth(450);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * OnEdit trigger to handle GRN approval and other sheet changes
 */
function onEdit(e) {
  try {
    // Handle GRN approval
    if (e.source.getActiveSheet().getName() === 'GRNTracking') {
      handleGRNApproval(e);
    }
    
    // Add other onEdit handlers here as needed
    
  } catch (error) {
    debugLog(`OnEdit error: ${error.message}`);
  }
}

/**
 * Shows the Create PO dialog/sidebar.
 */
function showCreatePODialog() {
  const html = HtmlService.createHtmlOutputFromFile('createPOForm.html')
    .setTitle('Create Purchase Order')
    .setWidth(400);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Returns the static help content for the sidebar Help button.
 */
function getHelpContent() {
  return HtmlService.createHtmlOutputFromFile('helpContent.html').getContent();
}

/**
 * Opens the PO System Help dialog.
 */
function showHelpDialog() {
  const html = HtmlService.createHtmlOutputFromFile('helpContent.html')
    .setWidth(500)
    .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'PO System Help');
} 

