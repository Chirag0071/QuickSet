/**
 * QuickBite Food Delivery - Client-side Logic & Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // -------------------------------------------------------------------------
  // State Management
  // -------------------------------------------------------------------------
  let cart = [];
  let activeCategory = 'all';
  let searchQuery = '';
  const DELIVERY_THRESHOLD = 25.00;
  const BASE_DELIVERY_FEE = 2.99;

  // -------------------------------------------------------------------------
  // DOM Elements
  // -------------------------------------------------------------------------
  const cartCountBadge = document.getElementById('cart-count');
  const cartItemsList = document.getElementById('cart-items');
  const subtotalPriceEl = document.getElementById('subtotal-price');
  const deliveryFeeEl = document.getElementById('delivery-fee');
  const totalPriceEl = document.getElementById('total-price');
  const clearCartBtn = document.getElementById('clear-cart-btn');
  const checkoutBtn = document.getElementById('checkout-btn');
  const cartNavLink = document.getElementById('cart-nav-link');

  const menuGrid = document.getElementById('menu-grid');
  const foodCards = Array.from(document.querySelectorAll('.food-card'));
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));
  const noResultsEl = document.getElementById('no-results');

  const checkoutModal = document.getElementById('checkout-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelOrderBtn = document.getElementById('cancel-order-btn');
  const checkoutForm = document.getElementById('checkout-form');
  const modalTotalPriceEl = document.getElementById('modal-total-price');
  const toastContainer = document.getElementById('toast-container');
  const cardFieldsContainer = document.getElementById('card-fields');
  const paymentRadioButtons = document.querySelectorAll('input[name="payment-method"]');

  // Form Inputs
  const customerNameInput = document.getElementById('customer-name');
  const customerPhoneInput = document.getElementById('customer-phone');
  const customerAddressInput = document.getElementById('customer-address');
  const customerCityInput = document.getElementById('customer-city');
  const customerZipInput = document.getElementById('customer-zip');
  const cardNumberInput = document.getElementById('card-number');
  const cardExpiryInput = document.getElementById('card-expiry');
  const cardCvvInput = document.getElementById('card-cvv');

  // Error Elements
  const nameError = document.getElementById('name-error');
  const phoneError = document.getElementById('phone-error');
  const addressError = document.getElementById('address-error');
  const cityError = document.getElementById('city-error');
  const zipError = document.getElementById('zip-error');
  const cardError = document.getElementById('card-error');
  const expiryError = document.getElementById('expiry-error');
  const cvvError = document.getElementById('cvv-error');

  // -------------------------------------------------------------------------
  // Toast Notification Helper
  // -------------------------------------------------------------------------
  function showToast(message, type = 'info') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-msg">${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Animate removal after duration
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 3200);
  }

  // -------------------------------------------------------------------------
  // Cart Calculation and UI Updates
  // -------------------------------------------------------------------------
  function calculateCartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let deliveryFee = 0;
    if (subtotal > 0) {
      deliveryFee = subtotal >= DELIVERY_THRESHOLD ? 0 : BASE_DELIVERY_FEE;
    }
    const total = subtotal + deliveryFee;
    const totalItemCount = cart.reduce((count, item) => count + item.quantity, 0);

    return {
      subtotal,
      deliveryFee,
      total,
      totalItemCount
    };
  }

  function updateCartUI() {
    const { subtotal, deliveryFee, total, totalItemCount } = calculateCartTotals();

    // Update Badge & Totals
    if (cartCountBadge) cartCountBadge.textContent = totalItemCount;
    if (subtotalPriceEl) subtotalPriceEl.textContent = `$${subtotal.toFixed(2)}`;
    if (deliveryFeeEl) {
      if (subtotal === 0) {
        deliveryFeeEl.textContent = '$0.00';
      } else if (deliveryFee === 0) {
        deliveryFeeEl.innerHTML = '<span style="color:#10b981;font-weight:700;">FREE</span>';
      } else {
        deliveryFeeEl.textContent = `$${deliveryFee.toFixed(2)}`;
      }
    }
    if (totalPriceEl) totalPriceEl.textContent = `$${total.toFixed(2)}`;
    if (modalTotalPriceEl) modalTotalPriceEl.textContent = `$${total.toFixed(2)}`;

    // Update Checkout Button State
    if (checkoutBtn) {
      checkoutBtn.disabled = cart.length === 0;
    }

    // Render Cart Items
    if (!cartItemsList) return;
    cartItemsList.innerHTML = '';

    if (cart.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'empty-msg';
      emptyLi.textContent = 'Your cart is empty';
      cartItemsList.appendChild(emptyLi);
      return;
    }

    cart.forEach(item => {
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.dataset.id = item.id;

      const itemTotal = (item.price * item.quantity).toFixed(2);

      li.innerHTML = `
        <div class="cart-item-details">
          <div class="cart-item-name" title="${item.name}">${item.name}</div>
          <div class="cart-item-price">$${item.price.toFixed(2)} &times; ${item.quantity} = <strong>$${itemTotal}</strong></div>
        </div>
        <div class="cart-item-actions">
          <button type="button" class="qty-btn" data-action="decrease" data-id="${item.id}" aria-label="Decrease quantity of ${item.name}">&minus;</button>
          <span class="cart-item-qty">${item.quantity}</span>
          <button type="button" class="qty-btn" data-action="increase" data-id="${item.id}" aria-label="Increase quantity of ${item.name}">&plus;</button>
          <button type="button" class="btn-remove-item" data-action="remove" data-id="${item.id}" aria-label="Remove ${item.name} from cart" title="Remove">&times;</button>
        </div>
      `;
      cartItemsList.appendChild(li);
    });
  }

  // -------------------------------------------------------------------------
  // Cart Mutation Actions
  // -------------------------------------------------------------------------
  function addToCart(dishId) {
    const card = foodCards.find(c => c.dataset.id === String(dishId));
    if (!card) return;

    const name = card.dataset.name;
    const price = parseFloat(card.dataset.price) || 0;
    const existingItem = cart.find(item => item.id === String(dishId));

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: String(dishId),
        name,
        price,
        quantity: 1
      });
    }

    updateCartUI();
    showToast(`Added "${name}" to your cart!`, 'success');
  }

  function increaseQuantity(dishId) {
    const item = cart.find(i => i.id === String(dishId));
    if (item) {
      item.quantity += 1;
      updateCartUI();
    }
  }

  function decreaseQuantity(dishId) {
    const item = cart.find(i => i.id === String(dishId));
    if (!item) return;

    if (item.quantity > 1) {
      item.quantity -= 1;
    } else {
      cart = cart.filter(i => i.id !== String(dishId));
      showToast(`Removed "${item.name}" from cart.`, 'info');
    }
    updateCartUI();
  }

  function removeFromCart(dishId) {
    const item = cart.find(i => i.id === String(dishId));
    if (item) {
      cart = cart.filter(i => i.id !== String(dishId));
      updateCartUI();
      showToast(`Removed "${item.name}" from cart.`, 'info');
    }
  }

  function clearCart() {
    if (cart.length === 0) return;
    cart = [];
    updateCartUI();
    showToast('Cart has been cleared.', 'info');
  }

  // -------------------------------------------------------------------------
  // Search and Filter Dishes
  // -------------------------------------------------------------------------
  function filterDishes() {
    const query = searchQuery.trim().toLowerCase();
    let visibleCount = 0;

    foodCards.forEach(card => {
      const cardCategory = card.dataset.category || '';
      const cardName = (card.dataset.name || '').toLowerCase();
      const cardDesc = (card.querySelector('.dish-desc')?.textContent || '').toLowerCase();

      const matchesCategory = (activeCategory === 'all' || cardCategory === activeCategory);
      const matchesSearch = query === '' || cardName.includes(query) || cardDesc.includes(query);

      if (matchesCategory && matchesSearch) {
        card.classList.remove('hidden');
        visibleCount++;
      } else {
        card.classList.add('hidden');
      }
    });

    if (noResultsEl) {
      if (visibleCount === 0) {
        noResultsEl.classList.remove('hidden');
      } else {
        noResultsEl.classList.add('hidden');
      }
    }
  }

  // -------------------------------------------------------------------------
  // Checkout Modal & Form Validation
  // -------------------------------------------------------------------------
  function openCheckoutModal() {
    if (cart.length === 0) {
      showToast('Your cart is empty. Please add items to checkout.', 'error');
      return;
    }
    updateCartUI();
    clearValidationErrors();
    checkoutModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (customerNameInput) customerNameInput.focus();
  }

  function closeCheckoutModal() {
    checkoutModal.classList.add('hidden');
    document.body.style.overflow = '';
    clearValidationErrors();
  }

  function clearValidationErrors() {
    const errorElements = [
      nameError, phoneError, addressError, cityError,
      zipError, cardError, expiryError, cvvError
    ];
    errorElements.forEach(el => {
      if (el) el.textContent = '';
    });
  }

  function validateCheckoutForm() {
    clearValidationErrors();
    let isValid = true;

    // Name validation
    const nameVal = customerNameInput?.value.trim() || '';
    if (nameVal.length < 2) {
      if (nameError) nameError.textContent = 'Please enter your full name (at least 2 letters).';
      isValid = false;
    }

    // Phone validation
    const phoneVal = customerPhoneInput?.value.trim() || '';
    const phoneDigits = phoneVal.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      if (phoneError) phoneError.textContent = 'Please enter a valid phone number with at least 10 digits.';
      isValid = false;
    }

    // Address validation
    const addressVal = customerAddressInput?.value.trim() || '';
    if (addressVal.length < 5) {
      if (addressError) addressError.textContent = 'Please enter a valid delivery street address.';
      isValid = false;
    }

    // City validation
    const cityVal = customerCityInput?.value.trim() || '';
    if (cityVal.length < 2) {
      if (cityError) cityError.textContent = 'Please enter a valid city name.';
      isValid = false;
    }

    // Zip Code validation
    const zipVal = customerZipInput?.value.trim() || '';
    if (!/^\d{4,10}$/.test(zipVal.replace(/\s|-/g, ''))) {
      if (zipError) zipError.textContent = 'Please enter a valid postal/zip code.';
      isValid = false;
    }

    // Payment Method validation
    const selectedPayment = document.querySelector('input[name="payment-method"]:checked')?.value || 'card';
    if (selectedPayment === 'card') {
      const cardVal = (cardNumberInput?.value || '').replace(/\s/g, '');
      if (!/^\d{13,19}$/.test(cardVal)) {
        if (cardError) cardError.textContent = 'Enter a valid 13 to 19-digit card number.';
        isValid = false;
      }

      const expiryVal = (cardExpiryInput?.value || '').trim();
      const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
      if (!expiryRegex.test(expiryVal)) {
        if (expiryError) expiryError.textContent = 'Format as MM/YY (e.g. 12/26).';
        isValid = false;
      }

      const cvvVal = (cardCvvInput?.value || '').trim();
      if (!/^\d{3,4}$/.test(cvvVal)) {
        if (cvvError) cvvError.textContent = 'Enter 3 or 4-digit CVV.';
        isValid = false;
      }
    }

    return isValid;
  }

  function handleOrderSubmission(e) {
    e.preventDefault();
    if (!validateCheckoutForm()) {
      return;
    }

    const customerName = customerNameInput?.value.trim() || 'Valued Customer';
    const selectedPayment = document.querySelector('input[name="payment-method"]:checked')?.value || 'card';
    const paymentMethodText = selectedPayment === 'cod' ? 'Cash on Delivery' : 'Credit Card';

    // Close modal and reset form
    closeCheckoutModal();
    checkoutForm.reset();
    if (cardFieldsContainer) {
      cardFieldsContainer.style.display = 'block';
    }

    // Clear cart
    cart = [];
    updateCartUI();

    // Success Toast Notification
    showToast(`🎉 Thank you, ${customerName}! Your order has been placed via ${paymentMethodText}. Delivery is on its way!`, 'success');
  }

  // -------------------------------------------------------------------------
  // Event Listeners Setup
  // -------------------------------------------------------------------------

  // Add-to-cart clicks from menu grid
  if (menuGrid) {
    menuGrid.addEventListener('click', (e) => {
      const addBtn = e.target.closest('.add-btn');
      if (addBtn) {
        const id = addBtn.dataset.id;
        if (id) addToCart(id);
      }
    });
  }

  // Cart interaction buttons (increase, decrease, remove)
  if (cartItemsList) {
    cartItemsList.addEventListener('click', (e) => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;

      const action = button.dataset.action;
      const id = button.dataset.id;

      if (action === 'increase') {
        increaseQuantity(id);
      } else if (action === 'decrease') {
        decreaseQuantity(id);
      } else if (action === 'remove') {
        removeFromCart(id);
      }
    });
  }

  // Clear Cart
  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', clearCart);
  }

  // Category Filter Buttons
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category || 'all';
      filterDishes();
    });
  });

  // Search Input & Clear Search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      filterDishes();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        filterDishes();
        searchInput.focus();
      }
    });
  }

  // Open Checkout Modal
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', openCheckoutModal);
  }

  // Smooth scroll to cart when cart nav button clicked on small screens
  if (cartNavLink) {
    cartNavLink.addEventListener('click', (e) => {
      const cartAside = document.getElementById('cart');
      if (cartAside) {
        cartAside.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Close Modal Buttons
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeCheckoutModal);
  if (cancelOrderBtn) cancelOrderBtn.addEventListener('click', closeCheckoutModal);

  // Close Modal on backdrop click
  if (checkoutModal) {
    checkoutModal.addEventListener('click', (e) => {
      if (e.target === checkoutModal) {
        closeCheckoutModal();
      }
    });
  }

  // Close modal on Escape key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !checkoutModal.classList.contains('hidden')) {
      closeCheckoutModal();
    }
  });

  // Payment method toggle
  paymentRadioButtons.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (cardFieldsContainer) {
        if (e.target.value === 'cod') {
          cardFieldsContainer.style.display = 'none';
        } else {
          cardFieldsContainer.style.display = 'block';
        }
      }
    });
  });

  // Card Number Auto-formatting (4-digit spacing)
  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 16);
      val = val.match(/.{1,4}/g)?.join(' ') || val;
      e.target.value = val;
    });
  }

  // Card Expiry Auto-formatting (MM/YY)
  if (cardExpiryInput) {
    cardExpiryInput.addEventListener('input', (e) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 4);
      if (val.length >= 2) {
        val = val.substring(0, 2) + '/' + val.substring(2);
      }
      e.target.value = val;
    });
  }

  // Form Submission
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleOrderSubmission);
  }

  // Initial render
  updateCartUI();
});
