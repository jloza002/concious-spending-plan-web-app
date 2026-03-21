/**
 * Excel template constants for generating .xlsx output
 * matching the IWT Conscious Spending Plan format.
 */

/** Column widths (in Excel character units) */
export const COLUMN_WIDTHS = {
  A: 57.63, // Labels column
  B: 15.75, // Values column
};

/** Row heights (in points) */
export const ROW_HEIGHTS = {
  TITLE: 88.5,
  SECTION_HEADER: 33.75,
  DATA_ROW: 30.0,
  SPACER: 21.0,
  DEFAULT: 15.75,
};

/** Color palette from the Excel template */
export const EXCEL_COLORS = {
  DARK_TEAL: "15302F",
  WARM_BEIGE: "EEE3D2",
  ORANGE: "FB4D30",
  WHITE: "FFFFFF",
  BLACK: "000000",
  BLUE_HEADER: "5C84C5",
};

/** Font definitions */
export const EXCEL_FONTS = {
  TITLE: {
    name: "DM Sans",
    size: 22,
    bold: true,
    color: { argb: `FF${EXCEL_COLORS.DARK_TEAL}` },
  },
  SECTION_HEADER: {
    name: "Volkhov",
    size: 14,
    bold: true,
    color: { argb: `FF${EXCEL_COLORS.WHITE}` },
  },
  DATA_LABEL: {
    name: "DM Sans",
    size: 11,
    bold: false,
    color: { argb: `FF${EXCEL_COLORS.BLACK}` },
  },
  DATA_LABEL_BOLD: {
    name: "DM Sans",
    size: 11,
    bold: true,
    color: { argb: `FF${EXCEL_COLORS.BLACK}` },
  },
  TOTAL: {
    name: "DM Sans",
    size: 11,
    bold: true,
    color: { argb: `FF${EXCEL_COLORS.ORANGE}` },
  },
  MISCELLANEOUS: {
    name: "DM Sans",
    size: 11,
    bold: false,
    italic: true,
    color: { argb: `FF${EXCEL_COLORS.BLACK}` },
  },
};

/** Fill patterns */
export const EXCEL_FILLS = {
  SECTION_HEADER: {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: `FF${EXCEL_COLORS.DARK_TEAL}` },
  },
  BEIGE_DIVIDER: {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: `FF${EXCEL_COLORS.WARM_BEIGE}` },
  },
  WHITE: {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: `FF${EXCEL_COLORS.WHITE}` },
  },
};

/** Number format for currency */
export const CURRENCY_FORMAT = '"$"#,##0.00';
export const CURRENCY_FORMAT_NO_DECIMALS = '"$"#,##0';
export const PERCENTAGE_FORMAT = "0%";
