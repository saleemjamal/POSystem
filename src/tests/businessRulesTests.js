// businessRulesTests.js
// Test suite for business rules functionality

/**
 * Test function to validate business rules functionality
 * Run this from Apps Script editor to test the system
 */
function testBusinessRules() {
  debugLog('=== Testing Business Rules System ===');
  
  // Test cases
  const testCases = [
    {
      sku: 'TEST001',
      vendor: 'Test Vendor',
      brand: 'Dankotuwa', 
      itemName: 'Dinner Plates Set',
      outlet: 'POPPAT JAMALS ADYAR',
      currentStock: 2,
      standardQty: 5,
      expectedRule: 'Should match plates MOQ rule'
    },
    {
      sku: 'TEST002',
      vendor: 'Any Vendor',
      brand: 'Any Brand',
      itemName: 'Crystal Vase',
      outlet: 'POPPAT JAMALS ADYAR', 
      currentStock: 1,
      standardQty: 3,
      expectedRule: 'Should match crystal safety stock rule'
    },
    {
      sku: 'TEST003',
      vendor: 'Any Vendor',
      brand: 'Any Brand',
      itemName: 'Regular Item',
      outlet: 'POPPAT JAMALS ADYAR',
      currentStock: 10,
      standardQty: 15,
      expectedRule: 'Should not match any rules - return standard'
    },
    {
      sku: 'TEST004',
      vendor: 'Premium Vendor',
      brand: 'Test Brand',
      itemName: 'Bulk Item',
      outlet: 'ANY',
      currentStock: 60,
      standardQty: 10,
      expectedRule: 'Should match bulk discount rule (if enabled)'
    },
    {
      sku: 'TEST005',
      vendor: 'Any Vendor',
      brand: 'Any Brand',
      itemName: 'discontinued item',
      outlet: 'ANY',
      currentStock: 5,
      standardQty: 8,
      expectedRule: 'Should match dead stock prevention rule'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    debugLog(`\nTest Case ${index + 1}: ${testCase.expectedRule}`);
    debugLog(`Input: SKU=${testCase.sku}, Stock=${testCase.currentStock}, Standard=${testCase.standardQty}`);
    
    const result = applyBusinessRules(
      testCase.sku,
      testCase.vendor, 
      testCase.brand,
      testCase.itemName,
      testCase.outlet,
      testCase.currentStock,
      testCase.standardQty
    );
    
    debugLog(`Result: Quantity=${result.quantity}, Justification=${result.justification || 'None'}`);
  });
  
  debugLog('\n=== Business Rules Testing Complete ===');
}

/**
 * Test individual rule matching functions
 * Note: These functions are internal to businessRules.js, so we test them indirectly
 */
function testRuleMatchingFunctions() {
  debugLog('=== Testing Rule Matching Functions (Indirect) ===');
  
  // Test criteria matching indirectly through applyBusinessRules
  debugLog('\n--- Testing Criteria Matching ---');
  
  // Create test scenarios that exercise the matching logic
  const testScenarios = [
    {
      name: 'Exact vendor match',
      sku: 'TEST_VENDOR',
      vendor: 'Test Vendor',
      brand: 'ANY',
      itemName: 'Test Item',
      outlet: 'ANY',
      stock: 5,
      standardQty: 10,
      description: 'Should test vendor matching logic'
    },
    {
      name: 'Product filter matching',
      sku: 'TEST_PRODUCT',
      vendor: 'ANY',
      brand: 'ANY', 
      itemName: 'Dinner Plates Set',
      outlet: 'ANY',
      stock: 2,
      standardQty: 5,
      description: 'Should test product filter contains logic'
    },
    {
      name: 'Stock condition testing',
      sku: 'TEST_STOCK',
      vendor: 'ANY',
      brand: 'ANY',
      itemName: 'ANY',
      outlet: 'ANY',
      stock: 8,
      standardQty: 15,
      description: 'Should test stock condition evaluation'
    }
  ];
  
  testScenarios.forEach(scenario => {
    debugLog(`\n--- ${scenario.name} ---`);
    debugLog(`Scenario: ${scenario.description}`);
    
    const result = applyBusinessRules(
      scenario.sku,
      scenario.vendor,
      scenario.brand,
      scenario.itemName,
      scenario.outlet,
      scenario.stock,
      scenario.standardQty
    );
    
    debugLog(`Result: Quantity=${result.quantity}, Rule Applied=${result.justification ? 'Yes' : 'No'}`);
  });
  
  debugLog('\n=== Rule Matching Functions Testing Complete ===');
}

/**
 * Test business rules integration with SKU classification
 */
function testBusinessRulesIntegration() {
  debugLog('=== Testing Business Rules Integration ===');
  
  try {
    // Check if BusinessRules sheet exists
    const ss = SpreadsheetApp.openById(MAIN_SS_ID);
    const rulesSheet = ss.getSheetByName('BusinessRules');
    
    if (!rulesSheet) {
      debugLog('BusinessRules sheet not found. Please run createBusinessRulesSheet() first.');
      return;
    }
    
    // Test column mapping
    debugLog('\n--- Testing Column Mapping ---');
    const columnMap = getBusinessRulesColumnMapping();
    debugLog('Column mapping successful: ' + JSON.stringify(Object.keys(columnMap)));
    
    // Test rule loading
    debugLog('\n--- Testing Rule Loading ---');
    const data = rulesSheet.getDataRange().getValues();
    const rules = data.slice(1).filter(row => {
      const ruleName = row[columnMap['RuleName']];
      const active = row[columnMap['Active']];
      return ruleName && String(active).toUpperCase() === 'TRUE';
    });
    
    debugLog(`Found ${rules.length} active rules in BusinessRules sheet`);
    
    rules.forEach((rule, index) => {
      const ruleName = rule[columnMap['RuleName']];
      const priority = rule[columnMap['Priority']];
      debugLog(`Rule ${index + 1}: ${ruleName} (Priority: ${priority})`);
    });
    
    debugLog('\n--- Testing Sample Integration ---');
    
    // Test with a known scenario that should match sample rules
    const testResult = applyBusinessRules(
      'SAMPLE001',
      'Test Vendor',
      'Dankotuwa',
      'Dinner Plates',
      'POPPAT JAMALS ADYAR',
      2, // Stock <= 3, should trigger plates MOQ rule
      4  // Standard quantity
    );
    
    debugLog(`Integration test result: Quantity=${testResult.quantity}, Justification=${testResult.justification || 'None'}`);
    
  } catch (error) {
    debugLog(`Integration test error: ${error.message}`);
  }
  
  debugLog('\n=== Business Rules Integration Testing Complete ===');
}

/**
 * Comprehensive test suite - runs all business rules tests
 */
function runAllBusinessRulesTests() {
  debugLog('=== COMPREHENSIVE BUSINESS RULES TEST SUITE ===');
  debugLog(`Start Time: ${new Date().toISOString()}`);
  
  try {
    // Test 1: Individual functions
    testRuleMatchingFunctions();
    
    // Test 2: Integration with sheets
    testBusinessRulesIntegration();
    
    // Test 3: Full business rules scenarios
    testBusinessRules();
    
    debugLog('\n=== ALL TESTS COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    debugLog(`TEST SUITE ERROR: ${error.message}`);
    debugLog(`Error Stack: ${error.stack}`);
  }
  
  debugLog(`End Time: ${new Date().toISOString()}`);
}

/**
 * Test data validation for BusinessRules sheet
 */
function testBusinessRulesValidation() {
  debugLog('=== Testing Business Rules Validation ===');
  
  try {
    const isValid = validateBusinessRulesSheet();
    debugLog(`BusinessRules sheet validation: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    if (isValid) {
      debugLog('All required columns found in BusinessRules sheet');
    }
    
  } catch (error) {
    debugLog(`Validation test error: ${error.message}`);
  }
  
  debugLog('=== Business Rules Validation Testing Complete ===');
}

/**
 * Performance test for business rules processing
 */
function testBusinessRulesPerformance() {
  debugLog('=== Testing Business Rules Performance ===');
  
  const startTime = new Date().getTime();
  const iterations = 100;
  
  try {
    for (let i = 0; i < iterations; i++) {
      applyBusinessRules(
        `TEST${i}`,
        'Test Vendor',
        'Test Brand',
        'Test Item',
        'POPPAT JAMALS ADYAR',
        Math.floor(Math.random() * 20),
        Math.floor(Math.random() * 10)
      );
    }
    
    const endTime = new Date().getTime();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    
    debugLog(`Processed ${iterations} business rule evaluations in ${totalTime}ms`);
    debugLog(`Average time per evaluation: ${avgTime.toFixed(2)}ms`);
    
  } catch (error) {
    debugLog(`Performance test error: ${error.message}`);
  }
  
  debugLog('=== Business Rules Performance Testing Complete ===');
}