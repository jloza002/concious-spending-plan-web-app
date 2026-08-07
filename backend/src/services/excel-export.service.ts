import ExcelJS from "exceljs";
import { prisma } from "../db/client.js";
import { AppError } from "../middleware/error-handler.js";
import {
  MISCELLANEOUS_RATE,
  COLUMN_WIDTHS,
  ROW_HEIGHTS,
  EXCEL_COLORS,
  EXCEL_FONTS,
  EXCEL_FILLS,
  CURRENCY_FORMAT_NO_DECIMALS,
  PERCENTAGE_FORMAT,
} from "@csp/shared";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const THIN: ExcelJS.Border = { style: "thin", color: { argb: "FF000000" } };
const BORDERS_ALL = { top: THIN, bottom: THIN, left: THIN, right: THIN };
const BORDERS_NO_RIGHT = { top: THIN, bottom: THIN, left: THIN };

export async function generateExcel(planId: string, userId: string): Promise<ExcelJS.Buffer> {
  const plan = await prisma.spendingPlan.findFirst({
    where: { id: planId, userId },
    include: {
      lineItems: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
    },
  });

  if (!plan) throw new AppError("Spending plan not found", 404);

  // Fixed costs + income come from transactions, not line items. deletedAt:
  // null matters — without it a soft-deleted transaction would still count
  // here even though the app no longer shows it.
  const txns = await prisma.transaction.findMany({
    where: {
      import: { spendingPlanId: planId },
      spendingCategory: { in: ["fixed_costs", "income"] },
      isDuplicate: false,
      deletedAt: null,
    },
    select: { spendingCategory: true, spendingSubcategory: true, amount: true, type: true },
  });

  type LineItem = (typeof plan.lineItems)[number];

  // Excluded lines (per-line what-if toggle) are dropped from all totals.
  const excludedFixedLabels = new Set(
    plan.lineItems.filter((i: LineItem) => i.section === "fixed_costs" && i.excluded).map((i: LineItem) => i.label)
  );
  const excludedIncomeLabels = new Set(
    plan.lineItems.filter((i: LineItem) => i.section === "income" && i.excluded).map((i: LineItem) => i.label)
  );

  const fcTotals: Record<string, number> = {};
  const incomeTotals: Record<string, number> = {};
  let incomeCount = 0;
  for (const t of txns) {
    if (t.spendingCategory === "fixed_costs") {
      // Payment-type rows (e.g. credit card payments) don't count as fixed
      // costs, but the same exclusion must NOT apply to income — banks often
      // describe real payroll deposits with a "Payment" type too.
      if (t.type === "Payment") continue;
      if (!t.spendingSubcategory || excludedFixedLabels.has(t.spendingSubcategory)) continue;
      fcTotals[t.spendingSubcategory] = (fcTotals[t.spendingSubcategory] ?? 0) + -Number(t.amount);
    } else if (t.spendingCategory === "income") {
      incomeCount++;
      const amount = Number(t.amount);
      if (amount <= 0) continue;
      if (t.spendingSubcategory && excludedIncomeLabels.has(t.spendingSubcategory)) continue;
      if (t.spendingSubcategory) {
        incomeTotals[t.spendingSubcategory] = (incomeTotals[t.spendingSubcategory] ?? 0) + amount;
      }
    }
  }
  const fcEntries = Object.entries(fcTotals).sort(([a], [b]) => a.localeCompare(b));
  const incomeEntries = Object.entries(incomeTotals).sort(([a], [b]) => a.localeCompare(b));
  const computedIncome = incomeCount > 0 ? Object.values(incomeTotals).reduce((s, v) => s + v, 0) : null;

  const investmentItems = plan.lineItems.filter((i: LineItem) => i.section === "investments" && !i.excluded);
  const savingsItems = plan.lineItems.filter((i: LineItem) => i.section === "savings" && !i.excluded);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IWT Conscious Spending Plan";
  const sheet = workbook.addWorksheet("Conscious Spending Plan");

  sheet.getColumn("A").width = COLUMN_WIDTHS.A;
  sheet.getColumn("B").width = COLUMN_WIDTHS.B;

  let row = 1;

  // ── TITLE ──
  sheet.getRow(row).height = ROW_HEIGHTS.TITLE;
  const titleCell = sheet.getCell(`A${row}`);
  titleCell.value = "Conscious Spending Plan";
  titleCell.font = { name: "DM Sans", size: 22, bold: true, color: { argb: `FF${EXCEL_COLORS.DARK_TEAL}` } };
  titleCell.alignment = { horizontal: "right", vertical: "middle" };
  sheet.mergeCells(`A${row}:B${row}`);
  row++;

  // Subtitle (month/year)
  sheet.getRow(row).height = ROW_HEIGHTS.SPACER;
  sheet.getCell(`A${row}`).value = `${MONTH_NAMES[plan.month - 1]} ${plan.year}`;
  sheet.getCell(`A${row}`).font = { name: "DM Sans", size: 10, color: { argb: "FF888888" } };
  sheet.getCell(`A${row}`).alignment = { horizontal: "right" };
  sheet.mergeCells(`A${row}:B${row}`);
  row++;

  // ── NET WORTH ──
  row = addSectionHeader(sheet, row, "NET WORTH", "$");
  const nwR1 = row;
  row = addDataRow(sheet, row, "Assets (current value of car, home, property, business)", Number(plan.assets));
  row = addDataRow(sheet, row, "Investments (include 401K, non-retirement – all investments)", Number(plan.investmentsNw));
  row = addDataRow(sheet, row, "Savings", Number(plan.savingsNw));
  row = addDataRow(sheet, row, "Debt (student loans, credit card debt, mortgage)", Number(plan.debt));
  addTotalRow(sheet, row, "TOTAL NET WORTH", `=(B${nwR1}+B${nwR1 + 1}+B${nwR1 + 2})-B${nwR1 + 3}`);
  row++;

  blankRow(sheet, row);
  row++;

  // ── INCOME ──
  row = addSectionHeader(sheet, row, "INCOME");
  row = addDataRow(sheet, row, "Gross monthly income (all income before taxes added up)", Number(plan.grossMonthlyIncome));

  // When deposits are tagged, show the breakdown the app itself displays.
  for (const [label, amount] of incomeEntries) {
    row = addDataRow(sheet, row, label, amount);
  }

  const netIncomeRow = row;
  row = addDataRow(
    sheet, row,
    "Net monthly income (how much you take home after taxes)",
    computedIncome ?? Number(plan.netMonthlyIncome)
  );
  // Orange highlight on net income row
  sheet.getCell(`A${netIncomeRow}`).font = {
    name: "DM Sans", size: 11, bold: true, color: { argb: `FF${EXCEL_COLORS.ORANGE}` },
  };
  sheet.getCell(`B${netIncomeRow}`).font = {
    name: "DM Sans", size: 11, bold: true, color: { argb: `FF${EXCEL_COLORS.ORANGE}` },
  };

  blankRow(sheet, row);
  row++;

  // ── FIXED COSTS ──
  const fcHeaderRow = row;
  row = addSectionHeader(sheet, row, "FIXED COSTS (50-60% of take home)");
  const fcStartRow = row;
  for (const [label, amount] of fcEntries) {
    row = addDataRow(sheet, row, label, amount);
  }

  // Miscellaneous auto-calc
  const miscRow = row;
  sheet.getRow(row).height = ROW_HEIGHTS.DATA_ROW;
  sheet.getCell(`A${miscRow}`).value = `Miscellaneous (automatically adds ${Math.round(MISCELLANEOUS_RATE * 100)}% for things you forgot)`;
  sheet.getCell(`A${miscRow}`).font = EXCEL_FONTS.MISCELLANEOUS as ExcelJS.Font;
  sheet.getCell(`A${miscRow}`).alignment = { vertical: "middle", wrapText: true };
  sheet.getCell(`A${miscRow}`).border = BORDERS_ALL;

  const miscFormula = fcStartRow <= miscRow - 1
    ? `=SUM(B${fcStartRow}:B${miscRow - 1})*${MISCELLANEOUS_RATE}`
    : `=0`;
  sheet.getCell(`B${miscRow}`).value = { formula: miscFormula, result: 0 };
  sheet.getCell(`B${miscRow}`).numFmt = CURRENCY_FORMAT_NO_DECIMALS;
  sheet.getCell(`B${miscRow}`).font = EXCEL_FONTS.DATA_LABEL as ExcelJS.Font;
  sheet.getCell(`B${miscRow}`).alignment = { horizontal: "center", vertical: "middle" };
  sheet.getCell(`B${miscRow}`).border = BORDERS_ALL;
  row++;

  const fcTotalRow = row;
  addTotalRow(sheet, row, "FIXED COSTS TOTAL", `=SUM(B${fcStartRow}:B${miscRow})`);
  row++;

  sheet.getCell(`B${fcHeaderRow}`).value = { formula: `=IF(B${netIncomeRow}=0," ",B${fcTotalRow}/B${netIncomeRow})`, result: 0 };
  sheet.getCell(`B${fcHeaderRow}`).numFmt = PERCENTAGE_FORMAT;

  blankRow(sheet, row);
  row++;

  // ── INVESTMENTS ──
  const invHeaderRow = row;
  row = addSectionHeader(sheet, row, "INVESTMENTS (10% of take home)");
  const invStartRow = row;
  for (const item of investmentItems) {
    row = addDataRow(sheet, row, item.label, Number(item.amount));
  }
  const invTotalRow = row;
  const invSumRange = investmentItems.length > 0 ? `B${invStartRow}:B${invStartRow + investmentItems.length - 1}` : `B${invStartRow}`;
  addTotalRow(sheet, row, "INVESTMENTS TOTAL", `=SUM(${invSumRange})`);
  row++;

  sheet.getCell(`B${invHeaderRow}`).value = { formula: `=IF(B${netIncomeRow}=0," ",B${invTotalRow}/B${netIncomeRow})`, result: 0 };
  sheet.getCell(`B${invHeaderRow}`).numFmt = PERCENTAGE_FORMAT;

  blankRow(sheet, row);
  row++;

  // ── SAVINGS GOALS ──
  const savHeaderRow = row;
  row = addSectionHeader(sheet, row, "SAVINGS GOALS (5-10% of take home)");
  const savStartRow = row;
  for (const item of savingsItems) {
    row = addDataRow(sheet, row, item.label, Number(item.amount));
  }
  const savTotalRow = row;
  const savSumRange = savingsItems.length > 0 ? `B${savStartRow}:B${savStartRow + savingsItems.length - 1}` : `B${savStartRow}`;
  addTotalRow(sheet, row, "SAVINGS TOTAL", `=SUM(${savSumRange})`);
  row++;

  sheet.getCell(`B${savHeaderRow}`).value = { formula: `=IF(B${netIncomeRow}=0," ",B${savTotalRow}/B${netIncomeRow})`, result: 0 };
  sheet.getCell(`B${savHeaderRow}`).numFmt = PERCENTAGE_FORMAT;

  blankRow(sheet, row);
  row++;

  // ── GUILT-FREE SPENDING ──
  const gfHeaderRow = row;
  row = addSectionHeader(sheet, row, "GUILT-FREE SPENDING (20-35% of take home)");
  const gfTotalRow = row;
  addTotalRow(
    sheet, row,
    "GUILT-FREE SPENDING TOTAL (Dining out, movies, anything you want!)",
    `=B${netIncomeRow}-B${fcTotalRow}-B${invTotalRow}-B${savTotalRow}`
  );
  row++;

  sheet.getCell(`B${gfHeaderRow}`).value = { formula: `=IF(B${netIncomeRow}=0," ",B${gfTotalRow}/B${netIncomeRow})`, result: 0 };
  sheet.getCell(`B${gfHeaderRow}`).numFmt = PERCENTAGE_FORMAT;

  return workbook.xlsx.writeBuffer();
}

function addSectionHeader(sheet: ExcelJS.Worksheet, row: number, label: string, rightLabel?: string): number {
  sheet.getRow(row).height = ROW_HEIGHTS.SECTION_HEADER;

  const cellA = sheet.getCell(`A${row}`);
  cellA.value = label;
  cellA.font = EXCEL_FONTS.SECTION_HEADER as ExcelJS.Font;
  cellA.fill = EXCEL_FILLS.SECTION_HEADER as ExcelJS.Fill;
  cellA.alignment = { vertical: "middle", wrapText: true };
  cellA.border = BORDERS_ALL;

  const cellB = sheet.getCell(`B${row}`);
  if (rightLabel) cellB.value = rightLabel;
  cellB.font = EXCEL_FONTS.SECTION_HEADER as ExcelJS.Font;
  cellB.fill = EXCEL_FILLS.SECTION_HEADER as ExcelJS.Fill;
  cellB.alignment = { horizontal: "center", vertical: "middle" };
  cellB.border = BORDERS_ALL;

  return row + 1;
}

function addDataRow(sheet: ExcelJS.Worksheet, row: number, label: string, value: number): number {
  sheet.getRow(row).height = ROW_HEIGHTS.DATA_ROW;

  const cellA = sheet.getCell(`A${row}`);
  cellA.value = label;
  cellA.font = EXCEL_FONTS.DATA_LABEL as ExcelJS.Font;
  cellA.alignment = { vertical: "middle", wrapText: true, indent: 1 };
  cellA.border = BORDERS_ALL;

  const cellB = sheet.getCell(`B${row}`);
  cellB.value = value;
  cellB.numFmt = CURRENCY_FORMAT_NO_DECIMALS;
  cellB.font = EXCEL_FONTS.DATA_LABEL as ExcelJS.Font;
  cellB.fill = EXCEL_FILLS.BEIGE_DIVIDER as ExcelJS.Fill;
  cellB.alignment = { horizontal: "center", vertical: "middle" };
  cellB.border = BORDERS_NO_RIGHT;

  return row + 1;
}

function addTotalRow(sheet: ExcelJS.Worksheet, row: number, label: string, formula: string): void {
  sheet.getRow(row).height = ROW_HEIGHTS.DATA_ROW;

  const cellA = sheet.getCell(`A${row}`);
  cellA.value = label;
  cellA.font = EXCEL_FONTS.TOTAL as ExcelJS.Font;
  cellA.alignment = { vertical: "middle", wrapText: true };
  cellA.border = BORDERS_ALL;

  const cellB = sheet.getCell(`B${row}`);
  cellB.value = { formula, result: 0 };
  cellB.numFmt = CURRENCY_FORMAT_NO_DECIMALS;
  cellB.font = EXCEL_FONTS.TOTAL as ExcelJS.Font;
  cellB.alignment = { horizontal: "center", vertical: "middle" };
  cellB.border = BORDERS_ALL;
}

function blankRow(sheet: ExcelJS.Worksheet, row: number): void {
  sheet.getRow(row).height = ROW_HEIGHTS.SPACER;
}
