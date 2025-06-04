const cartItemsContainer = document.getElementById("cart-items");
const cartTotalDisplay = document.getElementById("cart-total");

function renderCart() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <p class="empty-cart">
        Your cart is empty. <a href="/Shivansh-Kendra/products.html">Go to products</a>
      </p>`;
    cartTotalDisplay.textContent = '';
    return;
  }

  let total = 0;
  cartItemsContainer.innerHTML = '';

  cart.forEach((item, index) => {
    const price = parseInt(item.price.replace("₹", "").trim()) || 0;
    const quantity = item.quantity || 1;
    const itemTotal = price * quantity;
    total += itemTotal;

    const itemHTML = `
      <div class="cart-item">
        <img src="${item.img}" alt="${item.name}">
        <div class="cart-item-details">
          <h4>${item.name}</h4>
          <p>Price: ₹${price}</p>
          <label>
            Quantity:
            <input type="number" min="1" value="${quantity}" onchange="updateQuantity(${index}, this.value)" />
          </label>
          <p>Total: ₹${itemTotal}</p>
        </div>
        <button onclick="removeItem(${index})">Remove</button>
      </div>
    `;

    cartItemsContainer.innerHTML += itemHTML;
  });

  cartTotalDisplay.textContent = `Total: ₹${total}`;
}

function removeItem(index) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

function updateQuantity(index, quantity) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  quantity = parseInt(quantity);
  if (quantity < 1) return;
  cart[index].quantity = quantity;
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

document.getElementById("orderForm").addEventListener("submit", function (e) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (cart.length === 0) {
    e.preventDefault();
    alert("Your cart is empty!");
    return;
  }

  let tableHTML = `
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr style="background-color: #2e7d32; color: white;">
          <th>Product</th>
          <th>Quantity</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
  `;

  let total = 0;
  cart.forEach(item => {
    const price = parseInt(item.price.replace("₹", "").trim()) || 0;
    const quantity = item.quantity || 1;
    const itemTotal = price * quantity;
    total += itemTotal;

    tableHTML += `
      <tr>
        <td>${item.name}</td>
        <td>${quantity}</td>
        <td>₹${price}</td>
        <td>₹${itemTotal}</td>
      </tr>`;
  });

  tableHTML += `
      <tr>
        <td colspan="3" style="text-align:right;font-weight:bold;">Total:</td>
        <td><strong>₹${total}</strong></td>
      </tr>
    </tbody>
  </table>`;

  document.getElementById("orderHTML").value = tableHTML;
});

renderCart();
