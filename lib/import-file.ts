'use client';

const maxCharacters = 24_000;

export async function readReferenceFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran file maksimal 5 MB.');

  if (extension === 'xlsx') {
    const ExcelJS = await import('exceljs');
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const parts: string[] = [];
    workbook.eachSheet((sheet) => {
      const rows: string[] = [];
      sheet.eachRow({ includeEmpty: false }, (row) => {
        const cells: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => cells.push(cell.text));
        rows.push(cells.map((value) => value.includes(',') ? `"${value.replaceAll('"', '""')}"` : value).join(','));
      });
      parts.push(`SHEET: ${sheet.name}\n${rows.join('\n')}`);
    });
    return parts.join('\n\n').slice(0, maxCharacters);
  }

  const textExtensions = new Set(['txt', 'md', 'csv', 'json']);
  if (!extension || !textExtensions.has(extension)) {
    throw new Error('Format yang didukung: TXT, MD, CSV, JSON, dan XLSX.');
  }

  return (await file.text()).slice(0, maxCharacters);
}
