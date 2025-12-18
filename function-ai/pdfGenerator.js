const PDFDocument = require("pdfkit");

exports.generateReceiptPdf = (order) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", (err) => reject(err));

    // --- 1. HEADER (SHOP NAME) ---
    doc.fontSize(24).text("99 SPEEDMART", { align: "center" });
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
    doc.rect(100, codeY, 400, 120).fillAndStroke("#fff3cd", "#856404");
    doc.fillColor("black");

    doc.fontSize(14).font("Helvetica-Bold").text("🎁 LOYALTY POINTS EARNED!", 100, codeY + 15, { align: "center" });
    doc.fontSize(12).text(`You earned ${Math.floor(order.totalAmount)} points!`, 100, codeY + 35, { align: "center" });
    
    doc.fontSize(10).font("Helvetica").text("YOUR REDEMPTION CODE:", 100, codeY + 55, { align: "center" });

    // BIG CODE
    doc.fontSize(28).font("Courier-Bold").fillColor("#856404");
    doc.text(order.id, 100, codeY + 70, { align: "center" });

    doc.fontSize(9).font("Helvetica").fillColor("gray");
    doc.text(`Use this code in our app to redeem rewards!`, 100, codeY + 105, { align: "center" });

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

