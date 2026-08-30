import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const repoRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(repoRoot, "..", "..");
const outputDir = path.join(workspaceRoot, "outputs", "fmcg-control-tower");

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

const master = parseCsv(await fs.readFile(path.join(repoRoot, "data", "sku_master.csv"), "utf8"));
const demand = parseCsv(await fs.readFile(path.join(repoRoot, "data", "monthly_demand.csv"), "utf8"));
const summary = JSON.parse(await fs.readFile(path.join(repoRoot, "outputs", "summary.json"), "utf8"));

const months = [...new Set(demand.map((row) => row.month))].sort();
const demandBySku = new Map();
for (const row of demand) {
  if (!demandBySku.has(row.sku_id)) demandBySku.set(row.sku_id, new Map());
  demandBySku.get(row.sku_id).set(row.month, Number(row.demand_units));
}

const workbook = Workbook.create();
const dashboard = workbook.worksheets.add("Control Tower");
const policy = workbook.worksheets.add("SKU Policy");
const matrix = workbook.worksheets.add("ABC-XYZ Matrix");
const history = workbook.worksheets.add("Demand History");
const parameters = workbook.worksheets.add("Parameters");
const notes = workbook.worksheets.add("Data Notes");

const navy = "#172A3A";
const green = "#0F766E";
const lime = "#A3E635";
const orange = "#F59E0B";
const red = "#DC2626";
const paleGreen = "#E8F5F2";
const paleOrange = "#FFF4DD";
const paleRed = "#FDECEC";
const paleGray = "#F3F5F6";
const ink = "#172033";
const muted = "#62707C";
const line = "#D8E0E5";
const white = "#FFFFFF";

function title(sheet, range, text) {
  sheet.mergeCells(range);
  sheet.getRange(range.split(":")[0]).values = [[text]];
  sheet.getRange(range).format = { fill: navy, font: { bold: true, color: white, size: 18 }, verticalAlignment: "center" };
}

function header(range, fill = green) {
  range.format = { fill, font: { bold: true, color: white }, borders: { preset: "outside", style: "thin", color: fill }, verticalAlignment: "center" };
}

function section(range, text) {
  range.merge();
  range.values = [[text]];
  range.format = { fill: navy, font: { bold: true, color: white }, verticalAlignment: "center" };
}

// Parameters
parameters.showGridLines = false;
title(parameters, "A1:F2", "Inventory policy parameters");
parameters.getRange("A4:C4").values = [["Parameter", "Value", "Why it is visible"]];
header(parameters.getRange("A4:C4"));
parameters.getRange("A5:C15").values = [
  ["ABC A cumulative threshold", 0.80, "High-value items"],
  ["ABC B cumulative threshold", 0.95, "Middle-value items"],
  ["", null, ""],
  ["XYZ X CV threshold", 0.50, "Stable monthly demand"],
  ["XYZ Y CV threshold", 1.00, "Moderate variability"],
  ["", null, ""],
  ["A service factor", 2.05, "Approximately 98% cycle-service factor"],
  ["B service factor", 1.65, "Approximately 95% cycle-service factor"],
  ["C service factor", 1.28, "Approximately 90% cycle-service factor"],
  ["Annual holding rate", 0.24, "Editable carrying-cost assumption"],
  ["Days per planning month", 30, "Converts lead time to months"],
];
parameters.getRange("B5:B6").format.numberFormat = "0%";
parameters.getRange("B8:B9").format.numberFormat = "0.00";
parameters.getRange("B11:B13").format.numberFormat = "0.00";
parameters.getRange("B14").format.numberFormat = "0%";
parameters.getRange("A5:A15").format = { fill: paleGreen, font: { bold: true, color: ink } };
parameters.getRange("A4:C15").format.borders = { preset: "inside", style: "thin", color: line };
parameters.getRange("A:A").format.columnWidth = 30;
parameters.getRange("B:B").format.columnWidth = 14;
parameters.getRange("C:C").format.columnWidth = 46;
parameters.getRange("C5:C15").format.wrapText = true;

// Demand history
history.showGridLines = false;
title(history, "A1:Y2", "Monthly demand history | 24 months | synthetic units");
const historyHeaders = ["SKU ID", ...months];
history.getRange("A4:Y4").values = [historyHeaders];
header(history.getRange("A4:Y4"));
const historyRows = master.map((row) => [row.sku_id, ...months.map((month) => demandBySku.get(row.sku_id).get(month))]);
history.getRange(`A5:Y${historyRows.length + 4}`).values = historyRows;
history.getRange(`B5:Y${historyRows.length + 4}`).format.numberFormat = "#,##0";
history.tables.add(`A4:Y${historyRows.length + 4}`, true, "DemandHistoryTable").style = "TableStyleMedium4";
history.freezePanes.freezeRows(4);
history.freezePanes.freezeColumns(1);
history.getRange("A:A").format.columnWidth = 13;
history.getRange("B:Y").format.columnWidth = 12;

// SKU policy
policy.showGridLines = false;
title(policy, "A1:AA2", "SKU replenishment policy | formulas update from demand and parameters");
const policyHeaders = [
  "SKU ID", "Product", "Category", "Unit Cost INR", "Lead Time Days", "Order Cost INR",
  "Annual Demand", "Avg Monthly", "Std Dev", "CV", "Annual Value INR", "Value Share",
  "Cumulative Share", "ABC", "XYZ", "Service Factor", "Safety Stock", "Reorder Point", "EOQ",
  "Current Stock", "On Order", "Inventory Position", "Recommended Order", "Risk Status",
  "Excess Units", "Potential Release INR", "Inventory Value INR",
];
policy.getRange("A4:AA4").values = [policyHeaders];
header(policy.getRange("A4:AA4"));
const baseRows = master.map((row) => [
  row.sku_id, row.product_name, row.category, Number(row.unit_cost_inr), Number(row.lead_time_days),
  Number(row.order_cost_inr), null, null, null, null, null, null, null, null, null, null, null, null,
  null, Number(row.current_stock_units), Number(row.on_order_units), null, null, null, null, null, null,
]);
policy.getRange(`A5:AA${baseRows.length + 4}`).values = baseRows;
for (let row = 5; row <= baseRows.length + 4; row += 1) {
  const demandRow = row;
  policy.getRange(`G${row}`).formulas = [[`=SUM('Demand History'!N${demandRow}:Y${demandRow})`]];
  policy.getRange(`H${row}`).formulas = [[`=AVERAGE('Demand History'!N${demandRow}:Y${demandRow})`]];
  policy.getRange(`I${row}`).formulas = [[`=STDEV.S('Demand History'!N${demandRow}:Y${demandRow})`]];
  policy.getRange(`J${row}`).formulas = [[`=IF(H${row}=0,0,I${row}/H${row})`]];
  policy.getRange(`K${row}`).formulas = [[`=G${row}*D${row}`]];
  policy.getRange(`L${row}`).formulas = [[`=K${row}/SUM($K$5:$K$40)`]];
  policy.getRange(`M${row}`).formulas = [[`=SUM($L$5:L${row})`]];
  policy.getRange(`N${row}`).formulas = [[`=IF(M${row}<='Parameters'!$B$5,"A",IF(M${row}<='Parameters'!$B$6,"B","C"))`]];
  policy.getRange(`O${row}`).formulas = [[`=IF(J${row}<='Parameters'!$B$8,"X",IF(J${row}<='Parameters'!$B$9,"Y","Z"))`]];
  policy.getRange(`P${row}`).formulas = [[`=IF(N${row}="A",'Parameters'!$B$11,IF(N${row}="B",'Parameters'!$B$12,'Parameters'!$B$13))`]];
  policy.getRange(`Q${row}`).formulas = [[`=ROUNDUP(P${row}*I${row}*SQRT(E${row}/'Parameters'!$B$15),0)`]];
  policy.getRange(`R${row}`).formulas = [[`=ROUNDUP(H${row}*(E${row}/'Parameters'!$B$15)+Q${row},0)`]];
  policy.getRange(`S${row}`).formulas = [[`=ROUNDUP(SQRT((2*G${row}*F${row})/(D${row}*'Parameters'!$B$14)),0)`]];
  policy.getRange(`V${row}`).formulas = [[`=T${row}+U${row}`]];
  policy.getRange(`W${row}`).formulas = [[`=IF(V${row}<=R${row},MAX(0,ROUNDUP(R${row}+S${row}-V${row},0)),0)`]];
  policy.getRange(`X${row}`).formulas = [[`=IF(T${row}<H${row}*(E${row}/'Parameters'!$B$15),"Stockout risk",IF(V${row}<=R${row},"Reorder now",IF(V${row}<=R${row}*1.25,"Monitor","Healthy")))`]];
  policy.getRange(`Y${row}`).formulas = [[`=MAX(0,ROUNDDOWN(T${row}-(Q${row}+S${row}),0))`]];
  policy.getRange(`Z${row}`).formulas = [[`=Y${row}*D${row}`]];
  policy.getRange(`AA${row}`).formulas = [[`=T${row}*D${row}`]];
}
policy.getRange("D5:D40").format.numberFormat = '"INR "#,##0.00';
policy.getRange("F5:F40").format.numberFormat = '"INR "#,##0';
policy.getRange("G5:I40").format.numberFormat = "#,##0.0";
policy.getRange("J5:M40").format.numberFormat = "0.0%";
policy.getRange("P5:P40").format.numberFormat = "0.00";
policy.getRange("Q5:W40").format.numberFormat = "#,##0";
policy.getRange("Y5:Y40").format.numberFormat = "#,##0";
policy.getRange("Z5:AA40").format.numberFormat = '"INR "#,##0';
policy.tables.add("A4:AA40", true, "SkuPolicyTable").style = "TableStyleMedium4";
policy.freezePanes.freezeRows(4);
policy.freezePanes.freezeColumns(3);
policy.getRange("A:A").format.columnWidth = 12;
policy.getRange("B:B").format.columnWidth = 28;
policy.getRange("C:C").format.columnWidth = 16;
policy.getRange("D:W").format.columnWidth = 14;
policy.getRange("X:X").format.columnWidth = 18;
policy.getRange("Y:AA").format.columnWidth = 18;
policy.getRange("X5:X40").conditionalFormats.add("containsText", { text: "Stockout risk", format: { fill: paleRed, font: { bold: true, color: red } } });
policy.getRange("X5:X40").conditionalFormats.add("containsText", { text: "Reorder now", format: { fill: paleOrange, font: { bold: true, color: "#9A5A00" } } });
policy.getRange("X5:X40").conditionalFormats.add("containsText", { text: "Healthy", format: { fill: paleGreen, font: { color: green } } });

// ABC-XYZ matrix
matrix.showGridLines = false;
title(matrix, "A1:J2", "ABC-XYZ policy matrix");
matrix.getRange("A4:D4").values = [["Class", "X: stable", "Y: variable", "Z: volatile"]];
header(matrix.getRange("A4:D4"));
matrix.getRange("A5:A7").values = [["A: high value"], ["B: medium value"], ["C: lower value"]];
for (let r = 5; r <= 7; r += 1) {
  for (let c = 2; c <= 4; c += 1) {
    const abc = ["A", "B", "C"][r - 5];
    const xyz = ["X", "Y", "Z"][c - 2];
    matrix.getCell(r - 1, c - 1).formulas = [[`=COUNTIFS('SKU Policy'!$N$5:$N$40,"${abc}",'SKU Policy'!$O$5:$O$40,"${xyz}")`]];
  }
}
matrix.getRange("B5:D7").format = { fill: paleGreen, font: { bold: true, color: ink, size: 16 }, horizontalAlignment: "center", verticalAlignment: "center", numberFormat: "0" };
matrix.getRange("A5:A7").format = { fill: navy, font: { bold: true, color: white }, verticalAlignment: "center" };
matrix.getRange("A4:D7").format.borders = { preset: "all", style: "thin", color: line };
matrix.getRange("A:A").format.columnWidth = 22;
matrix.getRange("B:D").format.columnWidth = 18;
matrix.getRange("5:7").format.rowHeight = 44;
section(matrix.getRange("F4:J4"), "Operating policy by cell");
matrix.getRange("F5:J12").values = [
  ["AX", "Frequent review", "High service", "Tight forecast", "Protect availability"],
  ["AY", "Weekly exception", "High service", "Planner review", "Watch variability"],
  ["AZ", "Event-led", "High service", "Manual judgement", "Avoid normal-only logic"],
  ["BX", "Standard cycle", "Medium service", "Automate", "Review monthly"],
  ["BY", "Exception cycle", "Medium service", "Watch forecast", "Review monthly"],
  ["BZ", "Selective stock", "Medium service", "Manual review", "Limit exposure"],
  ["CX", "Light-touch", "Lower service", "Longer cycle", "Bundle orders"],
  ["CY/CZ", "Case by case", "Lower service", "Intermittent check", "Avoid excess"],
];
matrix.getRange("F5:J12").format = { borders: { preset: "inside", style: "thin", color: line }, wrapText: true, verticalAlignment: "center" };
matrix.getRange("F:F").format = { fill: paleGreen, font: { bold: true, color: green }, columnWidth: 12 };
matrix.getRange("G:J").format.columnWidth = 19;

// Control Tower
dashboard.showGridLines = false;
title(dashboard, "A1:L2", "FMCG Demand and Inventory Control Tower");
dashboard.mergeCells("A3:L3");
dashboard.getRange("A3").values = [["Synthetic 36-SKU model | Formula-driven Excel analysis | Python and SQL reconciliation"]];
dashboard.getRange("A3:L3").format = { fill: paleGray, font: { italic: true, color: muted }, verticalAlignment: "center" };
const cards = [
  ["A5:B7", "Inventory value", "=SUM('SKU Policy'!AA5:AA40)", '"INR "#,##0'],
  ["C5:D7", "Order queue", '=COUNTIF(\'SKU Policy\'!X5:X40,"Stockout risk")+COUNTIF(\'SKU Policy\'!X5:X40,"Reorder now")', "0"],
  ["E5:F7", "Stockout risk", '=COUNTIF(\'SKU Policy\'!X5:X40,"Stockout risk")', "0"],
  ["G5:H7", "Recommended units", "=SUM('SKU Policy'!W5:W40)", "#,##0"],
  ["I5:J7", "Potential release", "=SUM('SKU Policy'!Z5:Z40)", '"INR "#,##0'],
  ["K5:L7", "A-class SKUs", '=COUNTIF(\'SKU Policy\'!N5:N40,"A")', "0"],
];
for (const [range, label, formula, numberFormat] of cards) {
  const [start, end] = range.split(":");
  const left = start.match(/[A-Z]+/)[0];
  const right = end.match(/[A-Z]+/)[0];
  dashboard.mergeCells(`${left}5:${right}5`);
  dashboard.mergeCells(`${left}6:${right}7`);
  dashboard.getRange(`${left}5`).values = [[label]];
  dashboard.getRange(`${left}6`).formulas = [[formula]];
  dashboard.getRange(range).format = { fill: paleGreen, borders: { preset: "outside", style: "thin", color: green } };
  dashboard.getRange(`${left}5:${right}5`).format = { fill: green, font: { bold: true, color: white }, horizontalAlignment: "center" };
  dashboard.getRange(`${left}6:${right}7`).format = { font: { bold: true, color: ink, size: 16 }, horizontalAlignment: "center", verticalAlignment: "center", numberFormat };
}
section(dashboard.getRange("A9:L9"), "Operating call");
dashboard.getRange("A10:D13").merge();
dashboard.getRange("E10:H13").merge();
dashboard.getRange("I10:L13").merge();
dashboard.getRange("A10").values = [[`Protect service first: ${summary.stockout_risk_count} SKUs sit below expected lead-time demand in the fixed dataset.`]];
dashboard.getRange("E10").values = [[`${summary.reorder_now_count} SKUs need an order. Confirm supplier availability and inbound stock before release.`]];
dashboard.getRange("I10").values = [[`Review INR ${Math.round(summary.potential_release_inr).toLocaleString("en-IN")} of potential excess only after expiry, MOQ and promotion checks.`]];
dashboard.getRange("A10:L13").format = { fill: paleOrange, font: { color: ink, size: 11 }, wrapText: true, verticalAlignment: "center", borders: { preset: "outside", style: "thin", color: orange } };

dashboard.getRange("N4:O8").values = [["Risk Status", "SKU Count"], ["Stockout risk", null], ["Reorder now", null], ["Monitor", null], ["Healthy", null]];
for (let row = 5; row <= 8; row += 1) dashboard.getRange(`O${row}`).formulas = [[`=COUNTIF('SKU Policy'!$X$5:$X$40,N${row})`]];
dashboard.getRange("Q4:R8").values = [["Category", "Inventory Value INR"], ["Beverages", null], ["Snacks", null], ["Personal Care", null], ["Home Care", null]];
for (let row = 5; row <= 8; row += 1) dashboard.getRange(`R${row}`).formulas = [[`=SUMIF('SKU Policy'!$C$5:$C$40,Q${row},'SKU Policy'!$AA$5:$AA$40)`]];

const riskChart = dashboard.charts.add("bar", dashboard.getRange("N4:O8"));
riskChart.title = "SKUs by operating status";
riskChart.hasLegend = false;
riskChart.setPosition("A15", "F29");
const valueChart = dashboard.charts.add("bar", dashboard.getRange("Q4:R8"));
valueChart.title = "Inventory value by category (INR)";
valueChart.hasLegend = false;
valueChart.setPosition("G15", "L29");

dashboard.getRange("A31:L33").merge();
dashboard.getRange("A31").values = [["Decision note: potential release is a review queue, not an automatic disposal instruction. Filter SKU Policy by Risk Status, Recommended Order or Potential Release to work the exceptions."]];
dashboard.getRange("A31:L33").format = { fill: paleGray, font: { color: muted, italic: true }, wrapText: true, verticalAlignment: "center", borders: { preset: "outside", style: "thin", color: line } };
dashboard.getRange("A:L").format.columnWidth = 13;
dashboard.getRange("1:33").format.rowHeight = 23;

// Data notes
notes.showGridLines = false;
title(notes, "A1:F2", "Data notes and audit trail");
notes.getRange("A4:B4").values = [["Item", "Detail"]];
header(notes.getRange("A4:B4"));
notes.getRange("A5:B14").values = [
  ["Data status", "Synthetic. No employer, client, retailer or supplier records are used."],
  ["History", "24 monthly observations from January 2024 to December 2025."],
  ["SKU count", "36 invented SKUs across four FMCG categories."],
  ["ABC rule", "Recent 12-month demand multiplied by unit cost, sorted by annual consumption value."],
  ["XYZ rule", "Coefficient of variation: X at or below 0.50, Y at or below 1.00, Z above 1.00."],
  ["Safety stock", "Service factor times monthly demand deviation times square root of lead time in months."],
  ["Reorder point", "Expected lead-time demand plus safety stock."],
  ["EOQ", "Standard EOQ using annual demand, order cost and annual holding cost."],
  ["Potential release", "Current stock above safety stock plus one EOQ cycle. Review before action."],
  ["Sources", "Microsoft ABC Analysis; MDPI Systems 2024 safety-stock case; Oracle Inventory User's Guide."],
];
notes.getRange("A5:A14").format = { fill: paleGreen, font: { bold: true, color: ink } };
notes.getRange("A4:B14").format.borders = { preset: "all", style: "thin", color: line };
notes.getRange("A:A").format.columnWidth = 24;
notes.getRange("B:B").format.columnWidth = 92;
notes.getRange("B5:B14").format.wrapText = true;
notes.getRange("5:14").format.rowHeight = 34;

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(path.join(repoRoot, "excel"), { recursive: true });
await fs.mkdir(path.join(repoRoot, "visuals"), { recursive: true });

const check = await workbook.inspect({ kind: "table", range: "Control Tower!A1:L33", include: "values,formulas", tableMaxRows: 33, tableMaxCols: 12 });
console.log(check.ndjson);
const policyCheck = await workbook.inspect({ kind: "table", range: "SKU Policy!A4:AA40", include: "values,formulas", tableMaxRows: 40, tableMaxCols: 27 });
console.log(policyCheck.ndjson);
const formulaErrors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan" });
console.log(formulaErrors.ndjson);

for (const [sheetName, range, fileName] of [
  ["Control Tower", "A1:L33", "control-tower.png"],
  ["SKU Policy", "A1:AA40", "sku-policy.png"],
  ["ABC-XYZ Matrix", "A1:J12", "abc-xyz-matrix.png"],
  ["Demand History", "A1:Y40", "demand-history.png"],
  ["Parameters", "A1:F15", "parameters.png"],
  ["Data Notes", "A1:F14", "data-notes.png"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1.2, format: "png" });
  await fs.writeFile(path.join(outputDir, fileName), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
const finalPath = path.join(outputDir, "fmcg-inventory-control-tower.xlsx");
await output.save(finalPath);
await fs.copyFile(finalPath, path.join(repoRoot, "excel", "fmcg-inventory-control-tower.xlsx"));
await fs.copyFile(path.join(outputDir, "control-tower.png"), path.join(repoRoot, "visuals", "control-tower.png"));
await fs.writeFile(path.join(outputDir, "control-tower.inspect.ndjson"), check.ndjson);
await fs.writeFile(path.join(outputDir, "sku-policy.inspect.ndjson"), policyCheck.ndjson);
console.log(JSON.stringify({ finalPath, skus: master.length, months: months.length, sheets: 6 }));
