/**
 * GRN System Test Suite
 * Run these functions manually from Google Apps Script interface
 */

/**
 * Setup test data for GRN testing
 */
function setupGRNTestData() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    
    // Add test POs to POTracking (if they don't exist)
    const poSheet = ss.getSheetByName('POTracking');
    if (poSheet) {
      const testPOData = [
        ['TEST_PO_001', 'PO', 'TestBrand1', 'POPPAT JAMALS ADYAR', 'TEST-PO-001', 5000, 
         'https://test.com', 'TestDistributor1', 'test@dist.com', 'Sent', true, true, new Date()],
        ['TEST_PO_002', 'PO', 'TestBrand2', 'POPPAT JAMALS COIMBATORE', 'TEST-PO-002', 3000,
         'https://test.com', 'TestDistributor2', 'test2@dist.com', 'Sent', true, true, new Date()],
        ['TEST_PO_003', 'PO', 'TestBrand1', 'POPPAT JAMALS ANNA NAGAR', 'TEST-PO-003', 7500,
         'https://test.com', 'TestDistributor1', 'test@dist.com', 'Partially Received', true, true, new Date()]
      ];
      
      // Find the last row and append test data
      const lastRow = poSheet.getLastRow();
      const headers = poSheet.getRange(1, 1, 1, poSheet.getLastColumn()).getValues()[0];
      
      // Map test data to correct columns
      testPOData.forEach(testPO => {
        const row = new Array(headers.length).fill('');
        row[headers.indexOf('PONumber')] = testPO[0];
        row[headers.indexOf('POType')] = testPO[1];
        row[headers.indexOf('Brand')] = testPO[2];
        row[headers.indexOf('OutletName')] = testPO[3];
        row[headers.indexOf('POName')] = testPO[4];
        row[headers.indexOf('POAmount')] = testPO[5];
        row[headers.indexOf('Link')] = testPO[6];
        row[headers.indexOf('DistributorName')] = testPO[7];
        row[headers.indexOf('DistributorEmail')] = testPO[8];
        row[headers.indexOf('Status')] = testPO[9];
        row[headers.indexOf('Approved')] = testPO[10];
        row[headers.indexOf('EmailSent')] = testPO[11];
        row[headers.indexOf('DateCreated')] = testPO[12];
        
        poSheet.appendRow(row);
      });
    }
    
    ui.alert('GRN Test Data Setup', '✅ Test PO data has been added successfully!\n\nYou can now test GRN creation.', ui.ButtonSet.OK);
    
  } catch (error) {
    ui.alert('GRN Test Data Setup', `❌ Failed to setup test data: ${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Clean up GRN test data
 */
function cleanupGRNTestData() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    let removedCount = 0;
    
    // Remove test POs from POTracking
    const poSheet = ss.getSheetByName('POTracking');
    if (poSheet) {
      const data = poSheet.getDataRange().getValues();
      const headers = data[0];
      const poCol = headers.indexOf('PONumber');
      
      // Remove rows with test PO numbers (from bottom to top)
      for (let i = data.length - 1; i >= 1; i--) {
        if (String(data[i][poCol]).startsWith('TEST_PO_')) {
          poSheet.deleteRow(i + 1);
          removedCount++;
        }
      }
    }
    
    // Remove test GRNs from GRNTracking
    const grnSheet = ss.getSheetByName('GRNTracking');
    if (grnSheet) {
      const data = grnSheet.getDataRange().getValues();
      const headers = data[0];
      const grnCol = headers.indexOf('GRNNumber');
      
      // Remove rows with test GRN numbers (from bottom to top)
      for (let i = data.length - 1; i >= 1; i--) {
        if (String(data[i][grnCol]).startsWith('GRN-TEST_PO_')) {
          grnSheet.deleteRow(i + 1);
          removedCount++;
        }
      }
    }
    
    ui.alert('GRN Test Data Cleanup', `✅ Test data cleaned up successfully!\n\nRemoved ${removedCount} test rows.`, ui.ButtonSet.OK);
    
  } catch (error) {
    ui.alert('GRN Test Data Cleanup', `❌ Failed to cleanup test data: ${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Run all GRN system tests
 */
function runGRNTests() {
  const ui = SpreadsheetApp.getUi();
  let testResults = [];
  
  try {
    // Test 1: Check if main spreadsheet and required sheets exist
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    testResults.push("✅ Main spreadsheet accessible");
    
    const poSheet = ss.getSheetByName('POTracking');
    if (poSheet) {
      testResults.push("✅ POTracking sheet found");
    } else {
      testResults.push("❌ POTracking sheet missing");
    }
    
    // Test 2: Test GRN sheet creation
    try {
      const grnSheet = getOrCreateGRNSheet(ss);
      if (grnSheet) {
        testResults.push("✅ GRNTracking sheet created/found");
        
        // Check required columns
        const headers = grnSheet.getRange(1, 1, 1, grnSheet.getLastColumn()).getValues()[0];
        const requiredColumns = ['GRNNumber', 'PONumber', 'OutletName', 'Brand', 'InvoiceNumber', 'GRNAmount', 'Approved', 'ApprovalType'];
        
        for (const col of requiredColumns) {
          if (headers.includes(col)) {
            testResults.push(`✅ GRNTracking has ${col} column`);
          } else {
            testResults.push(`❌ GRNTracking missing ${col} column`);
          }
        }
      }
    } catch (error) {
      testResults.push(`❌ GRN sheet creation failed: ${error.message}`);
    }
    
    // Test 3: Test PO validation
    try {
      const validationResult = validateAndGetPOData('TEST_PO_001');
      if (validationResult.success) {
        testResults.push("✅ PO validation works for valid PO");
      } else {
        testResults.push(`❌ PO validation failed for valid PO: ${validationResult.message}`);
      }
      
      const invalidResult = validateAndGetPOData('INVALID_PO');
      if (!invalidResult.success) {
        testResults.push("✅ PO validation correctly rejects invalid PO");
      } else {
        testResults.push("❌ PO validation should reject invalid PO");
      }
    } catch (error) {
      testResults.push(`❌ PO validation test failed: ${error.message}`);
    }
    
    // Test 4: Test GRN number generation
    try {
      const grnNumber1 = generateGRNNumber('TEST_PO_001');
      const grnNumber2 = generateGRNNumber('TEST_PO_001');
      
      if (grnNumber1 === 'GRN-TEST_PO_001-001') {
        testResults.push("✅ First GRN number generation correct");
      } else {
        testResults.push(`❌ First GRN number incorrect: ${grnNumber1}`);
      }
      
      if (grnNumber2 === 'GRN-TEST_PO_001-001') {
        testResults.push("✅ GRN number generation consistent");
      } else {
        testResults.push(`❌ GRN number generation inconsistent: ${grnNumber2}`);
      }
    } catch (error) {
      testResults.push(`❌ GRN number generation test failed: ${error.message}`);
    }
    
    // Test 5: Test eligible POs retrieval
    try {
      const eligiblePOs = getEligiblePOsForGRN();
      if (Array.isArray(eligiblePOs)) {
        testResults.push(`✅ Eligible POs retrieval works (found ${eligiblePOs.length} POs)`);
        
        // Check if test POs are included
        const testPOFound = eligiblePOs.some(po => po.poNumber.startsWith('TEST_PO_'));
        if (testPOFound) {
          testResults.push("✅ Test POs found in eligible list");
        } else {
          testResults.push("❌ Test POs not found in eligible list");
        }
      } else {
        testResults.push("❌ Eligible POs retrieval failed");
      }
    } catch (error) {
      testResults.push(`❌ Eligible POs test failed: ${error.message}`);
    }
    
    // Test 6: Test GRN creation
    try {
      const grnResult = createGRN('TEST_PO_001', 'INV-001', 2500, new Date(), 'Test GRN');
      if (grnResult.success) {
        testResults.push(`✅ GRN creation successful: ${grnResult.grnNumber}`);
      } else {
        testResults.push(`❌ GRN creation failed: ${grnResult.message}`);
      }
    } catch (error) {
      testResults.push(`❌ GRN creation test failed: ${error.message}`);
    }
    
    // Test 8: Test HTML form file
    try {
      const html = HtmlService.createHtmlOutputFromFile('createGRNForm.html');
      testResults.push("✅ createGRNForm.html file found");
    } catch (error) {
      testResults.push(`❌ createGRNForm.html file missing: ${error.message}`);
    }
    
    // Test 9: Test auto-approval function exists
    try {
      if (typeof autoApproveOldGRNs === 'function') {
        testResults.push("✅ autoApproveOldGRNs function found");
      } else {
        testResults.push("❌ autoApproveOldGRNs function missing");
      }
    } catch (error) {
      testResults.push(`❌ Auto-approval function test failed: ${error.message}`);
    }
    
    // Test 10: Test fulfillment calculation
    try {
      updatePOFulfillmentMetrics('TEST_PO_001');
      testResults.push("✅ Fulfillment metrics update works");
    } catch (error) {
      testResults.push(`❌ Fulfillment metrics test failed: ${error.message}`);
    }
    
  } catch (error) {
    testResults.push(`❌ Test suite failed with error: ${error.message}`);
  }
  
  // Display results
  const message = "GRN System Test Results:\n\n" + testResults.join('\n');
  ui.alert('GRN Test Results', message, ui.ButtonSet.OK);
  
  // Log results for debugging
  debugLog("GRN Test Results: " + testResults.join(' | '));
  
  return testResults;
}

/**
 * Test GRN creation workflow end-to-end
 */
function testGRNCreationWorkflow() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Create a test GRN
    const grnResult = createGRNFromUI('TEST_PO_001', 'INV-TEST-001', 1500, '', 'Full workflow test');
    
    if (grnResult.success) {
      ui.alert('GRN Creation Test', `✅ Test GRN created successfully!\nGRN Number: ${grnResult.grnNumber}`, ui.ButtonSet.OK);
      
      // Test approval workflow
      const ss = SpreadsheetApp.openById(MAIN_SS_ID);
      const grnSheet = ss.getSheetByName('GRNTracking');
      const data = grnSheet.getDataRange().getValues();
      const headers = data[0];
      
      // Find the test GRN and approve it
      const grnCol = headers.indexOf('GRNNumber');
      const approvedCol = headers.indexOf('Approved');
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][grnCol] === grnResult.grnNumber) {
          grnSheet.getRange(i + 1, approvedCol + 1).setValue(true);
          
          // Simulate approval workflow
          const mockEvent = {
            source: ss,
            range: grnSheet.getRange(i + 1, approvedCol + 1)
          };
          
          // This would normally be called by onEdit trigger
          handleGRNApproval(mockEvent);
          
          ui.alert('GRN Approval Test', '✅ GRN approval workflow tested successfully!', ui.ButtonSet.OK);
          break;
        }
      }
      
    } else {
      ui.alert('GRN Creation Test', `❌ Test GRN creation failed: ${grnResult.message}`, ui.ButtonSet.OK);
    }
    
  } catch (error) {
    ui.alert('GRN Creation Test', `❌ Test failed with error: ${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Test PO status updates and late fulfillment logic
 */
function testPOStatusUpdates() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Test 1: Create GRN for 'Sent' PO to check status change to 'Partially Received'
    const grnResult1 = createGRN('TEST_PO_002', 'INV-STATUS-001', 1000, new Date(), 'Status update test');
    
    if (grnResult1.success) {
      // Check if PO status changed
      const ss = SpreadsheetApp.openById(MAIN_SS_ID);
      const poSheet = ss.getSheetByName('POTracking');
      const data = poSheet.getDataRange().getValues();
      const headers = data[0];
      
      const poCol = headers.indexOf('PONumber');
      const statusCol = headers.indexOf('Status');
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][poCol] === 'TEST_PO_002') {
          const status = data[i][statusCol];
          if (status === 'Partially Received') {
            ui.alert('PO Status Test', '✅ PO status correctly updated to "Partially Received"', ui.ButtonSet.OK);
          } else {
            ui.alert('PO Status Test', `❌ PO status should be "Partially Received" but is "${status}"`, ui.ButtonSet.OK);
          }
          break;
        }
      }
    }
    
    // Test 2: Test late fulfillment logic
    handleLateGRN('TEST_PO_003');
    ui.alert('Late Fulfillment Test', '✅ Late fulfillment logic tested', ui.ButtonSet.OK);
    
  } catch (error) {
    ui.alert('PO Status Test', `❌ Test failed with error: ${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Test old PO closure logic
 */
function testOldPOClosure() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Create an old test PO (manually set old date)
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    const poSheet = ss.getSheetByName('POTracking');
    
    // Add a test PO with old date
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 15); // 15 days ago
    
    const testOldPO = ['TEST_OLD_PO', 'PO', 'TestBrand1', 'POPPAT JAMALS ADYAR', 'TEST-OLD-PO', 2000,
                       'https://test.com', 'TestDistributor1', 'test@dist.com', 'Sent', true, true, oldDate];
    
    const headers = poSheet.getRange(1, 1, 1, poSheet.getLastColumn()).getValues()[0];
    const row = new Array(headers.length).fill('');
    
    row[headers.indexOf('PONumber')] = testOldPO[0];
    row[headers.indexOf('POType')] = testOldPO[1];
    row[headers.indexOf('Brand')] = testOldPO[2];
    row[headers.indexOf('OutletName')] = testOldPO[3];
    row[headers.indexOf('POName')] = testOldPO[4];
    row[headers.indexOf('POAmount')] = testOldPO[5];
    row[headers.indexOf('Link')] = testOldPO[6];
    row[headers.indexOf('DistributorName')] = testOldPO[7];
    row[headers.indexOf('DistributorEmail')] = testOldPO[8];
    row[headers.indexOf('Status')] = testOldPO[9];
    row[headers.indexOf('Approved')] = testOldPO[10];
    row[headers.indexOf('EmailSent')] = testOldPO[11];
    row[headers.indexOf('DateCreated')] = testOldPO[12];
    
    poSheet.appendRow(row);
    
    // Run close old POs function
    closeOldPOs();
    
    // Check if status was updated
    const updatedData = poSheet.getDataRange().getValues();
    const poCol = headers.indexOf('PONumber');
    const statusCol = headers.indexOf('Status');
    
    for (let i = 1; i < updatedData.length; i++) {
      if (updatedData[i][poCol] === 'TEST_OLD_PO') {
        const status = updatedData[i][statusCol];
        if (status.startsWith('Closed')) {
          ui.alert('Old PO Closure Test', `✅ Old PO correctly closed with status: ${status}`, ui.ButtonSet.OK);
        } else {
          ui.alert('Old PO Closure Test', `❌ Old PO should be closed but status is: ${status}`, ui.ButtonSet.OK);
        }
        break;
      }
    }
    
  } catch (error) {
    ui.alert('Old PO Closure Test', `❌ Test failed with error: ${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Test auto-approval functionality
 */
function testAutoApproval() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    const grnSheet = ss.getSheetByName('GRNTracking');
    
    // Create a test GRN with old date (2 hours ago)
    const oldDate = new Date();
    oldDate.setHours(oldDate.getHours() - 2); // 2 hours ago
    
    const testGRN = createGRN('TEST_PO_001', 'INV-AUTO-001', 1000, oldDate, 'Auto-approval test');
    
    if (testGRN.success) {
      // Run auto-approval
      autoApproveOldGRNs();
      
      // Check if it was auto-approved
      const data = grnSheet.getDataRange().getValues();
      const headers = data[0];
      
      const grnCol = headers.indexOf('GRNNumber');
      const approvedCol = headers.indexOf('Approved');
      const approvalTypeCol = headers.indexOf('ApprovalType');
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][grnCol] === testGRN.grnNumber) {
          const isApproved = data[i][approvedCol];
          const approvalType = data[i][approvalTypeCol];
          
          if (isApproved && approvalType === 'Auto') {
            ui.alert('Auto-Approval Test', '✅ Auto-approval working correctly!', ui.ButtonSet.OK);
          } else {
            ui.alert('Auto-Approval Test', `❌ Auto-approval failed. Approved: ${isApproved}, Type: ${approvalType}`, ui.ButtonSet.OK);
          }
          break;
        }
      }
    } else {
      ui.alert('Auto-Approval Test', `❌ Failed to create test GRN: ${testGRN.message}`, ui.ButtonSet.OK);
    }
    
  } catch (error) {
    ui.alert('Auto-Approval Test', `❌ Test failed with error: ${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Test manual vs auto approval types
 */
function testApprovalTypes() {
  const ui = SpreadsheetApp.getUi();
  
  try {
    // Test 1: Manual approval
    const manualGRN = createGRN('TEST_PO_002', 'INV-MANUAL-001', 500, new Date(), 'Manual approval test');
    
    if (manualGRN.success) {
      const ss = SpreadsheetApp.openById(MAIN_SS_ID);
      const grnSheet = ss.getSheetByName('GRNTracking');
      const data = grnSheet.getDataRange().getValues();
      const headers = data[0];
      
      // Find and manually approve the GRN
      const grnCol = headers.indexOf('GRNNumber');
      const approvedCol = headers.indexOf('Approved');
      const approvalTypeCol = headers.indexOf('ApprovalType');
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][grnCol] === manualGRN.grnNumber) {
          // Manually approve
          grnSheet.getRange(i + 1, approvedCol + 1).setValue(true);
          
          // Simulate manual approval trigger
          const mockEvent = {
            source: ss,
            range: grnSheet.getRange(i + 1, approvedCol + 1)
          };
          
          handleGRNApproval(mockEvent);
          
          // Check approval type
          const updatedData = grnSheet.getRange(i + 1, 1, 1, grnSheet.getLastColumn()).getValues()[0];
          const approvalType = updatedData[approvalTypeCol];
          
          if (approvalType === 'Manual') {
            ui.alert('Approval Type Test', '✅ Manual approval type set correctly!', ui.ButtonSet.OK);
          } else {
            ui.alert('Approval Type Test', `❌ Manual approval type incorrect: ${approvalType}`, ui.ButtonSet.OK);
          }
          break;
        }
      }
    }
    
  } catch (error) {
    ui.alert('Approval Type Test', `❌ Test failed with error: ${error.message}`, ui.ButtonSet.OK);
  }
}

/**
 * Run all GRN tests in sequence
 */
function runAllGRNTests() {
  const ui = SpreadsheetApp.getUi();
  
  ui.alert('Running All GRN Tests', 'This will run all GRN system tests. Make sure you have set up test data first.', ui.ButtonSet.OK);
  
  // Run tests in order
  runGRNTests();
  SpreadsheetApp.flush();
  
  testGRNCreationWorkflow();
  SpreadsheetApp.flush();
  
  testPOStatusUpdates();
  SpreadsheetApp.flush();
  
  testOldPOClosure();
  
  ui.alert('All GRN Tests Complete', '✅ All GRN system tests have been completed. Check the results in the dialogs above.', ui.ButtonSet.OK);
}
