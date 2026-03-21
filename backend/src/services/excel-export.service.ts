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
  CURRENCY_FORMAT,
  PERCENTAGE_FORMAT,
} from "@csp/shared";

/**
 * Generate an Excel file matching the IWT Conscious Spending Plan template.
 * Handles dynamic row positions based on custom subcategories.
 */
export async function generateExcel(
  planId: string,
  userId: string
): Promise<ExcelJS.Buffer> {
  const plan = await prisma.spendingPlan.findFirst({
    where: { id: planId, userId },
    include: {
      lineItems: { orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
    },
  });

  if (!plan) {
    throw new AppError("Spending plan not found", 404);
  }

  type LineItem = (typeof plan.lineItems)[number];
  const fixedCostItems = plan.lineItems.filter(
    (i: LineItem) => i.section === "fixed_costs"
  );
  const investmentItems = plan.lineItems.filter(
    (i: LineItem) => i.section === "investments"
  );
  const savingsItems = plan.lineItems.filter((i: LineItem) => i.section === "savings");

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "IWT Conscious Spending Plan";
  const sheet = workbook.addWorksheet("Conscious Spending Plan");

  // Set column widths
  sheet.getColumn("A").width = COLUMN_WIDTHS.A;
  sheet.getColumn("B").width = COLUMN_WIDTHS.B;

  let row = 1;

  // ── TITLE ──
  const titleRow = sheet.getRow(row);
  titleRow.height = ROW_HEIGHTS.TITLE;
  const titleCell = sheet.getCell(`A${row}`);
  titleCell.value = "Conscious Spending Plan";
  titleCell.font = EXCEL_FONTS.TITLE as any;
  titleCell.alignment = { horizontal: "right", vertical: "middle" };
  sheet.mergeCells(`A${row}:B${row}`);
  row++;

  // Spacer
  sheet.getRow(row).height = ROW_HEIGHTS.SPACER;
  row++;

  // ── NET WORTH ──
  row = addSectionHeader(sheet, row, "NET WORTH", "$");
  const nwStartRow = row;
  row = addDataRow(sheet, row, "Assets", Number(plan.assets));
  row = addDataRow(sheet, row, "Investments", Number(plan.investmentsNw));
  row = addDataRow(sheet, row, "Savings", Number(plan.savingsNw));
  row = addDataRow(sheet, row, "Debt", Number(plan.debt));

  // Total Net Worth with formula
  const nwTotalRow = row;
  addTotalRow(
    sheet,
    row,
    "TOTAL NET WORTH",
    `=(B${nwStartRow}+B${nwStartRow + 1}+B${nwStartRow + 2})-B${nwStartRow + 3}`
  );
  row++;

  // Spacer
  sheet.getRow(row).height = ROW_HEIGHTS.SPACER;
  row++;

  // ── INCOME ──
  row = addSectionHeader(sheet, row, "INCOME");
  row = addDataRow(sheet, row, "Gross monthly income", Number(plan.grossMonthlyIncome));
  const netIncomeRow = row;
  const netIncomeDataRow = addDataRow(
    sheet,
    row,
    "Net monthly income (post-tax, after deductions)",
    Number(plan.netMonthlyIncome)
  );
  // Highlight net income row in orange
  sheet.getCell(`A${row}`).font = {
    ...EXCEL_FONTS.DATA_LABEL_BOLD,
    color: { argb: `FF${EXCEL_COLORS.ORANGE}` },
  } as any;
  sheet.getCell(`B${row}`).font = {
    ...EXCEL_FONTS.TOTAL,
  } as any;
  row = netIncomeDataRow;

  // Spacer
  sheet.getRow(row).height = ROW_HEIGHTS.SPACER;
  row++;

  // ── FIXED COSTS ──
  const fcHeaderRow = row;
  row = addSectionHeader(sheet, row, "FIXED COSTS (50-60%)");
  // We'll fill in the percentage formula after we know the total row
  const fcStartRow = row;
  for (const item of fixedCostItems) {
    row = addDataRow(sheet, row, item.label, Number(item.amount));
  }

  // Miscellaneous (auto-calculated 15%)
  const miscRow = row;
  const miscLabel = `Miscellaneous (automatically adds ${Math.round(MISCELLANEOUS_RATE * 100)}%)`;
  sheet.getRow(row).height = ROW_HEIGHTS.DATA_ROW;
  sheet.getCell(`A${row}`).value = miscLabel;
  sheet.getCell(`A${row}`).font = EXCEL_FONTS.MISCELLANEOUS as any;
  // Formula: sum of all fixed cost items * 15%
  const fcItemRefs = fixedCostItems
    .map((_: LineItem, i: number) => `B${fcStartRow + i}`)
    .join("+");
  sheet.getCell(`B${row}`).value = {
    formula: `=(${fcItemRefs})*${MISCELLANEOUS_RATE}`,
    result: undefined,
  } as any;
  sheet.getCell(`B${row}`).numFmt = CURRENCY_FORMAT;
  row++;

  // Fixed Costs Total
  const fcTotalRow = row;
  addTotalRow(
    sheet,
    row,
    "FIXED COSTS TOTAL",
    `=SUM(B${fcStartRow}:B${miscRow})`
  );
  row++;

  // Fill in percentage in header: total / net income
  sheet.getCell(`B${fcHeaderRow}`).value = {
    formula: `=IF(B${netIncomeRow}=0," ",B${fcTotalRow}/B${netIncomeRow})`,
    result: undefined,
  } as any;
  sheet.getCell(`B${fcHeaderRow}`).numFmt = PERCENTAGE_FORMAT;

  // Spacer
  sheet.getRow(row).height = ROW_HEIGHTS.SPACER;
  row++;

  // ── INVESTMENTS ──
  const invHeaderRow = row;
  row = addSectionHeader(sheet, row, "INVESTMENTS (10%)");
  const invStartRow = row;
  for (const item of investmentItems) {
    row = addDataRow(sheet, row, item.label, Number(item.amount));
  }
  const invTotalRow = row;
  addTotalRow(
    sheet,
    row,
    "INVESTMENTS TOTAL",
    `=SUM(B${invStartRow}:B${invStartRow + investmentItems.length - 1})`
  );
  row++;

  sheet.getCell(`B${invHeaderRow}`).value = {
    formula: `=IF(B${netIncomeRow}=0," ",B${invTotalRow}/B${netIncomeRow})`,
    result: undefined,
  } as any;
  sheet.getCell(`B${invHeaderRow}`).numFmt = PERCENTAGE_FORMAT;

  // Spacer
  sheet.getRow(row).height = ROW_HEIGHTS.SPACER;
  row++;

  // ── SAVINGS GOALS ──
  const savHeaderRow = row;
  row = addSectionHeader(sheet, row, "SAVINGS GOALS (5-10%)");
  const savStartRow = row;
  for (const item of savingsItems) {
    row = addDataRow(sheet, row, item.label, Number(item.amount));
  }
  const savTotalRow = row;
  addTotalRow(
    sheet,
    row,
    "SAVINGS TOTAL",
    `=SUM(B${savStartRow}:B${savStartRow + savingsItems.length - 1})`
  );
  row++;

  sheet.getCell(`B${savHeaderRow}`).value = {
    formula: `=IF(B${netIncomeRow}=0," ",B${savTotalRow}/B${netIncomeRow})`,
    result: undefined,
  } as any;
  sheet.getCell(`B${savHeaderRow}`).numFmt = PERCENTAGE_FORMAT;

  // Spacer
  sheet.getRow(row).height = ROW_HEIGHTS.SPACER;
  row++;

  // ── GUILT-FREE SPENDING ──
  const gfHeaderRow = row;
  row = addSectionHeader(sheet, row, "GUILT-FREE SPENDING (20-35%)");
  const gfTotalRow = row;
  addTotalRow(
    sheet,
    row,
    "GUILT-FREE SPENDING TOTAL",
    `=B${netIncomeRow}-B${fcTotalRow}-B${invTotalRow}-B${savTotalRow}`
  );
  row++;

  sheet.getCell(`B${gfHeaderRow}`).value = {
    formula: `=IF(B${netIncomeRow}=0," ",B${gfTotalRow}/B${netIncomeRow})`,
    result: undefined,
  } as any;
  sheet.getCell(`B${gfHeaderRow}`).numFmt = PERCENTAGE_FORMAT;

  // Generate buffer
  return workbook.xlsx.writeBuffer();
}

// ──────────────────────────────────────────
// Helper functions for building rows
// ──────────────────────────────────────────

function addSectionHeader(
  sheet: ExcelJS.Worksheet,
  row: number,
  label: string,
  rightLabel?: string
): number {
  const r = sheet.getRow(row);
  r.height = ROW_HEIGHTS.SECTION_HEADER;
  const cellA = sheet.getCell(`A${row}`);
  cellA.value = label;
  cellA.font = EXCEL_FONTS.SECTION_HEADER as any;
  cellA.fill = EXCEL_FILLS.SECTION_HEADER as any;
  cellA.alignment = { vertical: "middle" };

  const cellB = sheet.getCell(`B${row}`);
  if (rightLabel) {
    cellB.value = rightLabel;
  }
  cellB.font = EXCEL_FONTS.SECTION_HEADER as any;
  cellB.fill = EXCEL_FILLS.SECTION_HEADER as any;
  cellB.alignment = { horizontal: "center", vertical: "middle" };

  return row + 1;
}

function addDataRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  label: string,
  value: number
): number {
  const r = sheet.getRow(row);
  r.height = ROW_HEIGHTS.DATA_ROW;
  sheet.getCell(`A${row}`).value = label;
  sheet.getCell(`A${row}`).font = EXCEL_FONTS.DATA_LABEL as any;
  sheet.getCell(`A${row}`).alignment = { vertical: "middle", indent: 1 };
  sheet.getCell(`B${row}`).value = value;
  sheet.getCell(`B${row}`).numFmt = CURRENCY_FORMAT;
  sheet.getCell(`B${row}`).font = EXCEL_FONTS.DATA_LABEL as any;
  sheet.getCell(`B${row}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  return row + 1;
}

function addTotalRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  label: string,
  formula: string
): void {
  const r = sheet.getRow(row);
  r.height = ROW_HEIGHTS.DATA_ROW;
  sheet.getCell(`A${row}`).value = label;
  sheet.getCell(`A${row}`).font = EXCEL_FONTS.TOTAL as any;
  sheet.getCell(`A${row}`).alignment = { vertical: "middle" };
  sheet.getCell(`B${row}`).value = { formula, result: undefined } as any;
  sheet.getCell(`B${row}`).numFmt = CURRENCY_FORMAT;
  sheet.getCell(`B${row}`).font = EXCEL_FONTS.TOTAL as any;
  sheet.getCell(`B${row}`).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
}
