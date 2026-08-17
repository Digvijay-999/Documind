const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument();
const buffers = [];
doc.on('data', buffers.push.bind(buffers));
doc.on('end', () => {
    const pdfData = Buffer.concat(buffers);
    console.log(pdfData.toString('base64'));
});
doc.text('Hello DocuMind AI');
doc.end();
