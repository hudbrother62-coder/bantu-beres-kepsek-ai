'use client';

import { safeFilename } from '@/lib/utils';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function plainLines(content: string) {
  return content.replace(/\r/g, '').split('\n');
}

export async function exportDocx(title: string, content: string) {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx');
  const children = plainLines(content).map((line) => {
    if (line.startsWith('### ')) {
      return new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 80 } });
    }
    if (line.startsWith('## ')) {
      return new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 100 } });
    }
    if (line.startsWith('# ')) {
      return new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 160 } });
    }
    return new Paragraph({
      children: [new TextRun({ text: line || ' ', size: 22 })],
      spacing: { after: line ? 100 : 40 },
    });
  });
  const documentFile = new Document({
    sections: [{ properties: {}, children }],
    creator: 'Bantu Beres Kepsek AI',
    title,
    description: 'Dokumen sekolah yang dibuat melalui Bantu Beres Kepsek AI',
  });
  downloadBlob(await Packer.toBlob(documentFile), `${safeFilename(title)}.docx`);
}

export async function exportPdf(title: string, content: string) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 18;
  const pageHeight = 297;
  const usableWidth = 210 - margin * 2;
  let y = margin;

  for (const rawLine of plainLines(content)) {
    const isHeading = rawLine.startsWith('#');
    const line = rawLine.replace(/^#{1,3}\s*/, '') || ' ';
    pdf.setFont('helvetica', isHeading ? 'bold' : 'normal');
    pdf.setFontSize(isHeading ? 13 : 10);
    const wrapped = pdf.splitTextToSize(line, usableWidth) as string[];
    const lineHeight = isHeading ? 6.5 : 5;
    if (y + wrapped.length * lineHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(wrapped, margin, y);
    y += wrapped.length * lineHeight + (isHeading ? 2 : 0.8);
  }
  pdf.save(`${safeFilename(title)}.pdf`);
}

export async function exportXlsx(title: string, content: string) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bantu Beres Kepsek AI';
  workbook.title = title;
  const worksheet = workbook.addWorksheet('Dokumen', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  worksheet.columns = [
    { header: 'No.', key: 'number', width: 8 },
    { header: 'Isi dokumen', key: 'content', width: 110 },
  ];
  plainLines(content).forEach((line, index) => {
    worksheet.addRow({ number: index + 1, content: line.replace(/^#{1,3}\s*/, '') });
  });
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6752D8' } };
  worksheet.getColumn('content').alignment = { vertical: 'top', wrapText: true };
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${safeFilename(title)}.xlsx`,
  );
}
