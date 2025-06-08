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
  // ✅ FIXED: Load All Products with proper image URL handling
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
  // ✅ UPDATED: Load Orders with better data display
  function loadOrders() {
    const tbody = document.getElementById("ordersTableBody");
    tbody.innerHTML =
      '<tr><td colspan="9" class="text-center">🔄 Loading orders...</td></tr>';

    fetch("/api/orders")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((orders) => {
        tbody.innerHTML = ""; // Clear loading message

        if (!orders || orders.length === 0) {
          tbody.innerHTML =
            '<tr><td colspan="9" class="text-center py-4">No orders found.</td></tr>';
          return;
        }

        orders.forEach((order) => {
          const formattedDate = new Date(order.created_at).toLocaleString(
            "en-IN",
            {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }
          );

          const row = document.createElement("tr");
          row.innerHTML = `
          <td>#${order.order_id}</td>
          <td>${order.customer_name || "Guest User"}</td>
          <td>${order.customer_email || "N/A"}</td>
          <td>${order.customer_phone || "N/A"}</td>
          <td style="max-width: 150px; word-wrap: break-word;">${
            order.customer_address || "N/A"
          }</td>
          <td style="max-width: 200px; word-wrap: break-word;">${
            order.product_details || "No items"
          }</td>
          <td>${order.total_quantity}</td>
          <td>₹${order.total_amount}</td>
          <td>${formattedDate}</td>
          <td>
            <select class="status-select" data-order-id="${order.order_id}" 
                    style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ddd;">
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
          </td>
        `;
          tbody.appendChild(row);
        });

        // Setup status change handlers
        setupOrderStatusHandlers();
      })
      .catch((err) => {
        console.error("🔥 Error loading orders:", err);
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-red-500 py-4">❌ Failed to load orders: ${err.message}</td></tr>`;
      });
  }

  // ✅ NEW: Handle order status changes
  function setupOrderStatusHandlers() {
    document.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("change", async (e) => {
        const orderId = select.getAttribute("data-order-id");
        const newStatus = select.value;
        const originalValue =
          select.querySelector(`option[selected]`)?.value || select.value;

        try {
          const res = await fetch(`/api/orders/${orderId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.message || "Failed to update status");
          }

          alert(`✅ Order status updated to ${newStatus}`);

          // Update the selected attribute
          select
            .querySelectorAll("option")
            .forEach((opt) => opt.removeAttribute("selected"));
          select
            .querySelector(`option[value="${newStatus}"]`)
            .setAttribute("selected", "selected");
        } catch (error) {
          console.error("❌ Status update error:", error);
          alert("❌ " + error.message);

          // Reset to original value
          select.value = originalValue;
        }
      });
    });
  }
  function loadNotifications() {
    console.log("Loading notifications...");
    // You can implement notifications here
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
      toggleSection("notificationsSection", loadNotifications);
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
