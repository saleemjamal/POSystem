// [_THISROW].[Status] <> "Approved"

const MAIN_SS_ID = '1JgpxObkeY09iqc9Uj978O8cARvwjbxbbJbHbOd0OP1g'

const BINNING_CONFIG = "BinningConfig";

// GRN Constants
const GRN_SHEET_NAME = "GRNTracking";
const PO_AUTO_CLOSE_DAYS = 10; // Days after which POs are auto-closed
const GRN_AUTO_APPROVE_MINUTES = 60; // Minutes after which GRNs are auto-approved
const CO_AUTO_APPROVE_MINUTES = 60; // Minutes after which COs are auto-approved (currently using immediate approval instead)
const CO_AUTO_APPROVE_THRESHOLD = 10000; // CO value threshold for auto-approval (₹10,000)
const GRN_STATUS_MAPPING = {
  SENT: 'Sent',
  PARTIALLY_RECEIVED: 'Partially Received', 
  LATE_FULFILLMENT: 'Late Fulfillment',
  CLOSED_COMPLETE: 'Closed - Complete',
  CLOSED_PARTIAL: 'Closed - Partial',
  CLOSED_NO_RECEIPT: 'Closed - No Receipt'
};

const GRN_APPROVAL_TYPES = {
  MANUAL: 'Manual',
  AUTO: 'Auto'
};

// Customer Order Constants
const CO_APPROVAL_TYPES = {
  MANUAL: 'Manual',
  AUTO: 'Auto'
};

const GM_HIGH_MARGIN = 0.10;
const GM_LOW_MARGIN = -0.10;

const ACTIVE_DAYS_THRESHOLD = 180;
const MONTHS_OF_DATA = 6;

const TOS_THRESHOLD_LOW = 60;
const TOS_THRESHOLD_MED = 90;
const TOS_THRESHOLD_HIGH = 150;

const REV_RANK_A = 0.70;  //Revenue rank A => Top 70% products by revenue
const REV_RANK_B = 0.95;

const VOL_RANK_A = 0.70;  //Volume rank A => Top 70% products by volume
const VOL_RANK_B = 0.90;

const MIN_NEW_ITEM_THRESHOLD_DAYS = 75;

const outletShort = {
        "POPPAT JAMALS ADYAR": "ADY",
        "POPPAT JAMAL & SONS MOUNT ROAD": "MTR",
        "POPPAT JAMAL & SONS  MOUNT ROAD": "MTR",  // Handle extra space
        "POPPAT JAMALS ANNA NAGAR": "ANN",
        "POPPAT JAMALS COIMBATORE": "CBE",
        "POPPAT JAMALS VIJAYAWADA": "VJW",
    };

const PO_EMAIL_TEMPLATE = (distributor, brand, outlet) => `
  <div style="font-family: Arial, sans-serif; color: #222; background: #f7f7f9; padding: 32px 0;">
    <table style="background: #fff; max-width: 520px; margin: 0 auto; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); border-collapse: separate;">
      <tr>
        <td style="padding: 24px 32px 0 32px; text-align: center;">
          <img src="https://i.postimg.cc/jSz8DhBp/PJ-Logo-1-Line-1.jpg" alt="Poppat Jamals Logo" style="height: 48px; margin-bottom: 18px;">
          <h2 style="color: #1976d2; margin-bottom: 10px;">Purchase Order Notification</h2>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 32px 0 32px; font-size: 15px;">
          <p style="margin: 0 0 16px 0;">Dear <b>${distributor}</b>,</p>
          <p style="margin: 0 0 18px 0;">
            Please find attached the <b>Purchase Order</b> for <span style="color:#1976d2;"><b>${brand}</b></span> at <span style="color:#1976d2;"><b>${outlet}</b></span>.
          </p>
          <table style="margin: 18px 0 18px 0; border: 1px solid #e3e3e3; border-radius: 8px; background: #fafbfd; font-size: 15px;">
            <tr>
              <td style="padding: 8px 18px; border-bottom: 1px solid #e3e3e3; font-weight: bold;">Brand</td>
              <td style="padding: 8px 18px; border-bottom: 1px solid #e3e3e3;">${brand}</td>
            </tr>
            <tr>
              <td style="padding: 8px 18px; font-weight: bold;">Outlet</td>
              <td style="padding: 8px 18px;">${outlet}</td>
            </tr>
          </table>
          <p style="margin-bottom: 16px;">You will find the PO attached as a PDF for your records. If you have a regular PO pending from last week or earlier, please considered that Cancelled. This new PO is the only one applicable</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 32px 22px 32px;">
          <div style="border-top:1px solid #e0e0e0; margin:18px 0 16px 0;"></div>
          <p style="color:#1976d2; font-weight:bold; margin:0 0 2px 0;">Regards,</p>
          <p style="margin:0 0 2px 0; font-weight: bold;">Poppat Jamals</p>
          <p style="font-size:12px; color: #777; margin:6px 0 0 0;">This is an automated message. For queries, reply to this email or contact your relationship manager.</p>
        </td>
      </tr>
    </table>
  </div>
`;

// Customer Order Email Template
const CO_EMAIL_TEMPLATE = (distributor, brand, outlet, customerName, coNumber) => `
  <div style="font-family: Arial, sans-serif; color: #222; background: #f7f7f9; padding: 32px 0;">
    <table style="background: #fff; max-width: 520px; margin: 0 auto; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); border-collapse: separate;">
      <tr>
        <td style="padding: 24px 32px 0 32px; text-align: center;">
          <img src="https://i.postimg.cc/jSz8DhBp/PJ-Logo-1-Line-1.jpg" alt="Poppat Jamals Logo" style="height: 48px; margin-bottom: 18px;">
          <h2 style="color: #1976d2; margin-bottom: 10px;">Customer Order Notification</h2>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 32px 0 32px; font-size: 15px;">
          <p style="margin: 0 0 16px 0;">Dear <b>${distributor}</b>,</p>
          <p style="margin: 0 0 18px 0;">
            Please find attached the <b>Customer Order</b> for <span style="color:#1976d2;"><b>${brand}</b></span> at <span style="color:#1976d2;"><b>${outlet}</b></span>.
          </p>
          <table style="margin: 18px 0 18px 0; border: 1px solid #e3e3e3; border-radius: 8px; background: #fafbfd; font-size: 15px;">
            <tr>
              <td style="padding: 8px 18px; border-bottom: 1px solid #e3e3e3; font-weight: bold;">Customer</td>
              <td style="padding: 8px 18px; border-bottom: 1px solid #e3e3e3;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 18px; border-bottom: 1px solid #e3e3e3; font-weight: bold;">CO Number</td>
              <td style="padding: 8px 18px; border-bottom: 1px solid #e3e3e3;">${coNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 18px; border-bottom: 1px solid #e3e3e3; font-weight: bold;">Brand</td>
              <td style="padding: 8px 18px; border-bottom: 1px solid #e3e3e3;">${brand}</td>
            </tr>
            <tr>
              <td style="padding: 8px 18px; font-weight: bold;">Outlet</td>
              <td style="padding: 8px 18px;">${outlet}</td>
            </tr>
          </table>
          <p style="margin-bottom: 16px;">You will find the Customer Order details attached as a PDF for your records.</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 32px 22px 32px;">
          <div style="border-top:1px solid #e0e0e0; margin:18px 0 16px 0;"></div>
          <p style="color:#1976d2; font-weight:bold; margin:0 0 2px 0;">Regards,</p>
          <p style="margin:0 0 2px 0; font-weight: bold;">Poppat Jamals</p>
          <p style="font-size:12px; color: #777; margin:6px 0 0 0;">This is an automated message. For queries, reply to this email or contact your relationship manager.</p>
        </td>
      </tr>
    </table>
  </div>
`;

const wantedColumns=[7,8,10]

 const ccList = [
    'purchasemanager@poppatjamals.com',
    'backoffice@poppatjamals.com',
    'karima@poppatjamals.com'
  ].join(',')

const editors = ["saleem@poppatjamals.com", "karima@poppatjamals.com"];
  

/**  Store-specific e-mail routing  */
const OUTLET_EMAIL_RULES = {
  /* key = exactly the outlet name you pass to sendEmailToDistributor() */

  "POPPAT JAMALS ADYAR": {
    cc : ccList+",adyarstore@poppatjamals.com"
  },

  "POPPAT JAMAL & SONS MOUNT ROAD": {
    cc : ccList+",annasalaistore@poppatjamals.com"
  },

  "POPPAT JAMALS ANNA NAGAR": {
    cc  : ccList+",annanagarstore@poppatjamals.com"
  },

  "POPPAT JAMALS COIMBATORE": {
    cc  : ccList+",cberspuramstore@poppatjamals.com"
  },

  "POPPAT JAMALS VIJAYAWADA": {
    cc  : ccList+",vijayawadastore@poppatjamals.com"
  },

  // …add more outlets as needed…
};

// Customer Order Constants
const CO_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved', 
  SENT: 'Sent',
  RECEIVED: 'Received',
  DELIVERED: 'Delivered'
};

const CO_ITEM_TYPES = {
  EXISTING: 'existing',
  NEW_ITEM: 'new_item'
};
