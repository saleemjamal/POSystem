
/**
 * Test function to create a sample customer order
 */
function createTestCustomerOrder() {
    if (!isSuperUser()) {
      SpreadsheetApp.getUi().alert('Access Denied', 'Only super users can create test data.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    const testOrderData = {
      outletName: 'POPPAT JAMALS ADYAR',
      brand: 'TestBrand1',
      customerName: 'John Doe',
      customerEmail: 'john.doe@email.com',
      customerPhone: '+91 9876543210',
      customerPIC: 'ABCD1234',
      itemCode: 'NEW_ITEM',
      itemName: 'Test Customer Item',
      quantity: 2,
      notes: 'Test customer order - urgent delivery needed'
    };
    
    const result = createCustomerOrder(testOrderData);
    
    if (result.success) {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        `Test customer order created: ${result.coNumber}`, 
        'Test Order Created', 
        5
      );
    } else {
      SpreadsheetApp.getUi().alert('Test Failed', result.message, SpreadsheetApp.getUi().ButtonSet.OK);
    }
  }
  
  /**
   * Clean up test customer order data
   */
  function cleanupTestCustomerOrders() {
    if (!isSuperUser()) {
      SpreadsheetApp.getUi().alert('Access Denied', 'Only super users can cleanup test data.', SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
    
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    let removedCount = 0;
    
    // Remove test customer orders
    const coSheet = ss.getSheetByName('CustomerOrders');
    if (coSheet) {
      const data = coSheet.getDataRange().getValues();
      const headers = data[0];
      const customerCol = headers.indexOf('CustomerName');
      
      // Remove rows with test customer names (from bottom to top)
      for (let i = data.length - 1; i >= 1; i--) {
        if (String(data[i][customerCol]).includes('Test') || String(data[i][customerCol]).includes('John Doe')) {
          coSheet.deleteRow(i + 1);
          removedCount++;
        }
      }
    }
    
    // Remove test customers from CustomerMaster
    const customerSheet = ss.getSheetByName('CustomerMaster');
    if (customerSheet) {
      const data = customerSheet.getDataRange().getValues();
      const headers = data[0];
      const nameCol = headers.indexOf('CustomerName');
      
      // Remove rows with test customer names (from bottom to top)
      for (let i = data.length - 1; i >= 1; i--) {
        if (String(data[i][nameCol]).includes('Test') || String(data[i][nameCol]).includes('John Doe')) {
          customerSheet.deleteRow(i + 1);
          removedCount++;
        }
      }
    }
    
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `Cleaned up ${removedCount} test records`, 
      'Cleanup Complete', 
      3
    );
  }
  