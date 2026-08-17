const { PDFParse } = require('pdf-parse');
const fs = require('fs');

async function test() {
  const dataBuffer = fs.readFileSync('tests/test.pdf');
  const parser = new PDFParse({ data: dataBuffer });
  try {
    const textResult = await parser.getText();
    console.log('Extracted text:', textResult.text);
  } catch (e) {
    console.error(e);
  }
}
test();
