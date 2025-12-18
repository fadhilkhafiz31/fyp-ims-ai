const PDFDocument = require("pdfkit");

exports.generateReceiptPdf = (order) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", (err) => reject(err));

    // --- 1. HEADER (SHOP NAME) ---
    doc.fontSize(20).text(order.storeName || "SmartStock POS", { align: "center" });
    doc.fontSize(10).text("Official Receipt", { align: "center" });
    doc.moveDown();

    // --- 2. ORDER DETAILS ---
    doc.fontSize(10).text(`Receipt #: ${order.id}`, { align: "left" });
    doc.text(`Date: ${new Date().toLocaleString()}`, { align: "left" });
    doc.moveDown();

    // --- 3. PRODUCT DETAILS ---
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
      doc.text(item.price.toFixed(2), 350, y);
      doc.text((item.price * item.qty).toFixed(2), 450, y, { align: "right" });
      y += 15;
    });

    // --- 4. AMOUNT TOTAL ---
    doc.moveDown();
    doc.moveTo(50, y + 10).lineTo(550, y + 10).stroke();
    y += 25;

    doc.fontSize(14).font("Helvetica-Bold");
    doc.text(`TOTAL: RM ${order.totalAmount.toFixed(2)}`, 50, y, { align: "right" });
    doc.moveDown(2);

    // --- 5. REDEMPTION CODE (Syncs with Redeem Page) ---
    // We draw a box to highlight the code
    const codeY = doc.y + 10;
    doc.rect(150, codeY, 300, 80).fillAndStroke("#f0fdf4", "#166534");
    doc.fillColor("black");

    doc.fontSize(10).text("YOUR REDEMPTION CODE", 150, codeY + 15, { align: "center" });

    // BIG CODE
    doc.fontSize(22).font("Courier-Bold").fillColor("#166534");
    doc.text(order.id, 150, codeY + 35, { align: "center" }); // The ID is the code

    doc.fontSize(9).font("Helvetica").fillColor("gray");
    doc.text(`Use this code to claim points!`, 150, codeY + 60, { align: "center" });

    doc.end();
  });
};

