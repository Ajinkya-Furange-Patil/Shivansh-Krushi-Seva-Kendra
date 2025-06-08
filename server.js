require("dotenv").config();
const express = require("express");
const db = require("./db"); // ← your pool
const nodemailer = require("nodemailer");
const ADMIN_EMAIL_2 = process.env.ADMIN_EMAIL_2; // Replace with your 2nd admin email
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const cors = require("cors");
const router = express.Router();
const path = require("path");
const saltRounds = 10;
const session = require("express-session");
const bcrypt = require("bcrypt");
// const bodyParser = require("body-parser");
const mysql = require("mysql2");
const app = express();
const PORT = 3000;
app.use(cors()); // Add this if frontend is served from another port (like 5500)

app.use(express.static("public"));
// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 86400000 }, // 1 day
  })
);
// ✅ FIXED: Delete Product with proper async/await
app.delete("/api/products/:id", async (req, res) => {
  const productId = req.params.id;
  const sql = "DELETE FROM products WHERE id = ?";

  console.log(`🔥 DELETE request for product ID: ${productId}`);

  try {
    const [result] = await db.execute(sql, [productId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.log(`✅ Product with ID ${productId} deleted.`);
    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({
      success: false,
      message: "Database error during delete: " + err.message,
    });
  }
});
function isAdmin(req, res, next) {
  if (req.session?.user?.role === "admin") {
    return next();
  } else {
    return res.status(403).send("Access denied.");
  }
}

app.use("/admin", isAdmin, express.static(__dirname + "/public/admin"));
app.use(express.urlencoded({ extended: true }));
// Serve account.html directly
app.get("/account", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "account.html"));
});
// ✨ SIGNUP
app.post("/signup", async (req, res) => {
  const { full_name, email, password, phone, role, address } = req.body;
  console.log("🔥 Signup request received:", {
    full_name,
    email,
    phone,
    role,
  });
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const checkEmailQuery = "SELECT * FROM users WHERE email = ?";
    db.query(checkEmailQuery, [email], (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });

      if (results.length > 0) {
        return res.json({ message: "❌ Email already registered!" });
      }
      const insertQuery = `
  INSERT INTO users (full_name, email, password, phone, address, role)
  VALUES (?, ?, ?, ?, ?, ?)
`;

      db.query(
        insertQuery,
        [full_name, email, hashedPassword, phone, address, role],

        (err) => {
          if (err)
            return res.status(500).json({ message: "Error creating user" });

          res.json({ message: "✅ Signup successful! You can now log in." });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: "Signup failed" });
  }
});

// ✨ LOGIN

app.post("/login", async (req, res) => {
  const { username, password } = req.body; // but here username = email

  try {
    // Query user by email
    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [
      username,
    ]);

    if (rows.length === 0) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    const user = rows[0];

    // Verify password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid email or password" });
    }

    // Login success, send user info except password
    res.json({
      success: true,
      username: user.full_name,
      role: user.role,
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error during login" });
  }
});

// ✨ LOGOUT
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "✅ Logged out successfully" });
  });
});

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
      max-width: 700px;
      margin: 50px auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.07);
    ">
      <h2 style="font-size: 28px; margin-bottom: 15px;">✅ Your Order Has Been Successfully Placed!</h2>
      
      <p style="font-size: 16px; color: #2e7d32; margin-bottom: 20px;">
        Thank you for your purchase! We’ve received your order details and sent a confirmation email to your provided address.
      </p>
      
      <p style="font-size: 15px; color: #4caf50; margin-bottom: 15px;">
        📩 <strong>Check your inbox</strong> for order details. If you don’t see it within a few minutes, please check your <strong>Spam or Promotions</strong> folder too.
      </p>
      
      <p style="font-size: 14px; color: #666; margin-bottom: 30px;">
        If the email is in spam, mark it as "Not Spam" to ensure you receive future updates smoothly.
      </p>
      
      <a href="/" style="
        display: inline-block;
        padding: 12px 24px;
        background-color: #2e7d32;
        color: #fff;
        text-decoration: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 15px;
        transition: background-color 0.3s ease;
      " onmouseover="this.style.backgroundColor='#1b5e20'" onmouseout="this.style.backgroundColor='#2e7d32'">
        ⬅️ Back to Home
      </a>
    </div>
  `;
}

// app.post("/send-order", async (req, res) => {
//   const { name, phone, email, address, orderHTML } = req.body;

//   if (!name || !phone || !email || !address) {
//     return res.status(400).send("Missing fields.");
//   }

//   // 1️⃣ Extract quantity and total amount
//   const totalRegex = /<strong>₹(\d+)<\/strong>/;
//   const match = orderHTML.match(totalRegex);
//   const total_amount = match ? parseFloat(match[1]) : 0;

//   const quantityRegex = /<td>(\d+)<\/td>/g;
//   const quantities = [...orderHTML.matchAll(quantityRegex)].map((q) =>
//     parseInt(q[1])
//   );
//   const total_quantity = quantities.slice(0, -1).reduce((sum, q) => sum + q, 0);

//   // 2️⃣ Save to MySQL
//   try {
//     const [result] = await db.execute(
//       "INSERT INTO orders (user_id, total_amount, total_quantity, phone, address, status) VALUES (?, ?, ?, ?, ?, ?)",
//       [null, total_amount, total_quantity, phone, address, "pending"]
//     );

//     console.log("✅ Order stored in DB with ID:", result.insertId);

//     // 3️⃣ Send Emails
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: { user: GMAIL_USER, pass: GMAIL_PASS },
//     });

//     // HTML email to send to you (admin)
//     const adminHtmlBody = `
//     <div style="font-family: 'Segoe UI', 'Poppins', sans-serif; color: #333; background-color: #f4fdf1; padding: 30px; max-width: 700px; margin: auto; border-radius: 10px; border: 1px solid #d0e6d1;">
//       <h2 style="color: #2e7d32; border-bottom: 2px solid #66bb6a; padding-bottom: 10px; margin-bottom: 20px;">🛒 New Order Received</h2>
//       <div style="margin-bottom: 25px;">
//         <h3 style="color: #388e3c; font-size: 20px;">👤 Customer Details</h3>
//         <p><strong>Name:</strong> ${escapeHTML(name)}</p>
//         <p><strong>Phone:</strong> ${escapeHTML(phone)}</p>
//         <p><strong>Email:</strong> <a href="mailto:${escapeHTML(
//           email
//         )}" style="color: #2e7d32;">${escapeHTML(email)}</a></p>
//         <p><strong>Address:</strong><br>${escapeHTML(address).replace(
//           /\n/g,
//           "<br>"
//         )}</p>
//       </div>
//       <div>
//         <h3 style="color: #388e3c; font-size: 20px; margin-bottom: 10px;">📦 Order Summary</h3>
//         ${orderHTML || "<p>No cart items found.</p>"}
//       </div>
//       <div style="margin-top: 30px; text-align: center;">
//         <p style="font-size: 14px; color: #777;">This order was submitted from your website. Please process it accordingly.</p>
//       </div>
//     </div>
//   `;

//     // HTML email to send to user
//     const userHtmlBody = `
//     <div style="font-family: 'Segoe UI', 'Poppins', sans-serif; color: #333; background-color: #e8f5e9; padding: 30px; max-width: 700px; margin: auto; border-radius: 10px; border: 1px solid #c8e6c9;">
//       <h2 style="color: #2e7d32;">🎉 Thank You for Your Order, ${escapeHTML(
//         name
//       )}!</h2>
//       <p>We're happy to confirm your order. Here's a quick summary:</p>
//       <h3 style="color: #388e3c;">📦 Order Summary</h3>
//       ${orderHTML || "<p>No cart items found.</p>"}
//       <p style="margin-top: 20px;">We'll reach out to you shortly at <strong>${escapeHTML(
//         phone
//       )}</strong> or <a href="mailto:${escapeHTML(email)}">${escapeHTML(
//       email
//     )}</a></p>
//       <p style="margin-top: 20px; font-size: 13px; color: #666;">If you have any questions, reply to this email.</p>
//     </div>
//   `;
//     const mailToAdmin = {
//       from: `"Order Bot" <${GMAIL_USER}>`,
//       to: `${GMAIL_USER}, ${ADMIN_EMAIL_2}`,
//       subject: "New Order Received",
//       html: adminHtmlBody,
//     };

//     const mailToUser = {
//       from: `"Shivansh Krushi Seva Kendra" <${GMAIL_USER}>`,
//       to: email,
//       subject: "🛍️ Order Confirmation",
//       html: userHtmlBody,
//     };

//     await Promise.all([
//       transporter.sendMail(mailToAdmin),
//       transporter.sendMail(mailToUser),
//     ]);

//     console.log("📨 Emails sent successfully!");

//     // res.redirect("/thank-you.html");
//     res.send(successMessage());
//   } catch (err) {
//     console.error("❌ Error processing order:", err);
//     res.status(500).send("Error processing order.");
//   }
// });

// ✅ SOLUTION 1: Get user_id from email and insert proper order
app.post("/send-order", async (req, res) => {
  const { name, phone, email, address, orderHTML } = req.body;

  if (!name || !phone || !email || !address) {
    return res.status(400).send("Missing fields.");
  }

  // 1️⃣ Extract quantity and total amount
  const totalRegex = /<strong>₹(\d+)<\/strong>/;
  const match = orderHTML.match(totalRegex);
  const total_amount = match ? parseFloat(match[1]) : 0;

  const quantityRegex = /<td>(\d+)<\/td>/g;
  const quantities = [...orderHTML.matchAll(quantityRegex)].map((q) =>
    parseInt(q[1])
  );
  const total_quantity = quantities.slice(0, -1).reduce((sum, q) => sum + q, 0);

  // 2️⃣ Save to MySQL
  try {
    // First, get the user_id from the email
    const [userRows] = await db.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    let user_id = null;
    if (userRows.length > 0) {
      user_id = userRows[0].id;
      console.log("✅ Found user ID:", user_id);
    } else {
      // If user doesn't exist, create a new user record
      console.log("⚠️ User not found, creating new user...");
      const [newUserResult] = await db.execute(
        "INSERT INTO users (full_name, email, phone, address, role, password) VALUES (?, ?, ?, ?, ?, ?)",
        [name, email, phone, address, "customer", "temp_password_" + Date.now()]
      );
      user_id = newUserResult.insertId;
      console.log("✅ Created new user with ID:", user_id);
    }

    // Now insert the order with proper user_id
    const [result] = await db.execute(
      "INSERT INTO orders (user_id, total_amount, total_quantity, phone, address, status) VALUES (?, ?, ?, ?, ?, ?)",
      [user_id, total_amount, total_quantity, phone, address, "pending"]
    );

    console.log("✅ Order stored in DB with ID:", result.insertId);

    // 3️⃣ Extract and save order items from orderHTML
    await saveOrderItems(result.insertId, orderHTML);

    // 4️⃣ Send Emails (same as before)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    // HTML email to send to you (admin)
    const adminHtmlBody = `
    <div style="font-family: 'Segoe UI', 'Poppins', sans-serif; color: #333; background-color: #f4fdf1; padding: 30px; max-width: 700px; margin: auto; border-radius: 10px; border: 1px solid #d0e6d1;">
      <h2 style="color: #2e7d32; border-bottom: 2px solid #66bb6a; padding-bottom: 10px; margin-bottom: 20px;">🛒 New Order Received</h2>
      <div style="margin-bottom: 25px;">
        <h3 style="color: #388e3c; font-size: 20px;">👤 Customer Details</h3>
        <p><strong>Order ID:</strong> #${result.insertId}</p>
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

    // HTML email to send to user
    const userHtmlBody = `
    <div style="font-family: 'Segoe UI', 'Poppins', sans-serif; color: #333; background-color: #e8f5e9; padding: 30px; max-width: 700px; margin: auto; border-radius: 10px; border: 1px solid #c8e6c9;">
      <h2 style="color: #2e7d32;">🎉 Thank You for Your Order, ${escapeHTML(
        name
      )}!</h2>
      <p>We're happy to confirm your order <strong>#${
        result.insertId
      }</strong>. Here's a quick summary:</p>
      <h3 style="color: #388e3c;">📦 Order Summary</h3>
      ${orderHTML || "<p>No cart items found.</p>"}
      <p style="margin-top: 20px;">We'll reach out to you shortly at <strong>${escapeHTML(
        phone
      )}</strong> or <a href="mailto:${escapeHTML(email)}">${escapeHTML(
      email
    )}</a></p>
      <p style="margin-top: 20px; font-size: 13px; color: #666;">If you have any questions, reply to this email.</p>
    </div>
  `;

    const mailToAdmin = {
      from: `"Order Bot" <${GMAIL_USER}>`,
      to: `${GMAIL_USER}, ${ADMIN_EMAIL_2}`,
      subject: `New Order #${result.insertId} Received`,
      html: adminHtmlBody,
    };

    const mailToUser = {
      from: `"Shivansh Krushi Seva Kendra" <${GMAIL_USER}>`,
      to: email,
      subject: `🛍️ Order Confirmation #${result.insertId}`,
      html: userHtmlBody,
    };

    await Promise.all([
      transporter.sendMail(mailToAdmin),
      transporter.sendMail(mailToUser),
    ]);

    console.log("📨 Emails sent successfully!");

    res.send(successMessage());
  } catch (err) {
    console.error("❌ Error processing order:", err);
    res.status(500).send("Error processing order: " + err.message);
  }
});

// ✅ Helper function to save order items
async function saveOrderItems(orderId, orderHTML) {
  try {
    // Extract product info from orderHTML
    // This regex looks for table rows with product data
    const productRowRegex =
      /<tr[^>]*>.*?<td[^>]*>([^<]+)<\/td>.*?<td[^>]*>₹([0-9.]+)<\/td>.*?<td[^>]*>([0-9]+)<\/td>.*?<\/tr>/g;

    let match;
    const orderItems = [];

    while ((match = productRowRegex.exec(orderHTML)) !== null) {
      const productTitle = match[1].trim();
      const price = parseFloat(match[2]);
      const quantity = parseInt(match[3]);

      // Skip if this is the total row or invalid data
      if (
        productTitle.toLowerCase().includes("total") ||
        !productTitle ||
        isNaN(price) ||
        isNaN(quantity)
      ) {
        continue;
      }

      // Find product ID by title
      const [productRows] = await db.execute(
        "SELECT id FROM products WHERE title LIKE ?",
        [`%${productTitle}%`]
      );

      if (productRows.length > 0) {
        orderItems.push({
          order_id: orderId,
          product_id: productRows[0].id,
          quantity: quantity,
          price: price,
        });
      }
    }

    // Insert all order items
    for (const item of orderItems) {
      await db.execute(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
        [item.order_id, item.product_id, item.quantity, item.price]
      );
    }

    console.log(
      `✅ Saved ${orderItems.length} order items for order ${orderId}`
    );
  } catch (err) {
    console.error("❌ Error saving order items:", err);
    // Don't throw error here as the main order is already saved
  }
}
app.get("/api/products", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM products");
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching products:", err.message);
    res.status(500).json({ message: "Database error" });
  }
});

app.get("/get-user-details", async (req, res) => {
  console.log("🔍 Fetching user details for:", req.query.username);
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    const [rows] = await db.execute(
      "SELECT full_name, email, phone, address FROM users WHERE email = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error fetching user details:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.post("/update-address", async (req, res) => {
  const { username, address } = req.body;

  if (!username || !address) {
    return res
      .status(400)
      .json({ message: "Username and address are required" });
  }

  try {
    await db.execute("UPDATE users SET address = ? WHERE email = ?", [
      address,
      username,
    ]);
    res.json({ success: true, message: "Address updated successfully!" });
  } catch (err) {
    console.error("❌ Error updating address:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}); // Add this route to your server
app.get("/user-orders", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email parameter required",
      });
    }

    // Replace with your actual database query
    const orders = await db.execute(
      `
     SELECT
    o.*,
    oi.product_id,
    oi.quantity,
    oi.price,
    p.title as product_name,
    p.image_url as product_image
FROM orders o
JOIN users u ON o.user_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE u.email = ?
ORDER BY o.created_at DESC;
      `,
      [email]
    );
    // LEFT JOIN orders o ON u.id = o.user_id

    // Group orders with their items
    const groupedOrders = {};
    orders.forEach((row) => {
      if (!groupedOrders[row.id]) {
        groupedOrders[row.id] = {
          id: row.id,
          created_at: row.created_at,
          status: row.status,
          total_amount: row.total_amount,
          total_quantity: row.total_quantity,
          phone: row.phone,
          address: row.address,
          items: [],
        };
      }

      if (row.product_id) {
        groupedOrders[row.id].items.push({
          product_name: row.product_name,
          quantity: row.quantity,
          price: row.price,
          product_image: row.product_image,
        });
      }
    });

    res.json({
      success: true,
      orders: Object.values(groupedOrders),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
});

// Add Product Route
// ✅ FIXED: Add Product with proper response

app.get("/user-orders", async (req, res) => {
  console.log("🔥 GET /user-orders hit");
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email parameter is required",
      });
    }

    // First, get the user ID from email
    const userQuery = "SELECT id FROM users WHERE email = ?";
    const userResult = await queryDatabase(userQuery, [email]);

    if (userResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userId = userResult[0].id;

    // Get all orders for this user with order items and product details
    const ordersQuery = `
      SELECT 
        o.id,
        o.user_id,
        o.phone,
        o.address,
        o.total_quantity,
        o.total_amount,
        o.status,
        o.created_at,
        oi.id as item_id,
        oi.product_id,
        oi.quantity as item_quantity,
        oi.price as item_price,
        p.title as product_name,
        p.image_url as product_image
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC, oi.id ASC
    `;

    const results = await queryDatabase(ordersQuery, [userId]);

    // Group the results by order ID
    const ordersMap = new Map();

    results.forEach((row) => {
      if (!ordersMap.has(row.id)) {
        ordersMap.set(row.id, {
          id: row.id,
          user_id: row.user_id,
          phone: row.phone,
          address: row.address,
          total_quantity: row.total_quantity,
          total_amount: row.total_amount,
          status: row.status,
          created_at: row.created_at,
          items: [],
        });
      }

      // Add item to order if it exists
      if (row.item_id) {
        ordersMap.get(row.id).items.push({
          id: row.item_id,
          product_id: row.product_id,
          quantity: row.item_quantity,
          price: row.item_price,
          product_name: row.product_name,
          product_image: row.product_image
            ? `images/${row.product_image}`
            : null,
        });
      }
    });

    // Convert map to array
    const orders = Array.from(ordersMap.values());

    res.json({
      success: true,
      message: "Orders fetched successfully",
      orders: orders,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Helper function to promisify database queries
function queryDatabase(query, params = []) {
  return new Promise((resolve, reject) => {
    db.query(query, params, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

// Alternative version if you prefer using callbacks instead of async/await
app.get("/user-orders-callback", (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email parameter is required",
    });
  }

  // First, get the user ID from email
  const userQuery = "SELECT id FROM users WHERE email = ?";

  db.query(userQuery, [email], (err, userResult) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({
        success: false,
        message: "Database error",
      });
    }

    if (userResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userId = userResult[0].id;

    // Get all orders for this user
    const ordersQuery = `
      SELECT 
        o.id,
        o.user_id,
        o.phone,
        o.address,
        o.total_quantity,
        o.total_amount,
        o.status,
        o.created_at,
        oi.id as item_id,
        oi.product_id,
        oi.quantity as item_quantity,
        oi.price as item_price,
        p.title as product_name,
        p.image_url as product_image
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC, oi.id ASC
    `;

    db.query(ordersQuery, [userId], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }

      // Group the results by order ID
      const ordersMap = new Map();

      results.forEach((row) => {
        if (!ordersMap.has(row.id)) {
          ordersMap.set(row.id, {
            id: row.id,
            user_id: row.user_id,
            phone: row.phone,
            address: row.address,
            total_quantity: row.total_quantity,
            total_amount: row.total_amount,
            status: row.status,
            created_at: row.created_at,
            items: [],
          });
        }

        // Add item to order if it exists
        if (row.item_id) {
          ordersMap.get(row.id).items.push({
            id: row.item_id,
            product_id: row.product_id,
            quantity: row.item_quantity,
            price: row.item_price,
            product_name: row.product_name,
            product_image: row.product_image
              ? `images/${row.product_image}`
              : null,
          });
        }
      });

      // Convert map to array
      const orders = Array.from(ordersMap.values());

      res.json({
        success: true,
        message: "Orders fetched successfully",
        orders: orders,
      });
    });
  });
});

app.post("/api/products", express.json(), async (req, res) => {
  console.log("🔥 POST /api/products hit", req.body);
  const { title, image_url, description, price, quantity } = req.body;

  // Validation
  if (!title || !price || !quantity) {
    return res
      .status(400)
      .json({ message: "Title, price, and quantity are required" });
  }

  const sql = `
    INSERT INTO products 
      (title, image_url, description, price, quantity)
    VALUES (?, ?, ?, ?, ?)
  `;

  try {
    const [result] = await db.execute(sql, [
      title,
      image_url,
      description,
      price,
      quantity,
    ]);
    console.log("✅ Product inserted with ID:", result.insertId);

    res.status(201).json({
      success: true,
      message: "Product added successfully",
      id: result.insertId,
    });
  } catch (err) {
    console.error("❌ DB insert error:", err);
    res.status(500).json({
      success: false,
      message: "Database error: " + err.message,
    });
  }
});

// This route fetches all orders with customer and product details.
// ✅ FIXED: View Orders API - Updated query to work with your current database structure
// ✅ UPDATED: Orders API with proper user and product information
app.get("/api/orders", async (req, res) => {
  try {
    console.log("🔥 GET /api/orders hit");

    // Updated query to get user info and product details
    const [rows] = await db.query(`
      SELECT 
        o.id AS order_id,
        u.full_name AS customer_name,
        u.email AS customer_email,
        o.phone AS customer_phone,
        o.address AS customer_address,
        o.total_amount,
        o.total_quantity,
        o.status,
        o.created_at,
        GROUP_CONCAT(
          DISTINCT CONCAT(p.title, ' (Qty: ', oi.quantity, ')')
          ORDER BY p.title 
          SEPARATOR ', '
        ) AS product_details
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      GROUP BY 
        o.id, u.full_name, u.email, o.phone, o.address, 
        o.total_amount, o.total_quantity, o.status, o.created_at
      ORDER BY o.created_at DESC
    `);

    console.log("🔍 Orders fetched:", rows.length);
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching orders:", err.message);
    res.status(500).json({ message: "Database error", error: err.message });
  }
});

// ✅ NEW: Get single order details
app.get("/api/orders/:id", async (req, res) => {
  try {
    const orderId = req.params.id;

    const [orderRows] = await db.query(
      `
      SELECT 
        o.*,
        u.full_name AS customer_name,
        u.email AS customer_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `,
      [orderId]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const [itemRows] = await db.query(
      `
      SELECT 
        oi.*,
        p.title AS product_title,
        p.image_url AS product_image
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `,
      [orderId]
    );

    const order = {
      ...orderRows[0],
      items: itemRows,
    };

    res.json(order);
  } catch (err) {
    console.error("❌ Error fetching order details:", err.message);
    res.status(500).json({ message: "Database error", error: err.message });
  }
});
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
