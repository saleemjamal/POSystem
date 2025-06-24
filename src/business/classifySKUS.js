function classifySKUs() {
    try {
        debugLog('classifySKUs: START');
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName("SalesData");
        if (!sheet) {
            debugLog('classifySKUs: SalesData sheet not found');
            return;
        }
        const data = sheet.getDataRange().getValues();
        debugLog(`classifySKUs: Read ${data.length - 1} rows from SalesData`);
        const headers = data[0];
        const rows = data.slice(1);

        const idxSKU = headers.indexOf("SKU");
        const idxItemName = headers.indexOf("ItemName");
        const idxSoldQty = headers.indexOf("SoldQty");
        const idxRevenue = headers.indexOf("Revenue");
        const idxGrossMargin = headers.indexOf("GrossMargin");
        const idxCostPrice = headers.indexOf("CostPrice");
        const idxBillDate = headers.indexOf("LastBillDate");
        const idxInwardDate = headers.indexOf("FirstInwardDate");
        const idxCurrentStock = headers.indexOf("CurrentStock");
        const idxBrand = headers.indexOf("Brand");
        const idxOutlet = headers.indexOf("OutletName");

        debugLog('classifySKUs: Indexes - ' + JSON.stringify({idxSKU, idxItemName, idxSoldQty, idxRevenue, idxGrossMargin, idxCostPrice, idxBillDate, idxInwardDate, idxCurrentStock, idxBrand, idxOutlet}));

        const skuStats = {};
        const outletStats = {};
        const brandOutletStats = {};
        //const dynamicCostBins = computeDynamicCostBins(rows, idxCostPrice, idxOutlet);

        let avgCostBins = readBinningConfigSheet();
        if (!avgCostBins) {
          debugLog('classifySKUs: No avgCostBins found, computing new bins');
          avgCostBins = computeAverageCostBins(rows, idxSKU, idxOutlet, idxCostPrice);
          writeBinningConfigSheet(avgCostBins);
        } else {
          debugLog('classifySKUs: avgCostBins loaded');
        }

        debugLog('classifySKUs: Starting row processing');
        rows.forEach(row => {
            const sku = row[idxSKU];
            const itemName = row[idxItemName];
            const qty = row[idxSoldQty];
            const rev = row[idxRevenue];
            const gm = row[idxGrossMargin];
            const cost = row[idxCostPrice];
            const billDate = new Date(row[idxBillDate]);
            const inwardDate = new Date(row[idxInwardDate]);
            const stock = row[idxCurrentStock];
            const brand = row[idxBrand];
            const outlet = row[idxOutlet];

            const skuKey = sku + "||" + outlet;
            const brandOutletKey = brand + "||" + outlet;

            if (!skuStats[skuKey]) {
                skuStats[skuKey] = {
                    outlet, brand, itemName,
                    qty: 0, rev: 0, gm: 0,
                    billSum: 0, inwardSum: 0, billCount: 0,
                    lastSold: billDate,
                    costSum: 0, costCount: 0,
                    stock,
                    firstInwardDate: inwardDate
                };
            }

            const s = skuStats[skuKey];
            s.qty += qty;
            s.rev += rev;
            s.gm += gm;
            s.billSum += billDate.getTime();
            s.inwardSum += inwardDate.getTime();
            s.billCount += 1;
            s.costSum += parseFloat(cost) || 0;
            if (parseFloat(cost) > 0) s.costCount += 1;
            
            if (!brandOutletStats[brandOutletKey]) {
                brandOutletStats[brandOutletKey] = { totalRev: 0, totalQty: 0, skuList: [], volList: [] };
            }
            brandOutletStats[brandOutletKey].totalRev += rev;
            brandOutletStats[brandOutletKey].totalQty += qty;
            brandOutletStats[brandOutletKey].skuList.push({ skuKey, rev });
            brandOutletStats[brandOutletKey].volList.push({ skuKey, qty });

            if (!outletStats[outlet]) {
                outletStats[outlet] = { totalRev: 0, totalGM: 0 };
            }
            outletStats[outlet].totalRev += rev;
            outletStats[outlet].totalGM += gm;
        });
        debugLog('classifySKUs: Finished row processing');

        for (const key in brandOutletStats) {
            const skuList = brandOutletStats[key].skuList.sort((a, b) => b.rev - a.rev);
            let cumulative = 0;
            const totalRev = brandOutletStats[key].totalRev;

            skuList.forEach((entry,idx) => {
                cumulative += entry.rev;
                const share = cumulative / totalRev;
                skuStats[entry.skuKey].revRank = share <= REV_RANK_A ? "A" : share <= REV_RANK_B ? "B" : "C";
                skuStats[entry.skuKey].RevenueRank = idx + 1; // <-- add this line
            });

            const volList = brandOutletStats[key].volList.sort((a, b) => b.qty - a.qty);
            let cumulativeVol = 0;
            const totalQty = brandOutletStats[key].totalQty;

            volList.forEach(entry => {
                cumulativeVol += entry.qty;
                const share = cumulativeVol / totalQty;
                skuStats[entry.skuKey].volRank = share <= VOL_RANK_A ? "Fast" : share <= VOL_RANK_B ? "Medium" : "Slow";
            });
        }
        debugLog('classifySKUs: Finished brandOutletStats loop');
        // YOU MUST CHANGE THIS EVERY MONTH
        const today = new Date();
        const output = [];

        for (const skuKey in skuStats) {
            const s = skuStats[skuKey];
            const sku = skuKey.split("||")[0];
            const avgInward = new Date(s.inwardSum / s.billCount);
            const avgBill = new Date(s.billSum / s.billCount);
            const msToDays = 1000 * 60 * 60 * 24;
            const daysOnShelf = (today - s.firstInwardDate) / msToDays;
            const isNewItem = daysOnShelf < MIN_NEW_ITEM_THRESHOLD_DAYS;
            const tosSold = (avgBill - avgInward) / msToDays;
            const tosIdle = s.stock > 0 ? (today - s.lastSold) / msToDays : 0;
            const avgTOS = (s.qty + s.stock) > 0 ? (tosSold * s.qty + tosIdle * s.stock) / (s.qty + s.stock) : 0;

            const VelocityClass = avgTOS > TOS_THRESHOLD_HIGH ? "Dead" : avgTOS > TOS_THRESHOLD_MED ? "Slow" : avgTOS > TOS_THRESHOLD_LOW ? "Medium" : "Fast"

            const daysSinceLastSold = (today - s.lastSold) / msToDays;
            const ActiveFlag = daysSinceLastSold <= ACTIVE_DAYS_THRESHOLD ? "Active" : "Inactive";

            const RevClass = s.revRank;
            const VolumeClass = s.volRank;
            const avgMargin = outletStats[s.outlet].totalGM / outletStats[s.outlet].totalRev;
            const itemMargin = s.rev > 0 ? s.gm / s.rev : 0;
            const MarginClass = itemMargin >= avgMargin + GM_HIGH_MARGIN
                ? "High"
                : itemMargin <= avgMargin + GM_LOW_MARGIN
                    ? "Low"
                    : "Medium";

            const avgCost = s.costSum / (s.costCount || 1);
            //const outletBin = dynamicCostBins[s.outlet] || [{ max: Infinity, qty: 1 }];
            const outletBins = avgCostBins[s.outlet] || [{ max: Infinity, qty: 1 }];
            const matchedBin = outletBins.find(b => avgCost <= b.max);
            let BinQty = matchedBin ? matchedBin.qty : 1;

            // 02.06.2025 
            // Slightly modifying BinQty to be higher of BinQty or Monthly sales

            const sales_per_month = s.qty / MONTHS_OF_DATA;

            if (avgCost >= 2000) BinQty = s.qty / MONTHS_OF_DATA >= 1 ? 2 : 1;

            const RecommendedQty = Math.max(BinQty, Math.ceil(sales_per_month));

            let SuggestedQty = 0;
            let UsageReco = "";
            let Justification = `Revenue Rank: ${s.RevenueRank}, Margin: ${itemMargin.toFixed(2)}, AvgTOS: ${avgTOS.toFixed(1)}, NewItem:${isNewItem}`;

            if(isNewItem){
              SuggestedQty = RecommendedQty;
              UsageReco = "New-Item"
            }
            else if ((RevClass === "C" && ["Dead","Slow","Medium"].includes(VelocityClass)) || VelocityClass === "Dead" || ActiveFlag === "Inactive") {
                SuggestedQty = 0;
                UsageReco = "Dead";
            }
            else if (RevClass === "A") {
                if (VelocityClass === "Slow") {
                    SuggestedQty = Math.ceil(RecommendedQty / 2);
                    UsageReco = "Watch-List";
                    
                } else {
                    SuggestedQty = RecommendedQty;
                    UsageReco = "Auto-ReOrder";
                }
            }
            else if (RevClass === "B") {
                if (MarginClass === "High" || VelocityClass==="Fast") {
                    SuggestedQty = RecommendedQty;
                    UsageReco = "Auto-ReOrder";
                    
                } else {
                    SuggestedQty = Math.ceil(RecommendedQty / 2);
                    UsageReco = "Watch-List";
                }
            }
            else if (RevClass==="C" && VelocityClass==="Fast"){
              SuggestedQty=RecommendedQty;
              UsageReco="Auto-ReOrder"

            }
            else {
                SuggestedQty = 0;
                UsageReco = "Dead";
            }
             const CurrentStock = s.stock || 0;
            // Calculate recommended order qty (never negative)
            const FinalOrderQty = Math.max(SuggestedQty - CurrentStock, 0);

            output.push([
                s.outlet, s.brand, sku, s.itemName,
                avgCost, RevClass, MarginClass, VelocityClass,BinQty, SuggestedQty, s.stock, FinalOrderQty, UsageReco, Justification
            ]);
        }
        debugLog('classifySKUs: Finished skuStats loop, output length: ' + output.length);

        // Use user-specified header
        const header = [
          'Outlet', 'Brand', 'SKU', 'ItemName', 'AvgCost', 'RevClass', 'MarginClass', 'VelocityClass',
          'BinQty', 'SuggestedQty', 'CS', 'FinalOrderQty', 'UsageReco', 'Justification'
        ];
        // Write to SKUClassification sheet (clear contents, do not delete)
        let skuSheet = ss.getSheetByName('SKUClassification');
        if (!skuSheet) {
          skuSheet = ss.insertSheet('SKUClassification');
        } else {
          skuSheet.clearContents();
        }
        skuSheet.getRange(1, 1, 1, header.length).setValues([header]);
        if (output.length > 0) {
          skuSheet.getRange(2, 1, output.length, header.length).setValues(output);
        }
        debugLog('classifySKUs: Wrote output to SKUClassification with custom header (simple logic)');
        return output;
    } catch (e) {
        debugLog('classifySKUs: ERROR - ' + e.message);
        throw e;
    }
} 