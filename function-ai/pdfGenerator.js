const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

exports.generateReceiptPdf = (order) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", (err) => reject(err));

    // --- 1. HEADER (LOGO) ---
    try {
      // Try to load the logo image
      const logoPath = path.join(__dirname, "99speedmart-logo.png");
      if (fs.existsSync(logoPath)) {
        // Add logo image centered
        const logoWidth = 120;
        const logoHeight = 60;
        const pageWidth = doc.page.width;
        const logoX = (pageWidth - logoWidth) / 2;
        
        doc.image(logoPath, logoX, doc.y, {
          width: logoWidth,
          height: logoHeight
        });
        doc.moveDown(4); // Move down to account for logo height
      } else {
        // Fallback to text if logo not found
        doc.fontSize(24).text("99 SPEEDMART", { align: "center" });
        doc.moveDown();
      }
    } catch (error) {
      console.error("Error loading logo:", error);
      // Fallback to text if logo fails to load
      doc.fontSize(24).text("99 SPEEDMART", { align: "center" });
      doc.moveDown();
    }

    doc.fontSize(12).text(order.storeName || "Store Location", { align: "center" });
    doc.fontSize(10).text("Official Receipt", { align: "center" });
    doc.fontSize(8).text("Thank you for shopping with us!", { align: "center" });
    doc.moveDown();

    // --- 2. STORE INFO ---
    doc.fontSize(8).text("Address: 123 Main Street, City", { align: "center" });
    doc.text("Phone: +60 12-345-6789 | Email: store@99speedmart.com", { align: "center" });
    doc.moveDown();

    // --- 3. ORDER DETAILS ---
    doc.fontSize(10).text(`Receipt #: ${order.id}`, { align: "left" });
    doc.text(`Date: ${new Date().toLocaleString()}`, { align: "left" });
    doc.text(`Cashier: System | Terminal: POS-01`, { align: "left" });
    doc.moveDown();

    // --- 4. PRODUCT DETAILS ---
    const tableTop = doc.y;
    doc.font("Helvetica-Bold");
    doc.text("Item", 50, tableTop);
    doc.text("Qty", 280, tableTop);
    doc.text("Price", 350, tableTop);
    doc.text("Total", 450, tableTop, { align: "right" });
    doc.font("Helvetica");
    doc.moveDown();

    // Line separator
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    let y = doc.y;
    order.items.forEach((item) => {
      doc.text(item.name.substring(0, 30), 50, y);
      doc.text(item.qty.toString(), 280, y);
      doc.text(`RM ${item.price.toFixed(2)}`, 350, y);
      doc.text(`RM ${(item.price * item.qty).toFixed(2)}`, 450, y, { align: "right" });
      y += 15;
    });

    // --- 5. TOTALS SECTION ---
    doc.moveDown();
    doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();
    y += 25;

    const subtotal = order.totalAmount;
    const tax = subtotal * 0.06; // 6% GST
    const grandTotal = subtotal + tax;

    doc.fontSize(10);
    doc.text(`Subtotal: RM ${subtotal.toFixed(2)}`, 450, y, { align: "right" });
    y += 15;
    doc.text(`GST (6%): RM ${tax.toFixed(2)}`, 450, y, { align: "right" });
    y += 15;

    doc.fontSize(14).font("Helvetica-Bold");
    doc.text(`TOTAL: RM ${grandTotal.toFixed(2)}`, 450, y, { align: "right" });
    doc.moveDown(2);

    // --- 6. LOYALTY POINTS SECTION ---
    const codeY = doc.y + 10;
    const pageWidth = doc.page.width;
    const boxWidth = 400;
    const boxX = (pageWidth - boxWidth) / 2; // Center the box
    
    doc.rect(boxX, codeY, boxWidth, 80).fillAndStroke("#fff3cd", "#856404");
    doc.fillColor("black");

    // Remove emoji and use text instead since PDFs don't always support emojis
    doc.fontSize(14).font("Helvetica-Bold").text("LOYALTY POINTS EARNED!", boxX, codeY + 10, { 
      width: boxWidth, 
      align: "center" 
    });
    doc.fontSize(12).text(`You earned ${Math.floor(order.totalAmount)} points! (RM1 = 1 Point)`, boxX, codeY + 30, { 
      width: boxWidth, 
      align: "center" 
    });
    
    // Generate shorter code (8 characters)
    const shortCode = order.id.substring(0, 8).toUpperCase();
    doc.fontSize(10).font("Helvetica").text("REDEMPTION CODE:", boxX, codeY + 50, { 
      width: boxWidth, 
      align: "center" 
    });
    doc.fontSize(20).font("Courier-Bold").fillColor("#856404");
    doc.text(shortCode, boxX, codeY + 65, { 
      width: boxWidth, 
      align: "center" 
    });

    // --- 7. FOOTER ---
    doc.moveDown(3);
    doc.fontSize(8).fillColor("gray");
    doc.text("Terms & Conditions:", { align: "center" });
    doc.text("• Points expire after 12 months • One redemption per receipt", { align: "center" });
    doc.text("• Visit www.99speedmart.com for more info", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).fillColor("black");
    doc.text("Thank you for your business! Come again soon!", { align: "center" });

    doc.end();
  });
};

