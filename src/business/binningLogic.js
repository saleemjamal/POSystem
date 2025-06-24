function writeBinningConfigSheet(binConfig) {
    // binConfig: { outlet: [{ max, qty }, ...], ... }
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Remove if exists, then add
    const old = ss.getSheetByName(BINNING_CONFIG);
    if (old) ss.deleteSheet(old);
    const sheet = ss.insertSheet(BINNING_CONFIG);

    // Write headers
    sheet.appendRow(["Outlet", "BinIndex", "MaxAvgCost", "PackQty"]);

    // Write rows
    Object.keys(binConfig).forEach(outlet => {
        binConfig[outlet].forEach((bin, idx) => {
            sheet.appendRow([outlet, idx + 1, bin.max, bin.qty]);
        });
    });
}

function readBinningConfigSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(BINNING_CONFIG);
    if (!sheet) return null;

    const rows = sheet.getDataRange().getValues();
    const header = rows[0];
    const idxOutlet = header.indexOf("Outlet");
    const idxBinIdx = header.indexOf("BinIndex");
    const idxMax = header.indexOf("MaxAvgCost");
    const idxQty = header.indexOf("PackQty");

    const config = {};
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const outlet = r[idxOutlet];
        const bin = {
            max: Number(r[idxMax]),
            qty: Number(r[idxQty])
        };
        if (!config[outlet]) config[outlet] = [];
        config[outlet][Number(r[idxBinIdx]) - 1] = bin;
    }
    return config;
}


/**
 * Build 5 average-cost bins per outlet based on SKU average cost quantiles.
 * Each bin holds ~20% of SKUs by their average cost, with pack sizes [12,6,4,3,1].
 *
 * @param {Array<Array<any>>} rows         – raw sheet data
 * @param {number}            idxSKU       – index of SKU column
 * @param {number}            idxOutlet    – index of OutletName column
 * @param {number}            idxCostPrice – index of CostPrice column
 * @returns {Object<string, Array<{ max: number, qty: number }>>}
 */
function computeAverageCostBins(rows, idxSKU, idxOutlet, idxCostPrice) {
    var outletSkuMap = {};
    // 1) Aggregate sum/count per SKU|outlet
    for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var outlet = r[idxOutlet];
        var sku = r[idxSKU];
        var cost = parseFloat(r[idxCostPrice]);
        if (isNaN(cost)) continue;
        var key = outlet + "||" + sku;
        if (!outletSkuMap[key]) {
            outletSkuMap[key] = { outlet: outlet, costSum: 0, costCount: 0 };
        }
        outletSkuMap[key].costSum += cost;
        outletSkuMap[key].costCount += 1;
    }

    // 2) Build per-outlet arrays of SKU average costs
    var byOutlet = {};
    Object.keys(outletSkuMap).forEach(function (key) {
        var e = outletSkuMap[key];
        var avg = e.costSum / e.costCount;
        if (!byOutlet[e.outlet]) byOutlet[e.outlet] = [];
        byOutlet[e.outlet].push(avg);
    });

    // 3) For each outlet, sort its avg-costs and pick quantile cut-points
    var dynamicBins = {};
    Object.keys(byOutlet).forEach(function (outlet) {
        var arr = byOutlet[outlet].sort(function (a, b) { return a - b; });
        var n = arr.length;
        function q(p) { return arr[Math.floor(p * n)] || arr[n - 1]; }
        dynamicBins[outlet] = [
            { max: q(0.20), qty: 12 },
            { max: q(0.40), qty: 6 },
            { max: q(0.60), qty: 4 },
            { max: q(0.80), qty: 3 },
            { max: q(0.95), qty: 2 },
            { max: Infinity, qty: 1 }
        ];
    });

    return dynamicBins;
}
