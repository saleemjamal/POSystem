/**
 * PO System Test Suite
 * Run this function manually from Google Apps Script interface
 */

/**
 * Setup test data for testing
 */
function setupTestData() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    
    // Add test data to SKUClassification (append to existing data)
    const skuSheet = ss.getSheetByName('SKUClassification');
    if (skuSheet) {
      const testData = [
        ['POPPAT JAMALS ADYAR', 'TestBrand1', 'TEST001', 'Test Item 1', 100.00, 'A', 'High', 'Fast', 10, 15, 5, 10, 'Test', 'Test justification'],
        ['POPPAT JAMALS ADYAR', 'TestBrand2', 'TEST002', 'Test Item 2', 150.00, 'B', 'Medium', 'Medium', 8, 12, 3, 9, 'Test', 'Test justification'],
        ['POPPAT JAMALS COIMBATORE', 'TestBrand1', 'TEST003', 'Test Item 3', 200.00, 'A', 'High', 'Fast', 12, 18, 6, 12, 'Test', 'Test justification'],
        ['POPPAT JAMALS COIMBATORE', 'TestBrand3', 'TEST004', 'Test Item 4', 75.00, 'C', 'Low', 'Slow', 5, 8, 2, 6, 'Test', 'Test justification']
      ];
      
      // Find the last row and append test data
      const lastRow = skuSheet.getLastRow();
      skuSheet.getRange(lastRow + 1, 1, testData.length, testData[0].length).setValues(testData);
    }
    
    // Add test data to Brand_Outlet_Distributor (append to existing data)
    const distributorSheet = ss.getSheetByName('Brand_Outlet_Distributor');
    if (distributorSheet) {
      const distributorData = [
        ['TestBrand1', 'TestDistributor1', 'TestDistributor1'],
        ['TestBrand2', 'TestDistributor2', 'TestDistributor2'],
        ['TestBrand3', 'TestDistributor3', 'TestDistributor3']
      ];
      
      // Find the last row and append test data
      const lastRow = distributorSheet.getLastRow();
      distributorSheet.getRange(lastRow + 1, 1, distributorData.length, distributorData[0].length).setValues(distributorData);
    }
    
    // Add test data to Vendor_Details (append to existing data)
    const vendorSheet = ss.getSheetByName('Vendor_Details');
    if (vendorSheet) {
      const vendorData = [
        ['TestDistributor1', 'testdist1@test.com'],
        ['TestDistributor2', 'testdist2@test.com'],
        ['TestDistributor3', 'testdist3@test.com']
      ];
      
      // Find the last row and append test data
      const lastRow = vendorSheet.getLastRow();
      vendorSheet.getRange(lastRow + 1, 1, vendorData.length, vendorData[0].length).setValues(vendorData);
    }
    
    ui.alert('Test Data Setup', '✅ Test data has been added successfully!\n\nYour existing data is preserved.\nYou can now run the tests safely.', ui.ButtonSet.OK);
    
  } catch (error) {
    ui.alert('Test Data Setup', `❌ Failed to setup test data: ${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Clean up test data (remove only test data, preserve existing data)
 */
function cleanupTestData() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    let removedCount = 0;
    
    // Remove test data from SKUClassification
    const skuSheet = ss.getSheetByName('SKUClassification');
    if (skuSheet) {
      const data = skuSheet.getDataRange().getValues();
      const testBrands = ['TestBrand1', 'TestBrand2', 'TestBrand3'];
      
      // Remove rows with test brands (from bottom to top to avoid index issues)
      for (let i = data.length - 1; i >= 1; i--) { // Skip header row
        if (testBrands.includes(data[i][1])) { // Brand is in column 1
          skuSheet.deleteRow(i + 1);
          removedCount++;
        }
      }
    }
    
    // Remove test data from Brand_Outlet_Distributor
    const distributorSheet = ss.getSheetByName('Brand_Outlet_Distributor');
    if (distributorSheet) {
      const data = distributorSheet.getDataRange().getValues();
      const testBrands = ['TestBrand1', 'TestBrand2', 'TestBrand3'];
      
      // Remove rows with test brands (from bottom to top)
      for (let i = data.length - 1; i >= 1; i--) { // Skip header row
        if (testBrands.includes(data[i][0])) { // Brand is in column 0
          distributorSheet.deleteRow(i + 1);
          removedCount++;
        }
      }
    }
    
    // Remove test data from Vendor_Details
    const vendorSheet = ss.getSheetByName('Vendor_Details');
    if (vendorSheet) {
      const data = vendorSheet.getDataRange().getValues();
      const testDistributors = ['TestDistributor1', 'TestDistributor2', 'TestDistributor3'];
      
      // Remove rows with test distributors (from bottom to top)
      for (let i = data.length - 1; i >= 1; i--) { // Skip header row
        if (testDistributors.includes(data[i][0])) { // Distributor name is in column 0
          vendorSheet.deleteRow(i + 1);
          removedCount++;
        }
      }
    }
    
    ui.alert('Test Data Cleanup', `✅ Test data has been cleaned up successfully!\n\nRemoved ${removedCount} test rows.\nYour original data is preserved.`, ui.ButtonSet.OK);
    
  } catch (error) {
    ui.alert('Test Data Cleanup', `❌ Failed to cleanup test data: ${error.message}`, ui.ButtonSet.OK);
  }
}

function runPOTests() {
  const ui = SpreadsheetApp.getUi();
  let testResults = [];
  
  try {
    // Test 1: Check if main spreadsheet exists
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    testResults.push("✅ Main spreadsheet accessible");
    
    // Test 2: Check required sheets exist
    const requiredSheets = ['SKUClassification', 'POTracking', 'Brand_Outlet_Distributor', 'Vendor_Details'];
    for (const sheetName of requiredSheets) {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        testResults.push(`✅ ${sheetName} sheet found`);
      } else {
        testResults.push(`❌ ${sheetName} sheet missing`);
      }
    }
    
    // Test 3: Check SKUClassification has required columns
    const skuSheet = ss.getSheetByName('SKUClassification');
    if (skuSheet) {
      const skuHeaders = skuSheet.getRange(1, 1, 1, skuSheet.getLastColumn()).getValues()[0];
      const requiredColumns = ['Outlet', 'Brand'];
      for (const col of requiredColumns) {
        if (skuHeaders.includes(col)) {
          testResults.push(`✅ SKUClassification has ${col} column`);
        } else {
          testResults.push(`❌ SKUClassification missing ${col} column`);
        }
      }
    }
    
    // Test 4: Check POTracking has required columns
    const trackingSheet = ss.getSheetByName('POTracking');
    if (trackingSheet) {
      const trackingHeaders = trackingSheet.getRange(1, 1, 1, trackingSheet.getLastColumn()).getValues()[0];
      const requiredColumns = ['PONumber', 'OutletName', 'Brand', 'Approved', 'EmailSent'];
      for (const col of requiredColumns) {
        if (trackingHeaders.includes(col)) {
          testResults.push(`✅ POTracking has ${col} column`);
        } else {
          testResults.push(`❌ POTracking missing ${col} column`);
        }
      }
    }
    
    // Test 5: Check if we can get outlet and brand data
    const outletData = getOutletAndBrandData();
    if (outletData.error) {
      testResults.push(`❌ Cannot get outlet/brand data: ${outletData.error}`);
    } else {
      testResults.push(`✅ Found ${outletData.outlets.length} outlets and brands data`);
    }
    
    // Test 6: Check if makeSequentialPONumber works
    try {
      const poNumber = makeSequentialPONumber();
      testResults.push(`✅ PO number generation works: ${poNumber}`);
    } catch (error) {
      testResults.push(`❌ PO number generation failed: ${error.message}`);
    }
    
    // Test 7: Check if HTML file exists
    try {
      const html = HtmlService.createHtmlOutputFromFile('createPOForm.html');
      testResults.push("✅ createPOForm.html file found");
    } catch (error) {
      testResults.push(`❌ createPOForm.html file missing: ${error.message}`);
    }
    
    // Test 8: Check distributor lookup functionality
    try {
      const distributor = lookupDistributor('TestBrand1', 'POPPAT JAMALS ADYAR');
      testResults.push(`✅ Distributor lookup works (result: ${distributor || 'not found'})`);
    } catch (error) {
      testResults.push(`❌ Distributor lookup failed: ${error.message}`);
    }
    
    // Test 9: Check if constants are defined
    if (typeof MAIN_SS_ID !== 'undefined') {
      testResults.push("✅ MAIN_SS_ID constant defined");
    } else {
      testResults.push("❌ MAIN_SS_ID constant missing");
    }
    
    // Test 10: Check if debug logging works
    try {
      debugLog("Test log message");
      testResults.push("✅ Debug logging works");
    } catch (error) {
      testResults.push(`❌ Debug logging failed: ${error.message}`);
    }
    
  } catch (error) {
    testResults.push(`❌ Test failed with error: ${error.message}`);
  }
  
  // Display results
  const message = "PO System Test Results:\n\n" + testResults.join('\n');
  ui.alert('Test Results', message, ui.ButtonSet.OK);
  
  // Log results for debugging
  debugLog("Test Results: " + testResults.join(' | '));
  
  return testResults;
}

/**
 * Quick test for PO creation functionality
 */
function testPOCreation() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Test PO creation with test data
    const testOutlet = "POPPAT JAMALS ADYAR";
    const testBrand = "TestBrand1";
    
    const result = createPOFromUI(testOutlet, testBrand);
    
    if (result.success) {
      ui.alert('PO Creation Test', `✅ Test PO created successfully!\nPO Number: ${result.poNumber}`, ui.ButtonSet.OK);
    } else {
      ui.alert('PO Creation Test', `❌ Test PO creation failed: ${result.message}`, ui.ButtonSet.OK);
    }
    
  } catch (error) {
    ui.alert('PO Creation Test', `❌ Test failed with error: ${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Test the dropdown UI data retrieval
 */
function testDropdownData() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    const data = getOutletAndBrandData();
    
    if (data.error) {
      ui.alert('Dropdown Data Test', `❌ Failed: ${data.error}`, ui.ButtonSet.OK);
      return;
    }
    
    const message = `✅ Dropdown data retrieved successfully!\n\nOutlets found: ${data.outlets.length}\n\nSample outlets:\n${data.outlets.slice(0, 3).join('\n')}\n\nSample brands for first outlet:\n${data.outletBrands[data.outlets[0]] ? data.outletBrands[data.outlets[0]].slice(0, 3).join('\n') : 'No brands found'}`;
    
    ui.alert('Dropdown Data Test', message, ui.ButtonSet.OK);
    
  } catch (error) {
    ui.alert('Dropdown Data Test', `❌ Test failed: ${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Test the send PO workflow by creating and sending a test PO to karima@poppatjamals.com.
 * The test PO will be clearly marked as a test in the POTracking sheet and email.
 */
function testSendPOWorkflow() {
  const testOutlet = 'TEST_OUTLET';
  const testBrand = 'TEST_BRAND';
  const testPOPrefix = 'TESTPO';
  const ss = SpreadsheetApp.openById(MAIN_SS_ID);
  const poTrackingSheet = ss.getSheetByName('POTracking');

  // Generate a unique test PO number
  const testPONumber = `${testPOPrefix}-${new Date().getTime()}`;

  // Create the test PO (status will be Pending, Approved/EmailSent unchecked)
  createPO(testOutlet, testBrand, testPONumber);

  // Find the row and mark as Approved
  const data = poTrackingSheet.getDataRange().getValues();
  const headers = data[0];
  const idx = col => headers.indexOf(col);
  const colNum = idx('PONumber');
  const colApproved = idx('Approved');
  const colStatus = idx('Status');
  let targetRow = data.findIndex(r => String(r[colNum]) === String(testPONumber));
  if (targetRow === -1) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Test PO not found in POTracking!', 'Test Send PO', 10);
    return;
  }
  // Mark as Approved and set Status to Approved
  poTrackingSheet.getRange(targetRow + 1, colApproved + 1).setValue(true);
  poTrackingSheet.getRange(targetRow + 1, colStatus + 1).setValue('Approved');

  // Send the test PO (will use the normal send logic)
  try {
    const result = sendUpdatedPO(testPONumber);
    if (result === 'OK') {
      SpreadsheetApp.getActiveSpreadsheet().toast('Test PO sent to karima@poppatjamals.com ✓', 'Test Send PO', 10);
    } else {
      SpreadsheetApp.getActiveSpreadsheet().toast('Test PO send failed ✗', 'Test Send PO', 10);
    }
  } catch (e) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Test PO send error ✗', 'Test Send PO', 10);
  }
} 