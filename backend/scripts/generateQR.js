const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/db');
const Ticket = require('../models/Ticket');

const args = process.argv.slice(2);
const count = parseInt(args[0], 10) || 240;

const outDir = path.join(__dirname, '../qrcodes');

async function generateQRCodes() {
  try {
    // 1. Ensure outDir exists
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    console.log(`Generating ${count} QR codes...`);

    const ticketsData = [];
    for (let i = 1; i <= count; i++) {
      ticketsData.push({
        qr_id: uuidv4(),
        label: `T-${String(i).padStart(3, '0')}`
      });
    }

    // 2. Insert into DB (Bulk Insert)
    const dbPayload = ticketsData.map(t => ({ qr_id: t.qr_id }));
    
    await sequelize.authenticate();
    await Ticket.bulkCreate(dbPayload);

    // 3. Generate PNGs
    // (Note: qrcode library does not natively write text inside the PNG image itself without 'canvas'.
    // The PNG is named as the label and generated cleanly. The text is added under it in the PDF.)
    for (const t of ticketsData) {
      const filePath = path.join(outDir, `${t.label}.png`);
      await QRCode.toFile(filePath, t.qr_id, {
        width: 300,
        margin: 2
      });
      console.log(`✓ PNG saved: ${t.label}.png`);
    }

    // 4. Generate PDF
    const pdfPath = path.join(outDir, 'all-tickets.pdf');
    const doc = new PDFDocument({ size: 'A4' });
    const pdfStream = fs.createWriteStream(pdfPath);
    doc.pipe(pdfStream);

    // A4 dimensions in points: 595.28 x 841.89
    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;
    
    // 2x2 Grid Configuration
    const marginX = 50;
    const marginY = 50;
    const colWidth = (A4_WIDTH - marginX * 2) / 2;
    const rowHeight = (A4_HEIGHT - marginY * 2) / 2;
    const qrSize = 200;

    ticketsData.forEach((t, index) => {
      if (index > 0 && index % 4 === 0) {
        doc.addPage();
      }

      const pageIndex = index % 4;
      const col = pageIndex % 2;
      const row = Math.floor(pageIndex / 2);

      // Calculate placement
      const x = marginX + (col * colWidth) + (colWidth - qrSize) / 2;
      const y = marginY + (row * rowHeight) + (rowHeight - qrSize) / 2 - 20;

      const pngPath = path.join(outDir, `${t.label}.png`);
      
      // Draw QR Code
      doc.image(pngPath, x, y, { width: qrSize, height: qrSize });
      
      // Draw Label below the QR Code
      doc.fontSize(16).text(t.label, x, y + qrSize + 10, {
        width: qrSize,
        align: 'center'
      });
    });

    doc.end();

    await new Promise((resolve) => {
      pdfStream.on('finish', resolve);
    });

    console.log(`✓ PDF saved: all-tickets.pdf`);
    console.log(`✓ Done. ${count} tickets inserted.`);

    await sequelize.close();
    process.exit(0);

  } catch (err) {
    console.error('Error generating QR codes:', err);
    process.exit(1);
  }
}

generateQRCodes();
