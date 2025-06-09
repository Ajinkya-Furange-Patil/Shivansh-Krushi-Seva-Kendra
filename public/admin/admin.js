window.addEventListener("DOMContentLoaded", () => {
  const role = localStorage.getItem("role") || sessionStorage.getItem("role");
  const username =
    localStorage.getItem("username") || sessionStorage.getItem("username");

  // If not admin, redirect
  if (role !== "admin") {
    alert("🚫 Access Denied: Only Admins can view this page!");
    window.location.href = "/";
  }

  // Greet the admin
  console.log("👑 Welcome Admin:", username);
  document.getElementById("adminInfo").textContent = `Hello, ${username}`;

  // Hide all sections initially
  const sections = [
    "addProductSection",
    "ordersSection",
    "notificationsSection",
    "viewAllProductsSection",
    "editProductSection",
  ];

  let activeSection = null;

  function hideAllSections() {
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
  }

  function toggleSection(id, callback) {
    const section = document.getElementById(id);
    if (!section) return;

    if (activeSection === id) {
      section.style.display = "none";
      activeSection = null;
    } else {
      hideAllSections();
      section.style.display = "block";
      activeSection = id;
      if (callback) callback();
    }
  }

  // ✅ FIXED: Add Product with proper error handling and immediate feedback
  function addProduct() {
    const form = document.getElementById("addProductForm");
    if (!form || form.getAttribute("data-listener") === "true") return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Show loading state
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Adding Product...";
      submitBtn.disabled = true;

      const product = {
        title: form.title.value.trim(),
        image_url: form.image_url.value.trim(),
        description: form.description.value.trim(),
        price: parseFloat(form.price.value),
        quantity: parseInt(form.quantity.value),
      };

      try {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || `Server returned ${res.status}`);
        }

        // Success feedback
        alert(`✅ ${data.message}`);
        form.reset();

        // If view all products is active, refresh it
        if (activeSection === "viewAllProductsSection") {
          loadAllProducts();
        }
      } catch (err) {
        console.error("❌ Frontend caught error:", err);
        alert("❌ " + err.message);
      } finally {
        // Reset button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });

    form.setAttribute("data-listener", "true");
  }

  // ✅ FIXED: Load All Products with better error handling
  function loadAllProducts() {
    const tbody = document.getElementById("allProductsTableBody");
    tbody.innerHTML =
      '<tr><td colspan="8" class="text-center">🔄 Loading products...</td></tr>';

    fetch("/api/products")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((products) => {
        tbody.innerHTML = ""; // Clear loading message

        if (!products || products.length === 0) {
          tbody.innerHTML =
            '<tr><td colspan="8" class="text-center py-4">No products found.</td></tr>';
          return;
        }

        products.forEach((product) => {
          // ✅ FIX: Safely handle image_url
          // let imageUrl = "/images/logo.png"; // Default fallback
          let imageUrl = ""; // Default fallback

          if (product.image_url) {
            if (product.image_url.startsWith("/")) {
              imageUrl = product.image_url;
            } else if (product.image_url.startsWith("http")) {
              imageUrl = product.image_url;
            } else {
              imageUrl = "/images/" + product.image_url;
            }
          }

          const row = document.createElement("tr");
          row.innerHTML = `
          <td>${product.id}</td>
          <td>
            <img src="${imageUrl}"
                 alt="${product.title}"
                 width="50"
                 style="border-radius: 4px;"
                />
          </td>
          <td>${product.title}</td>
          <td>${product.description || "No description"}</td>
          <td>₹${product.price}</td>
          <td>${product.quantity}</td>
          <td>
            <button class="deleteBtn" data-id="${product.id}" 
                    style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
              Delete
            </button>
          </td>
          <td>
            <button class="editBtn" data-id="${product.id}" 
                    style="background: #94FF1AFF; color: black; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
              Edit
            </button>
          </td>
        `;
          tbody.appendChild(row);
        });

        setupDeleteButtons();
        setupEditButtons();
      })
      .catch((err) => {
        console.error("🔥 Error loading products:", err);
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-red-500 py-4">❌ Failed to load products: ${err.message}</td></tr>`;
      });
  }
  // ✅ FIXED: Delete buttons with immediate feedback
  function setupDeleteButtons() {
    document.querySelectorAll(".deleteBtn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = btn.getAttribute("data-id");
        const productTitle = btn.closest("tr").children[2].textContent;

        if (!confirm(`Are you sure you want to delete "${productTitle}"?`))
          return;

        // Show loading state
        const originalText = btn.textContent;
        btn.textContent = "Deleting...";
        btn.disabled = true;

        try {
          const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.message || "Failed to delete product");
          }

          alert("🗑️ Product deleted successfully!");

          // Remove the row immediately for better UX
          btn.closest("tr").remove();

          // Also refresh the full list to ensure consistency
          setTimeout(() => loadAllProducts(), 500);
        } catch (error) {
          console.error("❌ Delete error:", error);
          alert("❌ " + error.message);

          // Reset button state on error
          btn.textContent = originalText;
          btn.disabled = false;
        }
      });
    });
  }

  // ✅ FIXED: Edit buttons with pre-filled form and immediate feedback
  function setupEditButtons() {
    console.log("🔧 Setting up edit buttons...");

    const editButtons = document.querySelectorAll(".editBtn");
    console.log("📝 Found edit buttons:", editButtons.length);

    editButtons.forEach((btn, index) => {
      console.log(`Setting up button ${index + 1}:`, btn);

      btn.addEventListener("click", async (e) => {
        console.log("🎯 Edit button clicked!", e.target);

        const id = btn.getAttribute("data-id");
        console.log("📋 Product ID:", id);

        const productRow = btn.closest("tr");
        console.log("📄 Product row:", productRow);

        if (!productRow) {
          console.error("❌ Could not find product row!");
          return;
        }

        // Check if we have enough columns
        const columns = productRow.children;
        console.log("📊 Row columns:", columns.length);

        if (columns.length < 6) {
          console.error("❌ Not enough columns in row!");
          return;
        }

        const title = columns[2].textContent;
        const description = columns[3].textContent;
        const priceText = columns[4].textContent;
        const quantityText = columns[5].textContent;

        console.log("📋 Extracted data:", {
          title,
          description,
          priceText,
          quantityText,
        });

        const price = parseFloat(priceText.replace("₹", ""));
        const quantity = parseInt(quantityText);

        console.log("🔢 Parsed numbers:", { price, quantity });

        // Show edit form with pre-filled values
        const editForm = document.getElementById("editProductForm");
        console.log("📝 Edit form found:", !!editForm);

        if (!editForm) {
          console.error(
            "❌ Edit form not found! Make sure you have a form with id='editProductForm'"
          );
          alert("❌ Edit form not found! Please check the HTML.");
          return;
        }

        // Check if form fields exist
        const fields = ["title", "description", "price", "quantity"];
        const missingFields = [];

        fields.forEach((field) => {
          if (!editForm[field]) {
            missingFields.push(field);
          }
        });

        if (missingFields.length > 0) {
          console.error("❌ Missing form fields:", missingFields);
          alert(`❌ Missing form fields: ${missingFields.join(", ")}`);
          return;
        }

        // Pre-fill the form
        editForm.title.value = title;
        editForm.description.value = description;
        editForm.price.value = price;
        editForm.quantity.value = quantity;
        editForm.dataset.id = id; // Store the ID for submission

        console.log("✅ Form pre-filled successfully");

        // Check if toggleSection function exists
        if (typeof toggleSection !== "function") {
          console.error("❌ toggleSection function not found!");
          alert("❌ toggleSection function not found!");
          return;
        }

        toggleSection("editProductSection", () => {
          console.log("📝 Edit section toggled, setting up form submission");

          // Handle form submission
          editForm.onsubmit = async (e) => {
            e.preventDefault();
            console.log("📝 Form submitted");

            // Show loading state
            const submitBtn = editForm.querySelector('button[type="submit"]');
            if (!submitBtn) {
              console.error("❌ Submit button not found!");
              return;
            }

            const originalText = submitBtn.textContent;
            submitBtn.textContent = "Updating Product...";
            submitBtn.disabled = true;

            const updatedProduct = {
              title: editForm.title.value.trim(),
              description: editForm.description.value.trim(),
              image_url: editForm.image_url.value.trim(), // 🆕 include thi
              price: parseFloat(editForm.price.value),
              quantity: parseInt(editForm.quantity.value),
            };

            console.log("📤 Sending update:", updatedProduct);

            try {
              const res = await fetch(`/api/products/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedProduct),
              });

              const data = await res.json();
              console.log("📥 Server response:", data);

              if (!res.ok) {
                throw new Error(
                  data.message || `Server returned ${res.status}`
                );
              }

              alert(`✅ ${data.message}`);

              // Update the row immediately
              productRow.children[2].textContent = updatedProduct.title;
              productRow.children[3].textContent =
                updatedProduct.description || "No description";
              productRow.children[4].textContent = `₹${updatedProduct.price.toFixed(
                2
              )}`;
              productRow.children[5].textContent =
                updatedProduct.quantity.toString();

              // Close the edit section
              toggleSection("editProductSection");

              // Reset form
              editForm.reset();

              // Refresh the product list to ensure consistency
              setTimeout(() => {
                if (typeof loadAllProducts === "function") {
                  loadAllProducts();
                }
              }, 500);
            } catch (error) {
              console.error("❌ Update error:", error);
              alert("❌ " + error.message);
            } finally {
              // Reset button state
              submitBtn.textContent = originalText;
              submitBtn.disabled = false;
            }
          };
        });
      });
    });
  }
  // ✅ IMPROVED: Fetch and display orders with better error handling
  //   async function loadOrders() {
  //     try {
  //       console.log("🔄 Loading orders...");

  //       // Show loading state
  //       const ordersContainer = document.querySelector("#orders-container");
  //       if (ordersContainer) {
  //         ordersContainer.innerHTML =
  //           '<div class="loading">Loading orders...</div>';
  //       }

  //       const response = await fetch("/api/orders", {
  //         headers: {
  //           Accept: "application/json",
  //           "Content-Type": "application/json",
  //         },
  //       });

  //       // Check if response is JSON
  //       const contentType = response.headers.get("content-type");
  //       if (!contentType || !contentType.includes("application/json")) {
  //         const textResponse = await response.text();
  //         console.error(
  //           "❌ Non-JSON response received:",
  //           textResponse.substring(0, 200)
  //         );
  //         throw new Error(
  //           "Server returned HTML instead of JSON. Check server configuration."
  //         );
  //       }

  //       if (!response.ok) {
  //         const errorData = await response.json();
  //         throw new Error(
  //           errorData.message || `HTTP ${response.status}: Failed to fetch orders`
  //         );
  //       }

  //       const orders = await response.json();
  //       console.log("✅ Orders loaded:", orders.length);

  //       // Display orders
  //       displayOrders(orders);

  //       // Setup event handlers after orders are displayed
  //       setupOrderStatusHandlers();
  //     } catch (error) {
  //       console.error("❌ Error loading orders:", error);

  //       const ordersContainer = document.querySelector("#orders-container");
  //       if (ordersContainer) {
  //         ordersContainer.innerHTML = `
  //         <div class="error-message" style="color: red; padding: 20px; text-align: center;">
  //           <h3>❌ Error Loading Orders</h3>
  //           <p>${error.message}</p>
  //           <button onclick="loadOrders()" style="margin-top: 10px; padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 5px; cursor: pointer;">
  //             🔄 Retry
  //           </button>
  //         </div>
  //       `;
  //       }

  //       showNotification(`Failed to load orders: ${error.message}`, "error");
  //     }
  //   }

  //   // ✅ NEW: Display orders in the UI
  //   function displayOrders(orders) {
  //     const ordersContainer = document.querySelector("#orders-container");
  //     if (!ordersContainer) {
  //       console.error("❌ Orders container not found");
  //       return;
  //     }

  //     if (orders.length === 0) {
  //       ordersContainer.innerHTML =
  //         '<div class="no-orders">No orders found.</div>';
  //       return;
  //     }

  //     let html = "";

  //     orders.forEach((order) => {
  //       const statusClass = `status-${order.status}`;
  //       const formattedDate = new Date(order.created_at).toLocaleString();

  //       html += `
  //       <div class="order-card" data-order-id="${order.order_id}">
  //         <div class="order-header">
  //           <h3>Order #${order.order_id}</h3>
  //           <span class="status-badge ${statusClass}">${
  //         order.status.charAt(0).toUpperCase() + order.status.slice(1)
  //       }</span>
  //         </div>

  //         <div class="order-details">
  //           <div class="customer-info">
  //             <h4>Customer Information</h4>
  //             <p><strong>Name:</strong> ${order.customer_name || "N/A"}</p>
  //             <p><strong>Email:</strong> ${order.customer_email || "N/A"}</p>
  //             <p><strong>Phone:</strong> ${order.customer_phone || "N/A"}</p>
  //             <p><strong>Address:</strong> ${order.customer_address || "N/A"}</p>
  //           </div>

  //           <div class="order-info">
  //             <h4>Order Information</h4>
  //             <p><strong>Date:</strong> ${formattedDate}</p>
  //             <p><strong>Total Amount:</strong> ₹${order.total_amount}</p>
  //             <p><strong>Total Quantity:</strong> ${order.total_quantity}</p>
  //             <p><strong>Products:</strong> ${order.product_details}</p>
  //           </div>
  //         </div>

  //         <div class="order-actions">
  //           <label for="status-${order.order_id}">Update Status:</label>
  //           <select class="status-select" id="status-${
  //             order.order_id
  //           }" data-order-id="${order.order_id}">
  //             <option value="pending" ${
  //               order.status === "pending" ? "selected" : ""
  //             }>Pending</option>
  //             <option value="confirmed" ${
  //               order.status === "confirmed" ? "selected" : ""
  //             }>Confirmed</option>

  //             <option value="shipped" ${
  //               order.status === "shipped" ? "selected" : ""
  //             }>Shipped</option>
  //             <option value="delivered" ${
  //               order.status === "delivered" ? "selected" : ""
  //             }>Delivered</option>
  //             <option value="cancelled" ${
  //               order.status === "cancelled" ? "selected" : ""
  //             }>Cancelled</option>
  //           </select>

  //           <button class="view-details-btn" onclick="viewOrderDetails(${
  //             order.order_id
  //           })">
  //             View Details
  //           </button>
  //         </div>
  //       </div>
  //     `;
  //     });

  //     ordersContainer.innerHTML = html;
  //   }
  async function loadOrders() {
    try {
      console.log("🔄 Loading orders...");

      const ordersContainer = document.querySelector("#orders-container");
      if (!ordersContainer) return;

      // Add filter controls
      const filterHtml = `
      <div class="orders-filter">
        <select id="statusFilter" class="status-filter">
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span id="orderCount" class="order-count"></span>
      </div>
      <div id="filteredOrders" class="orders-grid"></div>
    `;

      ordersContainer.innerHTML = filterHtml;

      // Fetch orders
      const response = await fetch("/api/orders", {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch orders`);
      }

      const orders = await response.json();
      console.log("✅ Orders loaded:", orders.length);

      // Setup filter handler
      const statusFilter = document.getElementById("statusFilter");
      statusFilter.addEventListener("change", (e) => {
        renderFilteredOrders(orders, e.target.value);
      });

      // Initial render of all orders
      renderFilteredOrders(orders, "all");

      // Setup status update handlers
      setupOrderStatusHandlers();
    } catch (error) {
      console.error("❌ Error loading orders:", error);
      showNotification(`Failed to load orders: ${error.message}`, "error");
    }
  }

  function renderFilteredOrders(orders, filterStatus) {
    const filteredOrders =
      filterStatus === "all"
        ? orders
        : orders.filter((order) => order.status === filterStatus);

    const container = document.getElementById("filteredOrders");
    const orderCount = document.getElementById("orderCount");

    // Update order count
    orderCount.textContent = `${filteredOrders.length} orders found`;

    if (filteredOrders.length === 0) {
      container.innerHTML = '<div class="no-orders">No orders found.</div>';
      return;
    }

    let html = "";
    filteredOrders.forEach((order) => {
      const formattedDate = new Date(order.created_at).toLocaleString();
      html += `
      <div class="order-card" data-order-id="${order.order_id}">
        <div class="order-header">
          <h3>Order #${order.order_id}</h3>
          <span class="status-badge status-${order.status}">
            ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
        
        <div class="order-summary">
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Customer:</strong> ${order.customer_name || "N/A"}</p>
          <p><strong>Total:</strong> ₹${order.total_amount}</p>
        </div>
        
        <div class="order-actions">
          <select class="status-select" data-order-id="${order.order_id}">
            <option value="pending" ${
              order.status === "pending" ? "selected" : ""
            }>Pending</option>
            <option value="confirmed" ${
              order.status === "confirmed" ? "selected" : ""
            }>Confirmed</option>
            <option value="shipped" ${
              order.status === "shipped" ? "selected" : ""
            }>Shipped</option>
            <option value="delivered" ${
              order.status === "delivered" ? "selected" : ""
            }>Delivered</option>
            <option value="cancelled" ${
              order.status === "cancelled" ? "selected" : ""
            }>Cancelled</option>
          </select>
          <button onclick="viewOrderDetails(${
            order.order_id
          })" class="view-details-btn">
            View Details
          </button>
        </div>
      </div>
    `;
    });

    container.innerHTML = html;
  }
  // ✅ NEW: View detailed order information
  async function viewOrderDetails(orderId) {
    try {
      console.log(`🔍 Loading details for order ${orderId}`);

      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch order details`);
      }

      const order = await response.json();
      console.log("✅ Order details loaded:", order);

      // Display order details in a modal or new section
      displayOrderDetailsModal(order);
    } catch (error) {
      console.error("❌ Error loading order details:", error);
      showNotification(
        `Failed to load order details: ${error.message}`,
        "error"
      );
    }
  }
  // Make functions globally accessible
  window.viewOrderDetails = viewOrderDetails;
  window.closeOrderDetailsModal = closeOrderDetailsModal;

  // ✅ NEW: Display order details in a modal
  function displayOrderDetailsModal(order) {
    // Remove existing modal
    const existingModal = document.querySelector("#order-details-modal");
    if (existingModal) {
      existingModal.remove();
    }

    const formattedDate = new Date(order.created_at).toLocaleString();

    let itemsHtml = "";
    if (order.items && order.items.length > 0) {
      itemsHtml = order.items
        .map(
          (item) => `
      <tr>
        <td>${item.product_title || "Unknown Product"}</td>
        <td>${item.quantity}</td>
        <td>₹${item.price}</td>
        <td>₹${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `
        )
        .join("");
    } else {
      itemsHtml = '<tr><td colspan="4">No items found</td></tr>';
    }

    const modalHtml = `
    <div id="order-details-modal" class="modal" style="display: block;">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Order Details #${order.id}</h2>
          <span class="close" onclick="closeOrderDetailsModal()">&times;</span>
        </div>
        
        <div class="modal-body">
          <div class="order-summary">
            <h3>Order Summary</h3>
            <p><strong>Status:</strong> <span class="status-badge status-${
              order.status
            }">${
      order.status.charAt(0).toUpperCase() + order.status.slice(1)
    }</span></p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Total Amount:</strong> ₹${order.total_amount}</p>
            <p><strong>Total Quantity:</strong> ${order.total_quantity}</p>
          </div>
          
          <div class="customer-details">
            <h3>Customer Details</h3>
            <p><strong>Name:</strong> ${order.customer_name || "N/A"}</p>
            <p><strong>Email:</strong> ${order.customer_email || "N/A"}</p>
            <p><strong>Phone:</strong> ${order.phone || "N/A"}</p>
            <p><strong>Address:</strong><br>${(order.address || "N/A").replace(
              /\n/g,
              "<br>"
            )}</p>
          </div>
          
          <div class="order-items">
            <h3>Order Items</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
        </div>
        
          <div class="modal-footer">
            <button onclick="closeOrderDetailsModal()" class="danger-btn btn-secondary">Close</button>
          </div>
      </div>
    </div>
  `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
  }

  // ✅ NEW: Close order details modal
  function closeOrderDetailsModal() {
    const modal = document.querySelector("#order-details-modal");
    if (modal) {
      modal.remove();
    }
  }

  // ✅ NEW: Initialize admin panel
  function initializeAdminPanel() {
    console.log("🚀 Initializing admin panel...");

    // Load orders when page loads
    loadOrders();

    // Setup refresh button if it exists
    const refreshBtn = document.querySelector("#refresh-orders-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", loadOrders);
    }

    // Setup any other admin panel features
    setupAdminPanelStyles();
  }

  // ✅ NEW: Add CSS styles for better UI
  function setupAdminPanelStyles() {
    // Add CSS if not already present
    if (!document.querySelector("#admin-panel-styles")) {
      // Add to existing styles in setupAdminPanelStyles
      const additionalStyles = `
      <style>
  .orders-filter {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .status-filter {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    min-width: 150px;
  }

  .order-count {
    color: #666;
    font-size: 14px;
  }

  .orders-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }

  .order-card {
    background: white;
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .order-summary {
    margin: 10px 0;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 4px;
  }
    </style>
`;

      document.head.insertAdjacentHTML("beforeend", additionalStyles);
      const styles = `
      <style id="admin-panel-styles">
        .order-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
        }
        
        .status-badge {
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .status-pending { background: #ffeaa7; color: #2d3436; }
        .status-confirmed { background: #74b9ff; color: white; }
        .status-shipped { background: #00b894; color: white; }
        .status-delivered { background: #00cec9; color: white; }
        .status-cancelled { background: #fd79a8; color: white; }
        
        .order-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 15px;
        }
        
        .customer-info, .order-info {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
        }
        
        .customer-info h4, .order-info h4 {
          margin-top: 0;
          color: #2d3436;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        
        .order-actions {
          display: flex;
          align-items: center;
          gap: 15px;
          padding-top: 15px;
          border-top: 1px solid #eee;
        }
        
        .status-select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .view-details-btn {
          padding: 8px 16px;
          background: #007cba;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .view-details-btn:hover {
          background: #005c8a;
        }
        
        .modal {
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.5);
        }
        
        .modal-content {
          background-color: white;
          margin: 5% auto;
          padding: 0;
          border-radius: 8px;
          width: 90%;
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #eee;
        }
        
        .modal-body {
          padding: 20px;
        }
        
        .modal-footer {
          padding: 20px;
          border-top: 1px solid #eee;
          text-align: right;
        }
        
        .close {
          font-size: 28px;
          font-weight: bold;
          cursor: pointer;
          color: #aaa;
        }
        
        .close:hover {
          color: black;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        
        .items-table th,
        .items-table td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        
        .items-table th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
          font-size: 18px;
        }
        
        .no-orders {
          text-align: center;
          padding: 40px;
          color: #999;
          font-size: 16px;
        }
        
        .error-message {
          background: #ffebee;
          border: 1px solid #f44336;
          border-radius: 4px;
          color: #c62828;
        }
        
        @media (max-width: 768px) {
          .order-details {
            grid-template-columns: 1fr;
          }
          
          .order-actions {
            flex-direction: column;
            align-items: stretch;
          }
          
          .modal-content {
            width: 95%;
            margin: 10px auto;
          }
        }
      </style>
    `;

      document.head.insertAdjacentHTML("beforeend", styles);
    }
  }

  // ✅ Initialize when DOM is loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAdminPanel);
  } else {
    initializeAdminPanel();
  }

  // ✅ NEW: Handle order status changes
  function setupOrderStatusHandlers() {
    document.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("change", async (e) => {
        const orderId = select.getAttribute("data-order-id");
        const newStatus = select.value;
        const originalOption = select.querySelector(`option[selected]`);
        const originalValue = originalOption
          ? originalOption.value
          : select.options[0].value;

        // Show loading state
        select.disabled = true;
        const originalHTML = select.innerHTML;

        try {
          console.log(`🔄 Updating order ${orderId} status to: ${newStatus}`);

          const res = await fetch(`/api/orders/${orderId}/status`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ status: newStatus }),
          });

          // Check if response is JSON
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error(
              "Server returned non-JSON response. Check server logs."
            );
          }

          const data = await res.json();

          if (!res.ok) {
            throw new Error(
              data.message || `HTTP ${res.status}: Failed to update status`
            );
          }

          console.log("✅ Status updated successfully:", data);

          // Show success message
          showNotification(
            `✅ Order #${orderId} status updated to "${newStatus}"`,
            "success"
          );

          // Update the selected attribute properly
          select.querySelectorAll("option").forEach((opt) => {
            opt.removeAttribute("selected");
          });

          const newSelectedOption = select.querySelector(
            `option[value="${newStatus}"]`
          );
          if (newSelectedOption) {
            newSelectedOption.setAttribute("selected", "selected");
          }

          // Update any display elements that show the status
          updateStatusDisplay(orderId, newStatus);
        } catch (error) {
          console.error("❌ Status update error:", error);

          // Show error message
          showNotification(
            `❌ Failed to update order status: ${error.message}`,
            "error"
          );

          // Reset to original value
          select.value = originalValue;

          // Reset selected attribute
          select.querySelectorAll("option").forEach((opt) => {
            opt.removeAttribute("selected");
          });
          if (originalOption) {
            originalOption.setAttribute("selected", "selected");
          }
        } finally {
          // Re-enable the select
          select.disabled = false;
        }
      });
    });
  }

  // / ✅ NEW: Show notification messages
  function showNotification(message, type = "info") {
    // Remove existing notifications
    const existingNotification = document.querySelector(".status-notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement("div");
    notification.className = `status-notification ${type}`;
    notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 5px;
    color: white;
    font-weight: bold;
    z-index: 1000;
    max-width: 400px;
    word-wrap: break-word;
    ${type === "success" ? "background-color: #4CAF50;" : ""}
    ${type === "error" ? "background-color: #f44336;" : ""}
    ${type === "info" ? "background-color: #2196F3;" : ""}
  `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }
  // / ✅ NEW: Update status display in the UI
  function updateStatusDisplay(orderId, newStatus) {
    // Update any status badges or text displays
    const statusElements = document.querySelectorAll(
      `[data-order-id="${orderId}"] .status-badge, [data-order-id="${orderId}"] .order-status`
    );

    statusElements.forEach((element) => {
      element.textContent =
        newStatus.charAt(0).toUpperCase() + newStatus.slice(1);

      // Update status badge colors
      element.className = element.className.replace(/status-\w+/g, "");
      element.classList.add(`status-${newStatus}`);
    });
  }

  // Button Event Listeners
  document.getElementById("addProductBtn")?.addEventListener("click", () => {
    toggleSection("addProductSection", addProduct);
  });

  document.getElementById("viewOrdersBtn")?.addEventListener("click", () => {
    toggleSection("ordersSection", loadOrders);
  });

  document.getElementById("viewAllProducts")?.addEventListener("click", () => {
    toggleSection("viewAllProductsSection", loadAllProducts);
  });
  document
    .querySelector("#editProductForm button[type='button']")
    ?.addEventListener("click", () => {
      toggleSection("addProductSection");
    });

  document
    .getElementById("viewNotificationsBtn")
    ?.addEventListener("click", () => {
      toggleSection("notificationsSection", showNotification);
    });

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    }
  });

  // Initially hide all sections
  hideAllSections();
});
