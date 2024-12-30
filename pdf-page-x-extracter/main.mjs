#!/usr/bin/env zx

import fs from 'fs';
import path from 'path';
import { $ } from 'zx';
import { PDFDocument } from 'pdf-lib';

const extractAndAddPages = async (pdfBuffer, pageNumbers, pdfDoc) => {
    const sourcePdf = await PDFDocument.load(pdfBuffer);
    for (const pageNum of pageNumbers) {
        const [page] = await pdfDoc.copyPages(sourcePdf, [pageNum]);
        pdfDoc.addPage(page);
    }
};

(async () => {
    const pageIndexesToExtract = [0]; // Indexed 0
    const dataDir = path.join(__dirname, 'data'); // Input folder
    const resultsDir = path.join(__dirname, 'results'); // Output folder
    if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir);

    const finalPDF = await PDFDocument.create();
    const pdfFiles = fs.readdirSync(dataDir).filter(file => file.endsWith('.pdf'));

    for (const pdfFile of pdfFiles) {
        const inputPdfPath = path.join(dataDir, pdfFile);
        const pdf = fs.readFileSync(inputPdfPath);

        // Add pages to the respective PDFs
        await extractAndAddPages(pdf, pageIndexesToExtract, finalPDF);
    }

    // Save the merged PDFs
    const finalPDFOutputPath = path.join(resultsDir, 'final.pdf');
    fs.writeFileSync(finalPDFOutputPath, await finalPDF.save());

    console.log(`Merged pdf saved to: ${finalPDFOutputPath}`);
})();
