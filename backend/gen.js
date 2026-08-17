const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');

async function createPdf() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText('Hello DocuMind AI', { x: 50, y: 700, size: 24, font, color: rgb(0, 0, 0) });
  const pdfBytes = await pdfDoc.save();
  console.log(Buffer.from(pdfBytes).toString('base64'));
}
createPdf();
