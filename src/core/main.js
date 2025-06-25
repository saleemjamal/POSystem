// main.js
// Entry points, menu setup, and UI triggers for Google Apps Script

/**
 * Adds custom menu to the Google Sheets UI based on user role.
 */
function onOpen() {
  const userRole = getCurrentUserRole();
  const ui = SpreadsheetApp.getUi();
  
  switch(userRole) {
    case 'SUPER_USER':
      createSuperUserMenu(ui);
      break;
    case 'PURCHASE_MANAGER':
      createPurchaseManagerMenu(ui);
      break;
    case 'INVENTORY_MANAGER':
      createInventoryManagerMenu(ui);
      break;
    case 'STORE_MANAGER':
      createStoreManagerMenu(ui);
      break;
    default:
      createNoAccessMenu(ui);
  }
  
  debugLog(`Menu created for user role: ${userRole}`);
}

/**
 * Creates menu for super users (full access)
 */
function createSuperUserMenu(ui) {
  ui.createMenu('📋 Procurement')
    .addItem('🔍 Analyze & Classify Products', 'classifySKUs')
    .addSeparator()
    .addSubMenu(ui.createMenu('📦 Purchase Orders')
      .addItem('🚀 Generate Multiple POs', 'generatePOsFromBatch')
      .addItem('➕ Create Single PO', 'showCreatePODialog')
      .addItem('📧 Send Approved POs', 'sendApprovedPOs'))
    .addSeparator()
    .addSubMenu(ui.createMenu('👥 Customer Orders')
      .addItem('➕ Create Customer Order', 'showCreateCODialog')
      .addItem('📋 Review Customer Orders', 'showCustomerOrdersList')
      .addItem('✅ Approve Orders', 'showApproveOrdersDialog'))
    .addSeparator()
    .addItem('📥 Record Goods Receipt', 'showCreateGRNDialog')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ System Settings')
      .addItem('🔧 Enable Automation', 'setupAllTriggers')
      .addItem('🛑 Disable Automation', 'removeAllTriggers')
      .addItem('🔒 Setup Security', 'setupSheetProtections')
      .addItem('👤 My Access Level', 'showCurrentUserInfo'))
    .addSeparator()
    .addItem('❓ Help & Support', 'showHelpDialog')
    .addToUi();
}

/**
 * Creates menu for purchase managers
 */
function createPurchaseManagerMenu(ui) {
  ui.createMenu('📦 Purchase Orders')
    .addItem('🚀 Generate Multiple POs', 'secureGeneratePOsFromBatch')
    .addItem('➕ Create Single PO', 'secureShowCreatePODialog')
    .addSeparator()
    .addItem('👤 My Access Level', 'showCurrentUserInfo')
    .addItem('❓ Help & Support', 'showHelpDialog')
    .addToUi();
}

/**
 * Creates menu for inventory managers
 */
function createInventoryManagerMenu(ui) {
  ui.createMenu('📥 Inventory')
    .addItem('📝 Record Goods Receipt', 'secureShowCreateGRNDialog')
    .addSeparator()
    .addItem('👤 My Access Level', 'showCurrentUserInfo')
    .addItem('❓ Help & Support', 'showHelpDialog')
    .addToUi();
}

/**
 * Creates menu for store managers
 */
function createStoreManagerMenu(ui) {
  ui.createMenu('👥 Customer Orders')
    .addItem('➕ Create Customer Order', 'secureShowCreateCODialog')
    .addItem('📋 My Orders', 'showMyCustomerOrders')
    .addSeparator()
    .addItem('👤 My Access Level', 'showCurrentUserInfo')
    .addItem('❓ Help & Support', 'showHelpDialog')
    .addToUi();
}

/**
 * Creates menu for users with no access
 */
function createNoAccessMenu(ui) {
  ui.createMenu('🔐 Access Required')
    .addItem('📧 Request System Access', 'showAccessRequestDialog')
    .addItem('📞 Contact Administrator', 'showContactAdminDialog')
    .addToUi();
}

/**
 * Secure wrapper for generatePOsFromBatch
 */
function secureGeneratePOsFromBatch() {
  if (validateUserPermission('CREATE_PO')) {
    generatePOsFromBatch();
  }
}

/**
 * Secure wrapper for showCreatePODialog
 */
function secureShowCreatePODialog() {
  if (validateUserPermission('CREATE_PO')) {
    showCreatePODialog();
  }
}

/**
 * Secure wrapper for showCreateGRNDialog
 */
function secureShowCreateGRNDialog() {
  if (validateUserPermission('CREATE_GRN')) {
    showCreateGRNDialog();
  }
}

/**
 * Shows the Create GRN dialog/sidebar.
 */
function showCreateGRNDialog() {
  const html = HtmlService.createHtmlOutputFromFile('ui/createGRNForm.html')
    .setTitle('📥 Record Goods Receipt')
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
    
    // Handle CO approval
    if (e.source.getActiveSheet().getName() === 'CustomerOrders') {
      handleCOApproval(e);
    }
    
    // Add other onEdit handlers here as needed
    
  } catch (error) {
    debugLog(`OnEdit error: ${error.message}`);
  }
}

/**
 * Shows current user information and access level
 */
function showCurrentUserInfo() {
  const userInfo = getCurrentUserInfo();
  const ui = SpreadsheetApp.getUi();
  
  let roleDescription = '';
  switch(userInfo.role) {
    case 'SUPER_USER':
      roleDescription = 'System Administrator - Full access to all features';
      break;
    case 'PURCHASE_MANAGER':
      roleDescription = 'Purchase Manager - Can create and manage purchase orders';
      break;
    case 'INVENTORY_MANAGER':
      roleDescription = 'Inventory Manager - Can record goods receipts and manage inventory';
      break;
    default:
      roleDescription = 'No access - Please contact administrator';
  }
  
  const message = `👤 Your Access Information

📧 Email: ${userInfo.email}
🏷️ Role: ${userInfo.role.replace('_', ' ')}
📝 Description: ${roleDescription}

✅ What you can do:
${userInfo.permissions.map(p => `   • ${friendlyPermissionName(p)}`).join('\n')}`;

  ui.alert('Your Access Level', message, ui.ButtonSet.OK);
}

/**
 * Convert permission codes to friendly names
 */
function friendlyPermissionName(permission) {
  const friendlyNames = {
    'ALL': 'Everything (Administrator)',
    'CREATE_PO': 'Create and manage purchase orders',
    'EDIT_PO_ARCHIVE': 'Edit purchase order archives',
    'CREATE_GRN': 'Record goods receipts',
    'EDIT_VENDOR_DATA': 'Update vendor and distributor information'
  };
  
  return friendlyNames[permission] || permission;
}

/**
 * Shows access request dialog for unauthorized users
 */
function showAccessRequestDialog() {
  const ui = SpreadsheetApp.getUi();
  const currentUser = Session.getActiveUser().getEmail();
  
  const message = `🔐 System Access Required

Hi! You need permission to use this system.

📧 Your email: ${currentUser}

To request access, please contact our administrators:
   👤 Saleem: saleem@poppatjamals.com
   👤 Karima: karima@poppatjamals.com

📝 In your request, please mention:
   • Your name and department
   • What access level you need:
     - Purchase Manager (create purchase orders)
     - Inventory Manager (record goods receipts)
   • Brief reason for access

We'll get you set up quickly! 🚀`;

  ui.alert('🔐 Access Request', message, ui.ButtonSet.OK);
}

/**
 * Shows admin contact information
 */
function showContactAdminDialog() {
  const ui = SpreadsheetApp.getUi();
  
  const message = `📞 Administrator Contact

Need help or have questions? Contact our system administrators:

👤 Saleem
   📧 saleem@poppatjamals.com
   🔧 System setup and technical issues

👤 Karima  
   📧 karima@poppatjamals.com
   🔧 User access and business processes

💡 Common reasons to contact admin:
   • Request system access
   • Report technical problems
   • Ask about new features
   • Training and support

We're here to help! 😊`;

  ui.alert('📞 Contact Information', message, ui.ButtonSet.OK);
}

/**
 * Shows the Create PO dialog/sidebar.
 */
function showCreatePODialog() {
  const html = HtmlService.createHtmlOutputFromFile('ui/createPOForm.html')
    .setTitle('➕ Create New Purchase Order')
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
 * Opens the role-specific help dialog.
 */
function showHelpDialog() {
  const userRole = getCurrentUserRole();
  let htmlFile = 'helpContent.html'; // Default/general help
  let title = 'System Help';
  
  // Show role-specific help
  switch(userRole) {
    case 'PURCHASE_MANAGER':
      htmlFile = 'ui/purchaseManagerHelp.html';
      title = '📦 Purchase Manager Help';
      break;
    case 'INVENTORY_MANAGER':
      htmlFile = 'ui/inventoryManagerHelp.html';
      title = '📥 Inventory Manager Help';
      break;
    case 'STORE_MANAGER':
      htmlFile = 'ui/storeManagerHelp.html';
      title = '👥 Store Manager Help';
      break;
    case 'SUPER_USER':
      htmlFile = 'ui/superUserHelp.html';
      title = '📋 System Administrator Help';
      break;
    default:
      htmlFile = 'ui/helpContent.html';
      title = '❓ System Help';
  }
  
  const html = HtmlService.createHtmlOutputFromFile(htmlFile)
    .setWidth(950)
    .setHeight(750);
  SpreadsheetApp.getUi().showModalDialog(html, title);
}

/**
 * Secure wrapper for showCreateCODialog
 */
function secureShowCreateCODialog() {
  if (validateUserPermission('CREATE_CO')) {
    showCreateCODialog();
  }
}

/**
 * Shows the Create Customer Order dialog/sidebar
 */
function showCreateCODialog() {
  const html = HtmlService.createHtmlOutputFromFile('ui/createCOForm.html')
    .setTitle('➕ Create Customer Order')
    .setWidth(600);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Shows Customer Orders list (for admins)
 */
function showCustomerOrdersList() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('Customer Orders', 'Please check the CustomerOrders sheet to review all orders.', ui.ButtonSet.OK);
}

/**
 * Shows approve orders dialog (placeholder for now)
 */
function showApproveOrdersDialog() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('Approve Orders', 'Order approval functionality coming soon. For now, manually update Status in CustomerOrders sheet.', ui.ButtonSet.OK);
}

/**
 * Shows store manager's own orders (filtered view)
 */
function showMyCustomerOrders() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('My Orders', 'Please check the CustomerOrders sheet to view your orders.', ui.ButtonSet.OK);
}

