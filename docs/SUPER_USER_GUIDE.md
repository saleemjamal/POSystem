# 📋 Super User Guide

## Welcome to System Administration! 🎉

You have complete control over the procurement system. Here's everything you need to manage and oversee the entire process:

---

## 🎯 Your Responsibilities

✅ **System Administration** - Configure security, automation, and settings  
✅ **Process Oversight** - Approve POs, monitor performance, resolve issues  
✅ **User Management** - Control access, train users, provide support  
✅ **Data Analysis** - Run SKU classification, generate insights, optimize operations  

---

## 🔄 Complete Workflow Management

### **Phase 1: Product Analysis**
1. **📋 Procurement → 🔍 Analyze & Classify Products**
2. Review SKU performance and recommendations
3. Adjust classification parameters if needed

### **Phase 2: Purchase Order Creation**
1. **📦 Purchase Orders → 🚀 Generate Multiple POs** (or let Purchase Manager do this)
2. Review generated POs in POTracking sheet
3. **Approve POs**: Check "Approved" checkbox and change Status to "Approved"

### **Phase 3: Send to Distributors**
1. **📦 Purchase Orders → 📧 Send Approved POs**
2. System emails POs to distributors automatically
3. Monitor POTracking sheet for status updates

### **Phase 4: Monitor Receipts**
1. **📥 Record Goods Receipt** when you receive goods (or let Inventory Manager do this)
2. Review GRNTracking sheet for receipt patterns
3. Monitor fulfillment percentages in POTracking

### **Phase 5: System Oversight**
1. Review automation logs weekly
2. Check user access and permissions
3. Monitor performance metrics and KPIs

---

## ⚙️ System Administration

### **One-Time Setup (Run These Once):**

**Enable Complete Automation:**
- **⚙️ System Settings → 🔧 Enable Automation**
- Sets up hourly GRN approval and weekly PO closure

**Secure the System:**
- **⚙️ System Settings → 🔒 Setup Security**
- Applies role-based protection to all sheets

**Check Your Setup:**
- **⚙️ System Settings → 👤 My Access Level**
- Verify you have Super User permissions

### **Ongoing Management:**

**Monitor Automation:**
- Check DebugLog sheet for any errors
- Review execution logs in Apps Script

**Manage Users:**
- Add/remove users by updating userRoles.js
- Grant temporary access when needed

**System Maintenance:**
- **🛑 Disable Automation** during updates
- **🔧 Enable Automation** after maintenance

---

## 📊 Data Analysis & Insights

### **SKU Classification**
**Run Monthly:** **🔍 Analyze & Classify Products**

**What It Does:**
- Analyzes sales performance for all products
- Categorizes by revenue rank (A/B/C)
- Calculates velocity (Fast/Medium/Slow)
- Recommends order quantities

**Key Metrics:**
- **Revenue Rank A**: Top 70% revenue performers
- **Volume Rank A**: Top 70% volume performers  
- **Auto-ReOrder**: High-performing SKUs
- **Dead**: Poor performers to discontinue

### **Performance Monitoring**
**Check Weekly:**
- **Fulfillment rates** by distributor
- **Time to fulfill** for each PO
- **Partial vs complete** deliveries
- **Late fulfillment** trends

---

## 👥 User Management

### **Current User Roles:**

**Super Users (You):**
- saleem@poppatjamals.com
- karima@poppatjamals.com
- Full system access

**Purchase Manager:**
- purchasemanager@poppatjamals.com
- Create and edit POs only

**Inventory Manager:**
- backoffice@poppatjamals.com  
- Record GRNs only

### **Adding New Users:**
1. Edit `userRoles.js` file in Apps Script
2. Add email to appropriate role
3. Re-run **🔒 Setup Security** to apply changes

### **Granting Temporary Access:**
Use `grantTemporaryAccess(email, sheetName, hours)` function for special cases

---

## 🚨 Troubleshooting

### **Common Issues & Solutions**

**"No eligible POs for GRN"**
- Check PO status is "Sent", "Partially Received", or "Late Fulfillment"
- Verify PO exists in POTracking sheet

**"Automation not working"**
- Check: **⚙️ System Settings → 🔧 Enable Automation**
- Verify triggers in Apps Script console

**"User can't access features"**
- Check user role in userRoles.js
- Verify sheet protection is set up correctly
- Re-run **🔒 Setup Security** if needed

**"Email sending failed"**
- Check distributor email addresses in Vendor_Details
- Verify email quotas aren't exceeded
- Check OUTLET_EMAIL_RULES in constants.js

### **Emergency Procedures**
```javascript
// Remove all protections (emergency access)
removeAllSheetProtections()

// Disable automation (during maintenance)
removeAllTriggers()

// Manual fulfillment calculation
updatePOFulfillmentMetrics(poNumber)

// Manual PO closure
closeOldPOs()
```

---

## 📈 Key Performance Indicators

### **Monitor These Metrics:**

**Procurement Efficiency:**
- Time from SKU classification to PO creation
- PO approval time (should be < 24 hours)
- Email delivery success rate

**Supplier Performance:**
- Average fulfillment percentage by distributor
- Time from PO sent to first delivery
- Partial delivery frequency

**System Health:**
- Automation execution success rate
- User activity and adoption
- Error rates and resolution time

**Business Impact:**
- SKU performance trends
- Inventory turnover improvements
- Cost savings from better purchasing

---

## 🔧 System Configuration

### **Key Settings to Review:**

**Timing Parameters:**
- `PO_AUTO_CLOSE_DAYS = 10` - When to auto-close POs
- `GRN_AUTO_APPROVE_MINUTES = 60` - GRN auto-approval delay
- `ACTIVE_DAYS_THRESHOLD = 180` - SKU activity window

**Classification Thresholds:**
- `REV_RANK_A = 0.70` - Top revenue performers (70%)
- `VOL_RANK_A = 0.70` - Top volume performers (70%)
- `TOS_THRESHOLD_HIGH = 150` - Dead stock threshold

**Email Settings:**
- Update `ccList` for default CC recipients
- Modify `OUTLET_EMAIL_RULES` for store-specific routing

### **Advanced Configuration:**
Edit `constants.js` in Apps Script to adjust any business rules or thresholds

---

## 📋 Weekly Checklist

### **Monday (PO Day):**
- [ ] Review weekend automation logs
- [ ] Check any pending PO approvals
- [ ] Send approved POs to distributors
- [ ] Monitor for any delivery issues

### **Wednesday (Mid-week Check):**
- [ ] Review GRN activity and patterns
- [ ] Check fulfillment percentages
- [ ] Address any user access requests

### **Friday (Week Wrap-up):**
- [ ] Review week's performance metrics
- [ ] Update vendor information if needed
- [ ] Plan for next week's SKU classification

### **Monthly Tasks:**
- [ ] Run SKU classification and analysis
- [ ] Review and adjust classification parameters
- [ ] Audit user roles and permissions
- [ ] Archive old data and clean up sheets

---

## 💡 Pro Tips for System Management

### **Performance Optimization:**
✅ **Run SKU classification monthly** - Keep recommendations current  
✅ **Monitor automation daily** - Catch issues early  
✅ **Review metrics weekly** - Identify trends and problems  
✅ **Update vendor data regularly** - Ensure smooth communication  

### **User Support:**
✅ **Respond quickly** to access requests  
✅ **Provide training** for new users  
✅ **Monitor usage patterns** - Identify training needs  
✅ **Keep documentation current** - Update guides as processes evolve  

### **System Reliability:**
✅ **Regular backups** - Export data periodically  
✅ **Test after changes** - Verify system works after updates  
✅ **Document customizations** - Keep track of configuration changes  
✅ **Plan for growth** - Monitor system limits and performance  

---

## 🆘 Emergency Contacts & Resources

### **For System Issues:**
- **Apps Script Console**: Check execution logs and errors
- **DebugLog Sheet**: Review system error messages
- **Google Workspace Status**: Check for service outages

### **For Business Issues:**
- **Process Documentation**: PROCESS_FLOW.md for complete workflows
- **Technical Documentation**: README.md for system details
- **User Guides**: Role-specific guides for training

### **Escalation Path:**
1. **First**: Check DebugLog and execution logs
2. **Second**: Review system status and triggers
3. **Third**: Use emergency procedures to bypass issues
4. **Last Resort**: Disable automation and operate manually

---

## 🌟 Your Impact as Super User

**System Reliability:**
- Your oversight ensures 99.9% uptime
- Quick issue resolution keeps operations smooth
- Proactive monitoring prevents problems

**Business Efficiency:**
- Streamlined procurement saves time and money
- Data-driven decisions improve inventory management
- Automated workflows free up staff for higher-value work

**Team Enablement:**
- Proper access control keeps data secure
- User training maximizes system adoption
- Clear processes reduce confusion and errors

**Strategic Value:**
- Performance metrics guide business decisions
- Trend analysis identifies opportunities
- System scalability supports business growth

---

*Remember: You're not just managing a system - you're enabling efficient, data-driven procurement that directly impacts our business success! 🚀*

---

## 📖 Additional Resources

- **Technical Details**: README.md
- **Complete Process Flow**: PROCESS_FLOW.md
- **Purchase Manager Guide**: PURCHASE_MANAGER_GUIDE.md
- **Inventory Manager Guide**: INVENTORY_MANAGER_GUIDE.md
- **Test Functions**: Use test suites to validate system health
