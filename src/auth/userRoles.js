// userRoles.js
// User role management and access control system

/**
 * User role definitions and permissions
 */
const USER_ROLES = {
  SUPER_USER: {
    emails: ['saleem@poppatjamals.com', 'karima@poppatjamals.com'],
    permissions: ['ALL'],
    description: 'Full system access'
  },
  PURCHASE_MANAGER: {
    emails: ['purchasemanager@poppatjamals.com'],
    permissions: ['CREATE_PO', 'EDIT_PO_ARCHIVE', 'EDIT_VENDOR_DATA'],
    description: 'PO creation and management'
  },
  INVENTORY_MANAGER: {
    emails: ['backoffice@poppatjamals.com'],
    permissions: ['CREATE_GRN', 'EDIT_VENDOR_DATA'],
    description: 'GRN creation and inventory management'
  },
  STORE_MANAGER: {
    emails: ['storemanager@poppatjamals.com'],
    permissions: ['CREATE_CO', 'VIEW_OWN_COS', 'EDIT_CUSTOMER_DATA'],
    description: 'Customer order management'
  }
};

/**
 * Get current user's role based on their email
 * @returns {string} User role or 'NO_ACCESS'
 */
function getCurrentUserRole() {
  const currentUser = Session.getActiveUser().getEmail().toLowerCase();
  
  // Check each role
  for (const [roleName, roleData] of Object.entries(USER_ROLES)) {
    if (roleData.emails.some(email => email.toLowerCase() === currentUser)) {
      debugLog(`User ${currentUser} identified as ${roleName}`);
      return roleName;
    }
  }
  
  debugLog(`User ${currentUser} has no defined role`);
  return 'NO_ACCESS';
}

/**
 * Check if user has specific permission
 * @param {string} userRole - User's role
 * @param {string} requiredPermission - Permission to check
 * @returns {boolean} True if user has permission
 */
function hasPermission(userRole, requiredPermission) {
  if (userRole === 'SUPER_USER') return true;
  if (userRole === 'NO_ACCESS') return false;
  
  const rolePermissions = USER_ROLES[userRole]?.permissions || [];
  return rolePermissions.includes(requiredPermission) || rolePermissions.includes('ALL');
}

/**
 * Validate user permission and show error if denied
 * @param {string} requiredPermission - Permission to check
 * @returns {boolean} True if user has permission
 */
function validateUserPermission(requiredPermission) {
  const userRole = getCurrentUserRole();
  
  if (hasPermission(userRole, requiredPermission)) {
    return true;
  } else {
    const friendlyPermission = getFriendlyPermissionName(requiredPermission);
    const message = `🚫 Access Not Allowed

Sorry! You don't have permission for this action.

🔍 What you tried to do: ${friendlyPermission}
👤 Your current role: ${getFriendlyRoleName(userRole)}

💡 Need access? Contact our administrators:
   📧 saleem@poppatjamals.com
   📧 karima@poppatjamals.com`;

    SpreadsheetApp.getUi().alert('🚫 Access Denied', message, SpreadsheetApp.getUi().ButtonSet.OK);
    return false;
  }
}

/**
 * Get friendly names for permissions
 */
function getFriendlyPermissionName(permission) {
  const friendlyNames = {
    'CREATE_PO': 'Create Purchase Orders',
    'CREATE_GRN': 'Record Goods Receipts',
    'CREATE_CO': 'Create Customer Orders',
    'VIEW_OWN_COS': 'View Own Customer Orders',
    'EDIT_CUSTOMER_DATA': 'Edit Customer Information',
    'EDIT_PO_ARCHIVE': 'Edit Purchase Order Archives',
    'EDIT_VENDOR_DATA': 'Update Vendor Information',
    'SEND_PO': 'Send Purchase Orders',
    'APPROVE_PO': 'Approve Purchase Orders',
    'CLASSIFY_SKU': 'Analyze Products'
  };
  
  return friendlyNames[permission] || permission;
}

/**
 * Get friendly names for roles
 */
function getFriendlyRoleName(role) {
  const friendlyNames = {
    'SUPER_USER': 'System Administrator',
    'PURCHASE_MANAGER': 'Purchase Manager', 
    'INVENTORY_MANAGER': 'Inventory Manager',
    'STORE_MANAGER': 'Store Manager',
    'NO_ACCESS': 'No Access Assigned'
  };
  
  return friendlyNames[role] || role;
}

/**
 * Get user role display information
 * @returns {Object} Role information for current user
 */
function getCurrentUserInfo() {
  const userRole = getCurrentUserRole();
  const currentUser = Session.getActiveUser().getEmail();
  
  return {
    email: currentUser,
    role: userRole,
    description: USER_ROLES[userRole]?.description || 'No access',
    permissions: USER_ROLES[userRole]?.permissions || []
  };
}

/**
 * Check if current user is a super user
 * @returns {boolean} True if super user
 */
function isSuperUser() {
  return getCurrentUserRole() === 'SUPER_USER';
}

/**
 * Get all users for a specific role
 * @param {string} roleName - Role to get users for
 * @returns {Array} Array of email addresses
 */
function getUsersForRole(roleName) {
  return USER_ROLES[roleName]?.emails || [];
}
