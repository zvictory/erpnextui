import * as XLSX from "xlsx";

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
  sheetName = "Sheet1",
) {
  // Build header row
  const headers = columns.map((c) => c.header);

  // Build data rows
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = row[c.key];
      return val ?? "";
    }),
  );

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  ws["!cols"] = columns.map((c) => ({ wch: c.width ?? 15 }));

  // Create workbook and export
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
