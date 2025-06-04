require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const app = express();
const PORT = process.env.PORT || 3000;

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public")); // Important!

function escapeHTML(input) {
  return String(input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function successMessage() {
  return `
    <div style="
      padding: 30px;
      background: #e6ffed;
      border: 1px solid #b2dfdb;
      border-radius: 12px;
      text-align: center;
      font-family: 'Segoe UI', 'Poppins', sans-serif;
      color: #2e7d32;
      max-width: 600px;
      margin: 50px auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    ">
      <h2 style="font-size: 26px; margin-bottom: 15px;">✅ Order Placed Successfully!</h2>
      <p style="font-size: 16px; color: #388e3c; margin-bottom: 25px;">
        We've received your order. A confirmation has been sent to your email.
      </p>
      <a href="/" style="
        display: inline-block;
        padding: 10px 20px;
        background-color: #2e7d32;
        color: #fff;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 500;
        transition: background-color 0.3s ease;
      " onmouseover="this.style.backgroundColor='#1b5e20'" onmouseout="this.style.backgroundColor='#2e7d32'">
        ⬅️ Back to Home
      </a>
    </div>
  `;
}

app.post("/send-order", async (req, res) => {
  const { name, phone, email, address, orderHTML } = req.body;

  if (!name || !phone || !email || !address) {
    return res.status(400).send("Missing fields.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });

  const htmlBody = `
  <div style="font-family: 'Segoe UI', 'Poppins', sans-serif; color: #333; background-color: #f4fdf1; padding: 30px; max-width: 700px; margin: auto; border-radius: 10px; border: 1px solid #d0e6d1;">
    <h2 style="color: #2e7d32; border-bottom: 2px solid #66bb6a; padding-bottom: 10px; margin-bottom: 20px;">🛒 New Order Received</h2>
    
    <div style="margin-bottom: 25px;">
      <h3 style="color: #388e3c; font-size: 20px;">👤 Customer Details</h3>
      <p><strong>Name:</strong> ${escapeHTML(name)}</p>
      <p><strong>Phone:</strong> ${escapeHTML(phone)}</p>
      <p><strong>Email:</strong> <a href="mailto:${escapeHTML(
        email
      )}" style="color: #2e7d32;">${escapeHTML(email)}</a></p>
      <p><strong>Address:</strong><br>${escapeHTML(address).replace(
        /\n/g,
        "<br>"
      )}</p>
    </div>

    <div>
      <h3 style="color: #388e3c; font-size: 20px; margin-bottom: 10px;">📦 Order Summary</h3>
      ${orderHTML || "<p>No cart items found.</p>"}
    </div>

    <div style="margin-top: 30px; text-align: center;">
      <p style="font-size: 14px; color: #777;">This order was submitted from your website. Please process it accordingly.</p>
    </div>
  </div>
`;

  const mailOptions = {
    from: `"Order Bot" <${GMAIL_USER}>`,
    to: GMAIL_USER,
    subject: "New Order Received",
    html: htmlBody,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.send(successMessage());
  } catch (err) {
    console.error("Mail error:", err);
    res.status(500).send("Email sending failed.");
  }
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
