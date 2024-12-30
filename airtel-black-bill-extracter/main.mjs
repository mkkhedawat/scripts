#!/usr/bin/env zx

import fs from 'fs';
import path from 'path';
import { $ } from 'zx';
import { PDFDocument } from 'pdf-lib';
import pdf2json from 'pdf2json';

const findPagesWithText = async (pdf, searchText) => {
    const pdfParser = new pdf2json();
    return new Promise((resolve, reject) => {
        pdfParser.on("pdfParser_dataReady", (pdfData) => {
            const pages = [];
            pdfData.Pages.forEach((page, index) => {
                const textContent = page.Texts.map(text => decodeURIComponent(text.R[0].T)).join(' ');
                if (textContent.includes(searchText)) {
                    pages.push(index);
                }
            });
            resolve(pages);
        });

        pdfParser.on("pdfParser_dataError", (err) => {
            reject(err.parserError);
        });

        pdfParser.parseBuffer(pdf);
    });
};

const extractAndAddPages = async (pdfBuffer, pageNumbers, pdfDoc) => {
    const sourcePdf = await PDFDocument.load(pdfBuffer);
    for (const pageNum of pageNumbers) {
        const [page] = await pdfDoc.copyPages(sourcePdf, [pageNum]);
        pdfDoc.addPage(page);
    }
};

(async () => {
    const dataDir = path.join(__dirname, 'data'); // Input folder
    const resultsDir = path.join(__dirname, 'results'); // Output folder
    if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir);

    const mobileBills = await PDFDocument.create();
    const broadbandBills = await PDFDocument.create();

    const pdfFiles = fs.readdirSync(dataDir).filter(file => file.endsWith('.pdf'));

    for (const pdfFile of pdfFiles) {
        const inputPdfPath = path.join(dataDir, pdfFile);
        console.log(`Processing: ${inputPdfPath}`);
        
        const pdf = fs.readFileSync(inputPdfPath);
        const mobileBillPages = await findPagesWithText(pdf, 'MOBILE SERVICES');
        const broadbandBillPages = [
            ...await findPagesWithText(pdf, 'FIXEDLINE AND BROADBAND SERVICES'),
            ...await findPagesWithText(pdf, 'FIXEDLINE AND Wi-Fi SERVICES'),
        ]

        console.log(`Mobile Bill Pages in ${pdfFile}:`, mobileBillPages);
        console.log(`Broadband Bill Pages in ${pdfFile}:`, broadbandBillPages);

        // Add pages to the respective PDFs
        await extractAndAddPages(pdf, mobileBillPages, mobileBills);
        await extractAndAddPages(pdf, broadbandBillPages, broadbandBills);
    }

    // Save the merged PDFs
    const mobileBillsOutputPath = path.join(resultsDir, 'mobile.pdf');
    const broadbandBillsOutputPath = path.join(resultsDir, 'broadband.pdf');

    fs.writeFileSync(mobileBillsOutputPath, await mobileBills.save());
    fs.writeFileSync(broadbandBillsOutputPath, await broadbandBills.save());

    console.log(`Merged mobile bill pages saved to: ${mobileBillsOutputPath}`);
    console.log(`Merged broadband bill pages saved to: ${broadbandBillsOutputPath}`);
})();
