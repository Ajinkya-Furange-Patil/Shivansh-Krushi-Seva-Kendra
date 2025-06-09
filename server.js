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
      email: user.email, // <-- Add this line
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
} // ✅ FIXED: Function to extract and save order items from HTML

async function saveOrderItems(connection, orderId, orderHTML) {
  try {
    console.log("🔍 Extracting order items from HTML for order:", orderId);

    // Updated regex to match the cart HTML structure
    const itemRegex =
      /<tr>\s*<td>([^<]+)<\/td>\s*<td>(\d+)<\/td>\s*<td>₹(\d+)<\/td>\s*<\/tr>/g;
    let match;
    const items = [];

    while ((match = itemRegex.exec(orderHTML)) !== null) {
      const productName = match[1].trim();
      const quantity = parseInt(match[2]);
      const price = parseInt(match[3]);

      items.push({
        name: productName,
        quantity: quantity,
        price: price,
      });
    }

    console.log("📦 Extracted items:", items);

    // Save each item
    for (const item of items) {
      // Find product by name
      const [productRows] = await connection.execute(
        "SELECT id, price FROM products WHERE title LIKE ?",
        [`%${item.name}%`]
      );

      if (productRows.length > 0) {
        const product_id = productRows[0].id;
        const actual_price = productRows[0].price;

        // Insert into order_items
        await connection.execute(
          "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
          [orderId, product_id, item.quantity, actual_price]
        );

        console.log(`✅ Saved order item: ${item.name} x${item.quantity}`);

        // Update product stock
        await connection.execute(
          "UPDATE products SET quantity = quantity - ? WHERE id = ?",
          [item.quantity, product_id]
        );

        console.log(`✅ Updated stock for product ID ${product_id}`);
      } else {
        console.log(`⚠️ Product not found in database: "${item.name}"`);
      }
    }
  } catch (error) {
    console.error("❌ Error saving order items:", error);
    throw error;
  }
}
app.get("/api/orders", async (req, res) => {
  try {
    console.log("🔥 GET /api/orders hit");

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
        COALESCE(
          GROUP_CONCAT(
            DISTINCT CONCAT(p.title, ' (Qty: ', oi.quantity, ', Price: ₹', oi.price, ')')
            ORDER BY p.title 
            SEPARATOR ', '
          ),
          'No items found'
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

    // Add a check to see if any orders have empty product_details
    const ordersWithoutItems = rows.filter(
      (order) => order.product_details === "No items found"
    );
    if (ordersWithoutItems.length > 0) {
      console.log(
        "⚠️ Found orders without items:",
        ordersWithoutItems.map((o) => o.order_id)
      );
    }

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching orders:", err.message);
    res.status(500).json({ message: "Database error", error: err.message });
  }
});

// ✅ GET single order details (your existing code)
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

// ✅ NEW: Update order status endpoint (MISSING FROM YOUR CODE)
app.put("/api/orders/:id/status", async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    // Validate status
    const validStatuses = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be one of: " + validStatuses.join(", "),
      });
    }

    console.log(`🔄 Updating order ${orderId} status to: ${status}`);

    const [result] = await db.execute(
      "UPDATE orders SET status = ? WHERE id = ?",
      [status, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    console.log(`✅ Order ${orderId} status updated to: ${status}`);

    res.json({
      message: "Order status updated successfully",
      order_id: orderId,
      new_status: status,
    });
  } catch (err) {
    console.error("❌ Error updating order status:", err.message);
    res.status(500).json({ message: "Database error", error: err.message });
  }
});
// In your server3.js
app.put("/api/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const { title, description, price, quantity, image_url } = req.body;

    // Validation
    if (!title && !description && !price && !quantity && !image_url) {
      return res.status(400).json({
        success: false,
        message: "At least one field to update is required",
      });
    }

    // Build dynamic update query
    let updateFields = [];
    let values = [];

    if (title) {
      updateFields.push("title = ?");
      values.push(title);
    }
    if (description) {
      updateFields.push("description = ?");
      values.push(description);
    }
    if (price) {
      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid positive number",
        });
      }
      updateFields.push("price = ?");
      values.push(price);
    }
    if (quantity) {
      if (!Number.isInteger(Number(quantity)) || quantity < 0) {
        return res.status(400).json({
          success: false,
          message: "Quantity must be a valid positive integer",
        });
      }
      updateFields.push("quantity = ?");
      values.push(quantity);
    }
    if (image_url) {
      updateFields.push("image_url = ?");
      values.push(image_url);
    }

    // Add product ID to values array
    values.push(productId);

    const query = `
      UPDATE products 
      SET ${updateFields.join(", ")},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    console.log("🔄 Updating product:", productId);
    console.log("📝 Update query:", query);
    console.log("📦 Values:", values);

    const [result] = await db.execute(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Fetch updated product
    const [updatedProduct] = await db.execute(
      "SELECT * FROM products WHERE id = ?",
      [productId]
    );

    console.log("✅ Product updated successfully");

    res.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct[0],
    });
  } catch (err) {
    console.error("❌ Error updating product:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});
// ✅ FIXED: Create order via API (your existing code - no changes needed)
app.post("/api/orders", async (req, res) => {
  const connection = await db.getConnection();

  try {
    console.log("🔥 POST /api/orders hit");
    console.log("📦 Request body:", req.body);

    const { user_id, phone, address, items } = req.body;

    // Validate required fields
    if (
      !user_id ||
      !phone ||
      !address ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          "Missing required fields: user_id, phone, address, and items array",
      });
    }

    await connection.beginTransaction();

    // Calculate totals
    let total_amount = 0;
    let total_quantity = 0;

    // Validate products and calculate totals
    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        await connection.rollback();
        return res.status(400).json({
          message: "Each item must have valid product_id and quantity",
        });
      }

      // Get product details and validate stock
      const [productRows] = await connection.query(
        "SELECT id, title, price, quantity FROM products WHERE id = ?",
        [item.product_id]
      );

      if (productRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          message: `Product with ID ${item.product_id} not found`,
        });
      }

      const product = productRows[0];

      // Check stock availability
      if (product.quantity < item.quantity) {
        await connection.rollback();
        return res.status(400).json({
          message: `Insufficient stock for ${product.title}. Available: ${product.quantity}, Requested: ${item.quantity}`,
        });
      }

      total_amount += product.price * item.quantity;
      total_quantity += item.quantity;
    }

    // Create the order
    const [orderResult] = await connection.query(
      `
      INSERT INTO orders (user_id, phone, address, total_quantity, total_amount, status) 
      VALUES (?, ?, ?, ?, ?, 'pending')
    `,
      [user_id, phone, address, total_quantity, total_amount]
    );

    const order_id = orderResult.insertId;
    console.log("✅ Order created with ID:", order_id);

    // Insert order items and update product quantities
    for (const item of items) {
      // Get current product price
      const [productRows] = await connection.query(
        "SELECT price FROM products WHERE id = ?",
        [item.product_id]
      );
      const product_price = productRows[0].price;

      // Insert order item
      await connection.query(
        `
        INSERT INTO order_items (order_id, product_id, quantity, price) 
        VALUES (?, ?, ?, ?)
      `,
        [order_id, item.product_id, item.quantity, product_price]
      );

      // Update product quantity (reduce stock)
      await connection.query(
        `
        UPDATE products 
        SET quantity = quantity - ? 
        WHERE id = ?
      `,
        [item.quantity, item.product_id]
      );

      console.log(
        `✅ Added item: Product ${item.product_id}, Qty: ${item.quantity}`
      );
    }

    // Create notification for admin (assuming admin_id = 1)
    const notification_message = `New order #${order_id} placed by user ${user_id}`;
    await connection.query(
      `
      INSERT INTO notifications (admin_id, order_id, message) 
      VALUES (1, ?, ?)
    `,
      [order_id, notification_message]
    );

    await connection.commit();
    res.send(successMessage());
    console.log("🎉 Order transaction completed successfully");
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error creating order:", err.message);
    res.status(500).json({
      message: "Failed to create order",
      error: err.message,
    });
  } finally {
    connection.release();
  }
});

app.post("/send-order", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { name, phone, email, address, orderHTML } = req.body;

    if (!name || !phone || !email || !address) {
      return res.status(400).json({
        message: "Missing required fields: name, phone, email, address",
      });
    }

    console.log("🔥 Processing order from website form");

    await connection.beginTransaction();

    // 1️⃣ Extract quantity and total amount
    const totalRegex = /<strong>₹(\d+)<\/strong>/;
    const match = orderHTML.match(totalRegex);
    const total_amount = match ? parseFloat(match[1]) : 0;

    const quantityRegex = /<td>(\d+)<\/td>/g;
    const quantities = [...orderHTML.matchAll(quantityRegex)].map((q) =>
      parseInt(q[1])
    );
    const total_quantity = quantities
      .slice(0, -1)
      .reduce((sum, q) => sum + q, 0);

    // 2️⃣ Get or create user
    const [userRows] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    let user_id = null;
    if (userRows.length > 0) {
      user_id = userRows[0].id;
      console.log("✅ Found existing user ID:", user_id);
    } else {
      console.log("⚠️ User not found, creating new user...");
      const [newUserResult] = await connection.execute(
        "INSERT INTO users (full_name, email, phone, address, role, password) VALUES (?, ?, ?, ?, ?, ?)",
        [name, email, phone, address, "customer", "temp_password_" + Date.now()]
      );
      user_id = newUserResult.insertId;
      console.log("✅ Created new user with ID:", user_id);
    }

    // 3️⃣ Create the order
    const [orderResult] = await connection.execute(
      "INSERT INTO orders (user_id, total_amount, total_quantity, phone, address, status) VALUES (?, ?, ?, ?, ?, ?)",
      [user_id, total_amount, total_quantity, phone, address, "pending"]
    );

    const order_id = orderResult.insertId;
    console.log("✅ Order created with ID:", order_id);

    // 4️⃣ Extract and save order items from HTML
    await saveOrderItems(connection, order_id, orderHTML);

    // 5️⃣ Create notification
    const notification_message = `New order #${order_id} placed by ${name}`;
    await connection.query(
      "INSERT INTO notifications (admin_id, order_id, message) VALUES (1, ?, ?)",
      [order_id, notification_message]
    );

    await connection.commit();

    // 6️⃣ Send Emails
    try {
      await sendOrderEmails(order_id, name, phone, email, address, orderHTML);
      console.log("📨 Emails sent successfully!");
    } catch (emailErr) {
      console.error("📧 Email sending failed:", emailErr);
      // Still proceed, email error shouldn't rollback order creation
    }

    // res.status(200).json({
    //   message: "Order placed successfully!",
    //   order_id,
    // });
    res.send(successMessage());
  } catch (err) {
    await connection.rollback();
    console.error("❌ Error processing order:", err);
    res.status(500).json({
      message: "Failed to create order",
      error: err.message,
    });
  } finally {
    connection.release();
  }
});

async function saveOrderItems(connection, orderId, orderHTML) {
  try {
    console.log("🔍 Extracting order items from HTML for order:", orderId);

    const itemRegex =
      /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>₹(\d+(?:\.\d{2})?)<\/td>\s*<\/tr>/g;

    let match;
    const items = [];

    while ((match = itemRegex.exec(orderHTML)) !== null) {
      const productName = match[1].trim();
      const quantity = parseInt(match[2]);
      const price = parseFloat(match[3]);
      items.push({
        name: productName,
        quantity: quantity,
        price: price,
      });
    }

    console.log("📦 Extracted items:", items);

    for (const item of items) {
      const [productRows] = await connection.execute(
        "SELECT id, price FROM products WHERE title LIKE ?",
        [`%${item.name}%`]
      );

      if (productRows.length > 0) {
        const product_id = productRows[0].id;
        const actual_price = productRows[0].price;

        await connection.execute(
          "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
          [orderId, product_id, item.quantity, actual_price]
        );

        await connection.execute(
          "UPDATE products SET quantity = quantity - ? WHERE id = ?",
          [item.quantity, product_id]
        );

        console.log(`✅ Saved order item: ${item.name} x${item.quantity}`);
      } else {
        console.log(`⚠️ Product not found in database: "${item.name}"`);
      }
    }
  } catch (error) {
    console.error("❌ Error saving order items:", error);
    throw error;
  }
}
// ✅ Helper function to send order emails
async function sendOrderEmails(
  orderId,
  name,
  phone,
  email,
  address,
  orderHTML
) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
  });

  const adminHtmlBody = `
    <div style="font-family: 'Segoe UI', 'Poppins', sans-serif; color: #333; background-color: #f4fdf1; padding: 30px; max-width: 700px; margin: auto; border-radius: 10px; border: 1px solid #d0e6d1;">
      <h2 style="color: #2e7d32; border-bottom: 2px solid #66bb6a; padding-bottom: 10px; margin-bottom: 20px;">🛒 New Order Received</h2>
      <div style="margin-bottom: 25px;">
        <h3 style="color: #388e3c; font-size: 20px;">👤 Customer Details</h3>
        <p><strong>Order ID:</strong> #${orderId}</p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #2e7d32;">${email}</a></p>
        <p><strong>Address:</strong><br>${address.replace(/\n/g, "<br>")}</p>
      </div>
      <div>
        <h3 style="color: #388e3c; font-size: 20px; margin-bottom: 10px;">📦 Order Summary</h3>
        ${orderHTML || "<p>No cart items found.</p>"}
      </div>
    </div>
  `;

  const userHtmlBody = `
    <div style="font-family: 'Segoe UI', 'Poppins', sans-serif; color: #333; background-color: #e8f5e9; padding: 30px; max-width: 700px; margin: auto; border-radius: 10px; border: 1px solid #c8e6c9;">
      <h2 style="color: #2e7d32;">🎉 Thank You for Your Order, ${name}!</h2>
      <p>We're happy to confirm your order <strong>#${orderId}</strong>. Here's a quick summary:</p>
      <h3 style="color: #388e3c;">📦 Order Summary</h3>
      ${orderHTML || "<p>No cart items found.</p>"}
      <p style="margin-top: 20px;">We'll reach out to you shortly at <strong>${phone}</strong> or <a href="mailto:${email}">${email}</a></p>
    </div>
  `;

  await Promise.all([
    transporter.sendMail({
      from: `"Order Bot" <${process.env.GMAIL_USER}>`,
      to: `${process.env.GMAIL_USER}, ${process.env.ADMIN_EMAIL_2}`,
      subject: `New Order #${orderId} Received`,
      html: adminHtmlBody,
    }),
    transporter.sendMail({
      from: `"Shivansh Krushi Seva Kendra" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `🛍️ Order Confirmation #${orderId}`,
      html: userHtmlBody,
    }),
  ]);
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
});
// Example user-orders endpoint
app.get("/user-orders", async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.json({ success: false, message: "Email is required" });
  }

  try {
    console.log("Fetching orders for email:", email);

    // 1. Get user_id from email
    const [userRows] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    if (userRows.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const userId = userRows[0].id;

    // 2. Get orders for user_id
    const [orders] = await db.query(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    // 3. Get order items for each order
    for (let order of orders) {
      const [items] = await db.query(
        `SELECT oi.*, p.title AS product_name, p.image_url AS product_image 
         FROM order_items oi 
         JOIN products p ON oi.product_id = p.id 
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    console.log("Orders found:", orders);

    res.json({ success: true, orders });
  } catch (err) {
    console.error("🔥 Error loading user orders:", err);
    res.json({ success: false, message: "Server error" });
  }
});

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
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
