// =======================================================
// Bambino D’Oro – script v7.6 (parche estofado + fix agregar) - CORREGIDO
// =======================================================

(function () {
  if (typeof window.CSS === 'undefined') window.CSS = {};
  if (typeof window.CSS.escape !== 'function') {
    window.CSS.escape = function (v) { return String(v).replace(/[^a-zA-Z0-9_-]/g, '\\$&'); };
  }
  function hasAppData() { try { return (typeof appData !== 'undefined') && appData; } catch (e) { return false; } }

  const DELIVERY_FEE = 2000; // COP

var cart = JSON.parse(localStorage.getItem('bdo_cart') || '[]');

// Estas se usan ahora para el modal de adiciones
var pendingProduct = null;   // { id, name, price, categoryId? }
var pendingQty = 1;

// (selectedAddons ya no se usa para todo el pedido, pero lo dejamos
// por compatibilidad si algo lo llama)
var selectedAddons = {};
// aquí guardaremos la última ubicación tomada
var clientLocation = null;

var $home = document.getElementById('home');
  var $vista = document.getElementById('vista');
  var orderModal = document.getElementById('orderModal');
  var pizzaModal = document.getElementById('pizzaBuilderModal');
  var estofadoModal = document.getElementById('estofadoModal');
  var addonsModal = document.getElementById('addonsModal'); // NUEVO

  function qs(s, root) { return (root || document).querySelector(s); }
  function qsa(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }
  function money(v) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0); }
  function hasClosest(el, selector) { while (el) { if (el.matches && el.matches(selector)) return el; el = el.parentElement; } return null; }

  // Normalizar datos: mover Pizza Paisa a "especial"
  function normalizeData() {
    if (!hasAppData() || !appData.categories) return;
    var pizzaCat = appData.categories.find(function(c){ return c.id === 'pizza'; });
    if (!pizzaCat) return;
    (pizzaCat.products || []).forEach(function(p){
      var name = (p.name || '').toLowerCase();
      if (name.includes('paisa') && p.group !== 'especial') {
        p.group = 'especial';
      }
    });
  }

  // Helper: quitar tildes y normalizar nombres
  function normalizeText(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu,'')
      .replace(/\s+/g,' ')
      .trim();
  }

    // ----- Estofado: permitir sabores específicos, con coincidencia flexible -----
  // ----- Estofado: sabores permitidos (Hawaiana, Kabano, Jamón y queso, Pollo con champiñones) -----
function isAllowedEstofadoFlavor(product) {
  var n = normalizeText(product && product.name);
  if (!n) return false;

  // Hawaiana (soporta hawai, hawaina, etc.)
  if (n.includes('hawa')) return true;

  // Kabano / Cabano
  if (n.includes('kabano') || n.includes('cabano') || n.includes('kaban') || n.includes('caban')) return true;

  // Jamón y queso
  if (n.includes('jamon') && n.includes('queso')) return true;

  // Pollo con champiñones (acepta variaciones)
  if (n.includes('pollo') && (n.includes('champi') || n.includes('champin'))) return true;

  return false;
}



  // Pequeño helper para animar el carrito
  function animateCart() {
    const cartIcon = qs('.cart-icon');
    if (!cartIcon) return;
    cartIcon.classList.add('highlight');
    setTimeout(() => cartIcon.classList.remove('highlight'), 800);
  }

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', function () {
    normalizeData();
    initHeaderFooter();
    renderHome();
    route();
    addEventListeners();
    updateCartView();
  });
  if (document.readyState === 'complete' || document.readyState === 'interactive') { setTimeout(route, 0); }

  function initHeaderFooter() {
    try {
      if (hasAppData() && appData.config) {
        var nameEl = qs('#pizzeriaName'); if (nameEl) nameEl.textContent = '🍕 ' + appData.config.pizzeriaName;
        var waEl = qs('#whatsappNumber'); if (waEl) waEl.textContent = appData.config.whatsappNumber || '—';
        var hrsEl = qs('#businessHours'); if (hrsEl) hrsEl.textContent = appData.config.businessHours || '—';
      }
    } catch (e) { console.warn(e); }
  }

  function normalizeHash(h) { if (!h || h === '#') return 'home'; if (h.charAt(0) === '#') h = h.slice(1); return h || 'home'; }
  function route() {
    var hash = normalizeHash(location.hash);
    if (hash === 'home') { showHome(); return; }
    var cats = (hasAppData() && appData.categories) ? appData.categories : [];
    var cat = cats.find(function (c) { return String(c.id) === String(hash); });
    if (cat) { renderCategory(hash); showVista(); window.scrollTo(0, 0); }
    else { showHome(); }
  }
  function showHome() { if ($home) $home.classList.remove('hidden'); if ($vista) $vista.classList.add('hidden'); document.title = 'Menú – Bambino D’ Oro'; }
  function showVista() { if ($home) $home.classList.add('hidden'); if ($vista) $vista.classList.remove('hidden'); }

  function renderHome() {
    var cats = (hasAppData() && appData.categories) ? appData.categories : [];
    if (!$home) return;
    $home.innerHTML = cats.map(function (c) {
      return (
        '<a class="card" data-cat="' + c.id + '" aria-label="' + (c.name || '') + '" href="#' + c.id + '">' +
        '<span style="font-size:1.1rem;margin-right:.4rem">' + (c.icon || '') + '</span>' + (c.name || '') +
        '</a>'
      );
    }).join('');
  }

    function renderCategory(catId) {
    var categories = (hasAppData() && appData.categories) ? appData.categories : [];
    var category = categories.find(function (c) { return String(c.id) === String(catId); });
    if (!$vista) return;
    if (!category) { $vista.innerHTML = '<p>No se encontró la categoría</p>'; return; }

    $vista.style.backgroundImage = "url('images/fondos/fondo-" + category.id + ".png')";
    $vista.style.backgroundSize = "350px";
    $vista.style.backgroundPosition = "center";
    $vista.style.backgroundRepeat = "repeat";
    $vista.style.backgroundAttachment = "fixed";

    var products = category.products || [];
    var gridId = 'grid-' + category.id;

    // Nueva lógica: separar Pizza Tamaños de Pizza porciones
    var isPizzaPortions = category.id === 'pizza';          // pizzas individuales
    var isPizzaSizes    = category.id === 'pizza-tamanos';  // sección donde vive el builder

    // El builder solo vive en Pizza Tamaños
    var sizes = isPizzaSizes
      ? ((hasAppData() && appData.pizzaOptions && appData.pizzaOptions.sizes) || [])
      : [];

    // Tabs solo en Pizza porciones (tradicional / especial)
    var tabsHtml = isPizzaPortions ? (
      '<div class="tabs" role="tablist">' +
        '<button class="tab active" data-group="tradicional" aria-selected="true">Individuales – Tradicionales</button>' +
        '<button class="tab" data-group="especial">Individuales – Especiales</button>' +
      '</div>'
    ) : '';

    $vista.innerHTML =
      '<button class="back" data-back>← Volver</button>' +
      '<h2 class="chalk">' + category.name + ' <span class="badge"><span>•</span> ' + products.length + ' items</span></h2>' +
      (sizes.length ?
        '<section class="panel">' +
          '<div class="panel-head">' +
            '<h3 class="chalk">Arma tu Pizza</h3><small>Elige tamaño y sabor / mitad y mitad</small>' +
          '</div>' +
          '<div class="size-picker" id="sizesRow"></div>' +
        '</section>' : ''
      ) +
      tabsHtml +
      '<div class="items" id="' + gridId + '"></div>';

    // Botones de tamaños (solo Pizza Tamaños)
        if (sizes.length) {
      var sr = qs('#sizesRow');
      if (sr) {
        sizes.forEach(function (s) {
          var b = document.createElement('button');
          b.className = 'size-btn';

          if (s.image) {
            b.classList.add('size-btn-has-image');
            b.innerHTML =
              '<img class="size-thumb" src="' + s.image + '" alt="' +
              (s.label || ('Pizza ' + s.id)) + '" loading="lazy">' +
              '<span class="size-label">' + s.label + '</span>';
          } else {
            b.textContent = s.label;
          }

          b.addEventListener('click', function () { openPizzaBuilder(s.id); });
          sr.appendChild(b);
        });
      }
    }


    var grid = document.getElementById(gridId);
    var initialGroup = isPizzaPortions ? 'tradicional' : null;
    renderProductsGrid(grid, products, initialGroup);

    // Eventos de tabs solo para Pizza porciones
    if (isPizzaPortions) {
      qsa('.tab', $vista).forEach(function (btn) {
        btn.addEventListener('click', function () {
          qsa('.tab', $vista).forEach(function (x) { x.classList.remove('active'); });
          btn.classList.add('active');
          var group = btn.getAttribute('data-group');
          renderProductsGrid(grid, products, group);
        });
      });
    }

    document.title = category.name + ' – Bambino D’ Oro';
  }

  function renderProductsGrid(gridEl, products, groupFilter) {
    if (!gridEl) return;
    gridEl.innerHTML = '';
    var list = groupFilter ? products.filter(function (p) { return p.group === groupFilter; }) : products;
    list.forEach(function (p) { gridEl.appendChild(productCard(p)); });
  }

  function productCard(p) {
    var el = document.createElement('article');
    el.className = 'item';
    el.dataset.productId = p.id;
    var photo = p.image ? '<div class="photo"><img src="' + p.image + '" alt="' + p.name + ' de Bambino D’Oro" loading="lazy"></div>' : '';
    el.innerHTML =
      photo +
      '<h3>' + (p.icon ? (p.icon + ' ') : '') + p.name + ' <span class="precio">' + money(p.price) + '</span></h3>' +
      (p.description ? '<p class="desc">' + p.description + '</p>' : '') +
      '<div class="product-actions">' +
        '<div class="quantity-selector" aria-label="Cantidad">' +
          '<button class="quantity-btn minus" data-product-id="' + p.id + '" aria-label="Restar">-</button>' +
          '<span class="quantity-display" id="quantity-' + p.id + '" aria-live="polite">1</span>' +
          '<button class="quantity-btn plus" data-product-id="' + p.id + '" aria-label="Sumar">+</button>' +
        '</div>' +
        '<button class="btn btn-red btn-add-to-cart" data-product-id="' + p.id + '">Agregar</button>' +
      '</div>';
    return el;
  }

  // --- carrito ---
  function findProductById(id) {
  var cats = (hasAppData() && appData.categories) ? appData.categories : [];
  for (var i = 0; i < cats.length; i++) {
    var c = cats[i];
    var pr = (c.products || []).find(function (p) { return String(p.id) === String(id); });
    if (pr) {
      // Guardamos la categoría para saber si es bebida / cerveza
      if (!pr.categoryId) pr.categoryId = c.id;
      return pr;
    }
  }
  return null;
}
function productAllowsAdiciones(product) {
  // Solo queremos bloquear bebidas y cervezas
  var cat = product && product.categoryId;
  if (cat === 'beverages' || cat === 'beers') return false;
  return true;
}

// Lista de adiciones desde app-data
// (debes tener appData.adiciones con los valores que me diste)
function getAdicionesCatalog() {
  if (!hasAppData()) return [];
  if (Array.isArray(appData.adiciones)) return appData.adiciones;
  if (Array.isArray(appData.addons)) return appData.addons; // fallback viejo
  return [];
}

function openAdditionsModal() {
  var modal = addonsModal;
  if (!modal || !pendingProduct) {
    // Si por alguna razón no hay modal, agrega directo sin adiciones
    if (pendingProduct) {
      cart.push({ product: pendingProduct, quantity: pendingQty });
      persistCart(); updateCartView(); animateCart();
      if (typeof toast === 'function') toast(pendingQty + ' ' + pendingProduct.name + ' agregada(s)');
    }
    pendingProduct = null;
    pendingQty = 1;
    return;
  }

  var list = qs('#addonsList', modal);
  if (!list) return;

  var catalog = getAdicionesCatalog();
  list.innerHTML = catalog.map(function (a) {
    return '' +
      '<label class="addon-option">' +
        '<input type="checkbox" data-addon-id="' + a.id + '">' +
        (a.icon ? '<span class="addon-icon">' + a.icon + '</span>' : '') +
        '<span class="addon-name">' + a.name + '</span>' +
        '<span class="addon-price">+' + money(a.price || 0) + '</span>' +
      '</label>';
  }).join('');

  modal.style.display = 'grid';
  modal.removeAttribute('hidden');
  trapFocus(modal);
  bindOutsideOnce(modal, closeAdditionsModal);
}

function closeAdditionsModal() {
  if (!addonsModal) return;
  addonsModal.style.display = 'none';
  addonsModal.setAttribute('hidden', '');
  releaseTrap(addonsModal);
  unbindOutside(addonsModal);
}

// Confirmar la selección de adiciones
function confirmAdditions() {
  if (!pendingProduct) { closeAdditionsModal(); return; }

  var modal = addonsModal;
  var list = qs('#addonsList', modal);
  var checks = list ? qsa('input[type="checkbox"]', list) : [];
  var catalog = getAdicionesCatalog();

  var chosen = [];
  var extraTotal = 0;

  checks.forEach(function (ch) {
    if (!ch.checked) return;
    var id = ch.getAttribute('data-addon-id');
    var info = catalog.find(function (a) { return String(a.id) === String(id); });
    if (!info) return;
    chosen.push(info);
    extraTotal += info.price || 0;
  });

  // Construimos el producto final (nombre + precio con adiciones)
  var finalProduct = {
    id: String(pendingProduct.id) + '-a-' + Date.now(), // id único para no mezclar con otros
    name: pendingProduct.name,
    price: (pendingProduct.price || 0) + extraTotal
  };

  if (chosen.length) {
    var extrasText = chosen
      .map(function (a) { return 'adición de ' + a.name.toLowerCase(); })
      .join(' + ');
    finalProduct.name += ' + ' + extrasText;
  }

  cart.push({ product: finalProduct, quantity: pendingQty });
  persistCart(); updateCartView(); animateCart();
  if (typeof toast === 'function') toast(pendingQty + ' ' + finalProduct.name + ' agregada(s)');

  pendingProduct = null;
  pendingQty = 1;
  closeAdditionsModal();
}

  function updateQuantity(id, delta) {
    var label = qs('#quantity-' + CSS.escape(String(id)));
    if (!label) return;
    var q = parseInt(label.textContent || '1', 10);
    q = Math.min(20, Math.max(1, q + delta));
    label.textContent = String(q);
  }
  function getQty(id) {
    var label = qs('#quantity-' + CSS.escape(String(id)));
    return label ? parseInt(label.textContent || '1', 10) : 1;
  }
function addToCart(id) {
  var p = findProductById(id); if (!p) return;

  // Estofados siguen abriendo su builder especial
  if (p.type === 'estofado') { openEstofadoBuilder(p); return; }

  var qty = getQty(id);
  var qtyLabel = qs('#quantity-' + CSS.escape(String(id)));
  if (qtyLabel) { qtyLabel.textContent = '1'; }

  // Si NO permite adiciones (bebidas / cervezas), se agrega directo como antes
  if (!productAllowsAdiciones(p)) {
    var existing = cart.find(function (i) { return String(i.product.id) === String(id); });
    if (existing) existing.quantity += qty;
    else cart.push({ product: { id: p.id, name: p.name, price: p.price || 0 }, quantity: qty });
    persistCart(); updateCartView(); animateCart();
    if (typeof toast === 'function') toast('¡' + qty + ' ' + p.name + ' agregada(s)!');
    return;
  }

  // Productos con adiciones → modal
  pendingProduct = { id: p.id, name: p.name, price: p.price || 0, categoryId: p.categoryId };
  pendingQty = qty;
  openAdditionsModal();
}

  function removeFromCart(index) {
  var idx = parseInt(index, 10);
  if (isNaN(idx) || idx < 0 || idx >= cart.length) return;
  cart.splice(idx, 1);
  persistCart();
  updateCartView();
}

  function clearCart() { cart = []; persistCart(); updateCartView(); if (typeof toast === 'function') toast('Carrito vacío'); }
  function totalItems() { return cart.reduce(function (s, i) { return s + i.quantity; }, 0); }
  function totalAmount() { return cart.reduce(function (s, i) { return s + ((i.product.price || 0) * i.quantity); }, 0); }
  function updateCartView() {
    var countEl = qs('#cartCount'); if (countEl) countEl.textContent = String(totalItems());
    var totalEl = qs('#cartTotal'); if (totalEl) totalEl.textContent = money(totalAmount()); // Subtotal sin domicilio
    var itemsEl = qs('#cartItems'); var btn = qs('#checkoutBtn');
    if (!itemsEl) return;
    itemsEl.innerHTML = '';
    if (!cart.length) {
      itemsEl.innerHTML = '<p>Tu carrito está vacío</p>';
      if (btn) btn.disabled = true;
      return;
    }
    if (btn) btn.disabled = false;
    cart.forEach(function (it, idx)  {
      var row = document.createElement('div'); row.className = 'cart-item';
      row.innerHTML =
        '<div class="cart-item-info">' +
          '<div class="cart-item-name">' + it.product.name + '</div>' +
          '<div class="cart-item-quantity">Cantidad: ' + it.quantity + '</div>' +
        '</div>' +
        '<div class="cart-item-price">' + money((it.product.price || 0) * it.quantity) + '</div>' +
       '<button class="cart-item-remove" data-index="' + idx + '" aria-label="Eliminar">×</button>';

      itemsEl.appendChild(row);
    });
  }
  function persistCart() { try { localStorage.setItem('bdo_cart', JSON.stringify(cart)); } catch (e) {} }

  // ---------- CHECKOUT ----------
  function getAddons() { return (hasAppData() && appData.addons) ? appData.addons : []; }
  function addonQty(id) { return selectedAddons[id] || 0; }
  function changeAddonQty(id, delta) {
    var next = Math.max(0, (selectedAddons[id] || 0) + delta);
    if (next === 0) delete selectedAddons[id]; else selectedAddons[id] = next;
    renderAddonsPicker(); updateOrderSummary();
  }
  function addonsSubtotal() { return getAddons().reduce(function (sum, a) { return sum + (addonQty(a.id) * (a.price || 0)); }, 0); }
  function renderAddonsPicker() {
    var box = qs('#addonsPicker'); if (!box) return;
    var addons = getAddons();
    box.innerHTML = addons.map(function (a) {
      return '' +
        '<div class="item" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">' +
          '<div>' +
            '<strong>' + a.name + '</strong>' +
            (a.note ? '<div class="desc">' + a.note + '</div>' : '') +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<span class="precio">' + money(a.price) + '</span>' +
            '<div class="quantity-selector">' +
              '<button class="quantity-btn minus" data-addon-id="' + a.id + '">-</button>' +
              '<span class="quantity-display" aria-live="polite">' + (selectedAddons[a.id] || 0) + '</span>' +
              '<button class="quantity-btn plus" data-addon-id="' + a.id + '">+</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');
  }
  function openOrderModal() {
    if (!cart.length) { if (typeof toast === 'function') toast('Agrega productos primero'); return; }
    renderAddonsPicker();
    updateOrderSummary();
    if (orderModal) {
      orderModal.style.display = 'grid';
      orderModal.removeAttribute('hidden');
      trapFocus(orderModal);
    }
  }
  function closeOrderModal() {
    if (orderModal) {
      orderModal.style.display = 'none';
      orderModal.setAttribute('hidden', '');
      releaseTrap(orderModal);
    }
    var f = qs('#orderForm'); if (f) f.reset();
    selectedAddons = {};
    var nw = qs('#nequiWarning'); if (nw) nw.hidden = true;
  }
  function orderTotal() { return totalAmount() + addonsSubtotal() + DELIVERY_FEE; }
  function updateOrderSummary() {
    var box = qs('#orderSummary'); if (!box) return;
    var html = '<h3>Resumen de tu pedido:</h3>';
    cart.forEach(function (it, idx)  {
      html += '<div class="order-summary-item"><span>' + it.quantity + 'x ' + it.product.name + '</span><span>' + money((it.product.price || 0) * it.quantity) + '</span></div>';
    });
    var adSum = addonsSubtotal();
    if (adSum > 0) {
      html += '<div class="order-summary-ad"><span>Adiciones:</span><span>' + money(adSum) + '</span></div>';
    }
    html += '<div class="order-summary-fee"><span>Domicilio:</span><span>' + money(DELIVERY_FEE) + '</span></div>';
    html += '<div class="order-summary-total"><span>Total a pagar:</span><span>' + money(orderTotal()) + '</span></div>';
    box.innerHTML = html;
  }
  function buildWhatsAppMessage(form) {
    var name = hasAppData() && appData.config && appData.config.pizzeriaName ? appData.config.pizzeriaName : 'Bambino D’ Oro';
    var msg = '¡Hola! Quiero hacer un pedido de ' + name + ':\n\n';
    msg += '*DETALLE DEL PEDIDO:*\n';
    cart.forEach(function (it, idx) { msg += '- ' + it.quantity + 'x ' + it.product.name + ': ' + money((it.product.price || 0) * it.quantity) + '\n'; });
    var addons = getAddons().filter(function (a) { return (selectedAddons[a.id] || 0) > 0; });
    if (addons.length) {
      msg += '\n*ADICIONES:*\n';
      addons.forEach(function (a) { var q = (selectedAddons[a.id] || 0); msg += '- ' + q + 'x ' + a.name + ': ' + money(q * (a.price || 0)) + '\n'; });
    }
    msg += '\n- Domicilio: ' + money(DELIVERY_FEE) + '\n';
    msg += '*Total: ' + money(orderTotal()) + '*\n\n';
    msg += '*INFORMACIÓN DEL CLIENTE:*\n';
    msg += '- Nombre: ' + (form.customerName || '') + '\n';
    msg += '- Teléfono: ' + (form.phone || '') + '\n';
    msg += '- Dirección: ' + (form.address || '') + '\n';
     // NUEVO: ubicación (si el cliente la compartió)
  if (form.locationLink) {
    msg += '- Ubicación: ' + form.locationLink + '\n';
  }
    msg += '- Método de pago: ' + (form.paymentMethod || '') + '\n';
    if (form.cashAmount) {
      var efectivoNum = Number(String(form.cashAmount).replace(/[^\d]/g, '')) || 0;
      msg += '- Paga con: ' + money(efectivoNum) + '\n';
    }
    if (form.paymentMethod === 'Nequi') {
      msg += '\n*Aviso:* No olvide enviar su comprobante de pago. Si no lo envía, el pedido no se realizará.\n';
    }
    if (form.notes) msg += '- Notas adicionales: ' + form.notes + '\n';
    msg += '\n¡Gracias!';
    return encodeURIComponent(msg);
  }
  function normalizeWhatsAppNumber(raw) {
    var digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 10) return '57' + digits;
    return digits;
  }
  function sendOrderToWhatsApp(form) {
    var number = (hasAppData() && appData.config && appData.config.whatsappNumber) ? appData.config.whatsappNumber : '';
    var phone = normalizeWhatsAppNumber(number);
    if (!phone) { if (typeof toast === 'function') toast('Número de WhatsApp no configurado'); return; }
    var url = 'https://wa.me/' + phone + '?text=' + buildWhatsAppMessage(form);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  function handleOrderSubmit(e) {
    e.preventDefault();
    var form = {
      customerName: (qs('#customerName') && qs('#customerName').value || '').trim(),
      phone: (qs('#phone') && qs('#phone').value || '').trim(),
      address: (qs('#address') && qs('#address').value || '').trim(),
      paymentMethod: (qs('#paymentMethod') && qs('#paymentMethod').value || ''),
      notes: (qs('#notes') && qs('#notes').value || '').trim()
    };
    form.cashAmount = (qs('#cashAmount') && qs('#cashAmount').value || '').trim();

     if (clientLocation && clientLocation.lat && clientLocation.lng) {
    form.locationLink = 'https://www.google.com/maps?q=' +
      clientLocation.lat + ',' + clientLocation.lng;
  } else {
    form.locationLink = '';
  }

  var warningBox = qs('#orderWarning');

if (!form.customerName || !form.phone || !form.address || !form.paymentMethod) {
  if (warningBox) {
  warningBox.textContent = 'Por favor completa todos los campos obligatorios.';
  warningBox.hidden = false;

  setTimeout(() => {
    warningBox.hidden = true;
  }, 3000);
}

  return;
}

// si todo está bien, ocultamos el aviso
if (warningBox) warningBox.hidden = true;


  sendOrderToWhatsApp(form);
  clearCart();
  closeOrderModal();
  if (typeof toast === 'function') toast('¡Pedido enviado!');


    if (!form.customerName || !form.phone || !form.address || !form.paymentMethod) {
      if (typeof toast === 'function') toast('Completa los campos obligatorios');
      return;
    }

    sendOrderToWhatsApp(form);
    clearCart();
    closeOrderModal();
    if (typeof toast === 'function') toast('¡Pedido enviado!');

    
  }

  

  // --- Pizza/Estofado builders ---
  var builder = { size: null, slices: null, mode: 'tradicional', qty: 1, saborTrad: null, saborEsp: null, mitad1: null, mitad2: null };
  function openPizzaBuilder(sizeId) {
    builder.size = sizeId; builder.slices = null; builder.mode = 'tradicional'; builder.qty = 1;
    builder.saborTrad = builder.saborEsp = builder.mitad1 = builder.mitad2 = null;
    renderBuilder();
    if (pizzaModal) {
      pizzaModal.style.display = 'grid';
      pizzaModal.removeAttribute('hidden');
      trapFocus(pizzaModal);
      bindOutsideOnce(pizzaModal, closePizzaBuilder);
    }
  }
  function closePizzaBuilder() {
    if (pizzaModal) {
      pizzaModal.style.display = 'none';
      pizzaModal.setAttribute('hidden', '');
      releaseTrap(pizzaModal);
      unbindOutside(pizzaModal);
    }
  }
  function renderBuilder() {
    renderBuilderSizePicker();
    renderSliceOptions();
    renderBuilderSelectors();
    updateBuilderView();
  }
  function renderBuilderSizePicker() {
    var cont = qs('#sizePicker'); if (!cont) return;
    cont.innerHTML = '';
    var sizes = (hasAppData() && appData.pizzaOptions && appData.pizzaOptions.sizes) ? appData.pizzaOptions.sizes : [];
    sizes.forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'size-btn' + (builder.size === s.id ? ' active' : '');
      b.textContent = s.label;
      b.addEventListener('click', function () { builder.size = s.id; builder.slices = null; renderBuilder(); });
      cont.appendChild(b);
    });
  }
  function renderSliceOptions() {
    var cont = qs('#sliceOptions'); if (!cont) return;
    cont.innerHTML = '';
    var list = (hasAppData() && appData.pizzaOptions && appData.pizzaOptions.slices && appData.pizzaOptions.slices[builder.size]) || [];
    list.forEach(function (num) {
      var b = document.createElement('button');
      b.className = 'slice-btn' + (builder.slices === num ? ' active' : '');
      b.textContent = num + ' porciones';
      b.addEventListener('click', function () { builder.slices = num; renderSliceOptions(); updateBuilderView(); });
      cont.appendChild(b);
    });
  }
  function getPizzaCategory() {
    var cats = (hasAppData() && appData.categories) ? appData.categories : [];
    return cats.find(function (c) { return c.id === 'pizza'; });
  }
  function renderBuilderSelectors() {
  var pizza = getPizzaCategory() || { products: [] };
  var trad = (pizza.products || []).filter(function (p) { return p.group === 'tradicional'; });
  var esp  = (pizza.products || []).filter(function (p) { return p.group === 'especial'; });
  var all  = trad.concat(esp);

  var selTrad = qs('#selectTradicional'),
      selEsp  = qs('#selectEspecial'),
      selM1   = qs('#selectMixta1'),
      selM2   = qs('#selectMixta2');

  // Relleno básico (tradicional y especial)
  function fillBasic(el, arr, selectedId) {
    if (!el) return;
    el.innerHTML = '<option value="">Selecciona un sabor</option>';
    (arr || []).forEach(function (p) {
      var o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.name + ' (' + money(p.price) + ')';
      if (selectedId && p.id === selectedId) o.selected = true;
      el.appendChild(o);
    });
  }

  // Relleno especial para Mixta: agrupado por categorías y excluyendo el otro sabor
  function fillMixtaSelect(el, excludeId, selectedId) {
    if (!el) return;
    el.innerHTML = '<option value="">Selecciona un sabor</option>';

    function appendGroup(label, list) {
      if (!list || !list.length) return;
      var og = document.createElement('optgroup');
      og.label = label;
      list.forEach(function (p) {
        if (excludeId && p.id === excludeId) return; // no mostrar el sabor ya elegido en la otra mitad
        var o = document.createElement('option');
        o.value = p.id;
        o.textContent = p.name + ' (' + money(p.price) + ')';
        if (selectedId && p.id === selectedId) o.selected = true;
        og.appendChild(o);
      });
      el.appendChild(og);
    }

    appendGroup('Tradicionales', trad);
    appendGroup('Especiales',   esp);
  }

  function fillMixtaBoth() {
    fillMixtaSelect(selM1, builder.mitad2, builder.mitad1);
    fillMixtaSelect(selM2, builder.mitad1, builder.mitad2);
  }

  // Inicializar selects
  fillBasic(selTrad, trad, builder.saborTrad);
  fillBasic(selEsp,  esp,  builder.saborEsp);
  fillMixtaBoth();

  // Handlers de cambio
  if (selTrad) {
    selTrad.onchange = function () {
      builder.saborTrad = parseInt(selTrad.value || 0, 10) || null;
      updateBuilderView();
    };
  }

  if (selEsp) {
    selEsp.onchange = function () {
      builder.saborEsp = parseInt(selEsp.value || 0, 10) || null;
      updateBuilderView();
    };
  }

  if (selM1) {
    selM1.onchange = function () {
      var val = parseInt(selM1.value || 0, 10) || null;
      // si eligen el mismo sabor que la otra mitad, se limpia la otra
      if (val && val === builder.mitad2) {
        builder.mitad2 = null;
      }
      builder.mitad1 = val;
      fillMixtaBoth();
      updateBuilderView();
    };
  }

  if (selM2) {
    selM2.onchange = function () {
      var val = parseInt(selM2.value || 0, 10) || null;
      if (val && val === builder.mitad1) {
        builder.mitad1 = null;
      }
      builder.mitad2 = val;
      fillMixtaBoth();
      updateBuilderView();
    };
  }

  // Tabs (Tradicional / Especial / Mixta)
  // Usar solo el ámbito del modal de pizza, no todo el documento
var scope = pizzaModal || document;

qsa('.tab-btn', scope).forEach(function (b) {
  b.addEventListener('click', function () {
    // Activar solo los tabs dentro del modal de pizza
    qsa('.tab-btn', scope).forEach(function (x) { x.classList.remove('active'); });
    b.classList.add('active');

    builder.mode = b.getAttribute('data-tab');

    // Ocultar solo los contenidos de pestañas del modal de pizza
    qsa('.tab-content', scope).forEach(function (c) { c.classList.add('hidden'); });

    var tab = qs('#tab-' + builder.mode, scope);
    if (tab) tab.classList.remove('hidden');

    updateBuilderView();
  });
});


  // Mostrar / ocultar pestaña Mixta por tamaño
  var mixtaTab     = qs('.tab-btn[data-tab="mixta"]');
  var mixtaContent = qs('#tab-mixta');
  var mixtaAllowed = (builder.size === 'familiar' || builder.size === 'mediana' || builder.size === 'junior');

  if (mixtaTab && mixtaContent) {
    if (!mixtaAllowed) {
      mixtaTab.classList.add('hidden');
      mixtaContent.classList.add('hidden');

      // Si estaba en modo Mixta y cambia a un tamaño que no la permite,
      // forzar regreso a Tradicional
      if (builder.mode === 'mixta') {
        builder.mode = 'tradicional';
        qsa('.tab-btn').forEach(function (btn) {
          var t = btn.getAttribute('data-tab');
          if (t === 'tradicional') btn.classList.add('active');
          else btn.classList.remove('active');
        });
        qsa('.tab-content').forEach(function (c) { c.classList.add('hidden'); });
        var tabTrad = qs('#tab-tradicional');
        if (tabTrad) tabTrad.classList.remove('hidden');
      }
    } else {
      mixtaTab.classList.remove('hidden');
      // el contenido se muestra solo si el tab está activo
    }
  }

  // Cantidad y botón Agregar
  var minus = qs('#builderQtyMinus');
  var plus  = qs('#builderQtyPlus');
  var add   = qs('#builderAddBtn');
  if (minus) minus.addEventListener('click', function () { builder.qty = Math.max(1, builder.qty - 1); updateBuilderView(); });
  if (plus)  plus.addEventListener('click', function () { builder.qty = Math.min(20, builder.qty + 1); updateBuilderView(); });
  if (add)   add.addEventListener('click', addBuilderPizzaToCart);

  qsa('.builder-close').forEach(function (b) { b.addEventListener('click', closePizzaBuilder); });
}
function getPizzaGroupById(id) {
  var p = findProductById(id);
  return p ? p.group : null;
}

function computeBuilderPrice() {
  var t = (hasAppData() && appData.pizzaOptions && appData.pizzaOptions.sizePrices && appData.pizzaOptions.sizePrices[builder.size]) || null;
  if (!t) return 0;

  // Tradicional / Especial
  if (builder.mode === 'tradicional' && builder.saborTrad) return t.tradicional || 0;
  if (builder.mode === 'especial'   && builder.saborEsp)   return t.especial   || 0;

  // ----- Lógica especial para Mixta -----
  if (builder.mode === 'mixta' && builder.mitad1 && builder.mitad2) {
    if (builder.size === 'personal' || builder.size === 'mini') return 0;

    var g1 = getPizzaGroupById(builder.mitad1);
    var g2 = getPizzaGroupById(builder.mitad2);
    if (!g1 || !g2) return 0;

    var comboType;
    if (g1 === 'tradicional' && g2 === 'tradicional') {
      comboType = 'TT';
    } else if (g1 === 'especial' && g2 === 'especial') {
      comboType = 'EE';
    } else if (
      (g1 === 'tradicional' && g2 === 'especial') ||
      (g1 === 'especial' && g2 === 'tradicional')
    ) {
      comboType = 'TE';
    } else {
      return 0;
    }

        var mixtaPrices = {
      familiar: { TT: 63000, TE: 67000, EE: 72000 },
      mediana:  { TT: 42000, TE: 45000, EE: 48000 },
      junior:   { TT: 32000, TE: 35000, EE: 37000 }
    };


    var bySize = mixtaPrices[builder.size];
    if (!bySize) return 0;

    return bySize[comboType] || 0;
  }

  return 0;
}



  function pickName(id) { var p = findProductById(id); return p ? p.name : ''; }
  function updateBuilderView() {
    var sizes = (hasAppData() && appData.pizzaOptions && appData.pizzaOptions.sizes) ? appData.pizzaOptions.sizes : [];
    var sizeObj = sizes.find(function (s) { return s.id === builder.size; });
    var sizeLabel = sizeObj ? sizeObj.label : '';
    var detail = '';
    if (builder.mode === 'tradicional') detail = pickName(builder.saborTrad);
    if (builder.mode === 'especial') detail = pickName(builder.saborEsp);
    if (builder.mode === 'mixta') detail = '1/2 ' + pickName(builder.mitad1) + ' + 1/2 ' + pickName(builder.mitad2);
    var slicesText = builder.slices ? ' • ' + builder.slices + ' porciones' : '';
    var nameEl = qs('#builderName'); if (nameEl) nameEl.textContent = 'Pizza ' + sizeLabel;
    var detEl = qs('#builderDetail'); if (detEl) detEl.textContent = (detail || 'Selecciona un sabor') + slicesText;
    var qtyEl = qs('#builderQty'); if (qtyEl) qtyEl.textContent = String(builder.qty);
    var priceEl = qs('#builderPrice'); if (priceEl) priceEl.textContent = money(computeBuilderPrice() * builder.qty);
  }
  function addBuilderPizzaToCart() {
  var price = computeBuilderPrice();
  if (!price) { if (typeof toast === 'function') toast('Selecciona un sabor'); return; }

  var sizes = (hasAppData() && appData.pizzaOptions && appData.pizzaOptions.sizes) ? appData.pizzaOptions.sizes : [];
  var sizeObj = sizes.find(function (s) { return s.id === builder.size; });
  var sizeLabel = sizeObj ? sizeObj.label : '';
  var name = 'Pizza ' + sizeLabel + ' - ';
  if (builder.mode === 'tradicional') name += pickName(builder.saborTrad);
  if (builder.mode === 'especial') name += pickName(builder.saborEsp);
  if (builder.mode === 'mixta') name += '1/2 ' + pickName(builder.mitad1) + ' + 1/2 ' + pickName(builder.mitad2);
  if (builder.slices) name += ' (' + builder.slices + ' porciones)';

  var baseProduct = { id: 'b-' + Date.now(), name: name, price: price };

  // Siempre permite adiciones (no es bebida/cerveza)
  pendingProduct = baseProduct;
  pendingQty = builder.qty;

  closePizzaBuilder();      // cerramos el builder
  openAdditionsModal();     // abrimos adiciones
}


  // --- Estofado ---
  var estofado = { baseProduct: null, qty: 1, s1: null, s2: null };
  function openEstofadoBuilder(product) {
    estofado.baseProduct = product;
    estofado.qty = 1; estofado.s1 = null; estofado.s2 = null;
    renderEstofadoBuilder();
    if (estofadoModal) {
      estofadoModal.style.display = 'grid';
      estofadoModal.removeAttribute('hidden');
      trapFocus(estofadoModal);
      bindOutsideOnce(estofadoModal, closeEstofadoBuilder);
    }
  }
  function closeEstofadoBuilder() {
    if (estofadoModal) {
      estofadoModal.style.display = 'none';
      estofadoModal.setAttribute('hidden', '');
      releaseTrap(estofadoModal);
      unbindOutside(estofadoModal);
    }
  }
  function renderEstofadoBuilder() {
    var pizza = getPizzaCategory() || { products: [] };
    var trad = (pizza.products || []).filter(function (p) { return p.group === 'tradicional'; });
    var esp = (pizza.products || []).filter(function (p) { return p.group === 'especial'; });
    var all = trad.concat(esp);

    var allowed = all.filter(isAllowedEstofadoFlavor);

    var sel1 = qs('#selectEst1'), sel2 = qs('#selectEst2');
    function fill(el) {
      if (!el) return;
      el.innerHTML = '<option value="">Selecciona un sabor</option>';
      allowed.forEach(function (p) {
        var o = document.createElement('option');
        o.value = p.id;
        o.textContent = p.name;
        el.appendChild(o);
      });
    }
    fill(sel1); fill(sel2);

    // guardar sabores seleccionados
    if (sel1) sel1.onchange = function(){ estofado.s1 = parseInt(sel1.value || 0, 10) || null; updateEstofadoView(); };
    if (sel2) sel2.onchange = function(){ estofado.s2 = parseInt(sel2.value || 0, 10) || null; updateEstofadoView(); };

    var info = qs('#estofadoInfo');
    if (info && estofado.baseProduct) info.textContent = estofado.baseProduct.description || '';

    var modalImgBox = qs('#estofadoImageBox');
    if (modalImgBox) {
      if (estofado.baseProduct && estofado.baseProduct.image) {
        modalImgBox.innerHTML = '<img src="' + estofado.baseProduct.image + '" alt="' + estofado.baseProduct.name + '" class="estofado-img">';
      } else {
        modalImgBox.innerHTML = '<div class="no-image">Sin imagen disponible</div>';
      }
    }

    var minus = qs('#estofadoQtyMinus'); var plus = qs('#estofadoQtyPlus'); var add = qs('#estofadoAddBtn');
    if (minus) minus.onclick = function () { estofado.qty = Math.max(1, estofado.qty - 1); updateEstofadoView(); };
    if (plus) plus.onclick = function () { estofado.qty = Math.min(20, estofado.qty + 1); updateEstofadoView(); };
    if (add) add.onclick = addEstofadoToCart;

    qsa('.estofado-close').forEach(function (b) { b.onclick = closeEstofadoBuilder; });

    updateEstofadoView();
  }
  function updateEstofadoView() {
    var n1 = pickName(estofado.s1), n2 = pickName(estofado.s2);
    var nameEl = qs('#estofadoName'); if (nameEl) nameEl.textContent = estofado.baseProduct ? estofado.baseProduct.name : 'Estofado';
    var detEl = qs('#estofadoDetail'); if (detEl) detEl.textContent = (n1 && n2) ? (n1 + ' + ' + n2) : 'Elige 2 sabores';
    var qtyEl = qs('#estofadoQty'); if (qtyEl) qtyEl.textContent = String(estofado.qty);
    var priceEl = qs('#estofadoPrice'); if (priceEl) priceEl.textContent = money((estofado.baseProduct ? (estofado.baseProduct.price || 0) : 0) * estofado.qty);
  }
  function addEstofadoToCart() {
  if (!estofado.baseProduct) return;
  if (!estofado.s1 || !estofado.s2) {
    if (typeof toast === 'function') toast('Elige los 2 sabores');
    return;
  }
  var n1 = pickName(estofado.s1), n2 = pickName(estofado.s2);
  var name = estofado.baseProduct.name + ' - ' + n1 + ' + ' + n2;
  var price = estofado.baseProduct.price || 0;

  var baseProduct = { id: 'e-' + Date.now(), name: name, price: price };

  pendingProduct = baseProduct;
  pendingQty = estofado.qty;

  closeEstofadoBuilder();
  openAdditionsModal();
}
function setupLocationButton() {
  var btn = document.getElementById('useLocationBtn');
  var status = document.getElementById('locationStatus');

  if (!btn) return;

  // Si el navegador no soporta geolocalización
  if (!('geolocation' in navigator)) {
    if (status) {
      status.textContent = 'Tu dispositivo no permite ubicación automática. Puedes escribir la dirección manualmente.';
    }
    btn.disabled = true;
    return;
  }

  btn.addEventListener('click', function () {
    if (status) status.textContent = 'Obteniendo ubicación...';
    btn.disabled = true;
    btn.classList.add('loading');

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        clientLocation = {
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6)
        };
        if (status) status.textContent = 'Ubicación agregada al pedido ✅';
        btn.classList.remove('loading');
      },
      function (err) {
        console.warn('Error geolocalización', err);
        clientLocation = null;
        if (status) status.textContent = 'No se pudo obtener la ubicación. Revisa los permisos de ubicación.';
        btn.disabled = false;
        btn.classList.remove('loading');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}


  // -------------- Eventos ----------------
  function addEventListeners() {
  document.addEventListener('click', function (e) {
    var cardLink = hasClosest(e.target, '.card[data-cat][href^="#"]');
    if (cardLink) {
      setTimeout(route, 0);
    }

    var qtyBtn = hasClosest(e.target, '.quantity-btn');
    if (qtyBtn) {
      var isPlus = qtyBtn.classList.contains('plus');
      var prodId = qtyBtn.getAttribute('data-product-id');
      var addonId = qtyBtn.getAttribute('data-addon-id');
      if (prodId) { updateQuantity(prodId, isPlus ? +1 : -1); return; }
      if (addonId) { changeAddonQty(addonId, isPlus ? +1 : -1); return; }
    }

    var addBtn = hasClosest(e.target, '.btn-add-to-cart');
    if (addBtn) { addToCart(addBtn.getAttribute('data-product-id')); return; }

    var remBtn = hasClosest(e.target, '.cart-item-remove');
    if (remBtn) {
      removeFromCart(remBtn.getAttribute('data-index'));
      return;
    }

    var back = hasClosest(e.target, '[data-back]');
    if (back) { location.hash = '#home'; return; }

    var cartIcon = hasClosest(e.target, '.cart-icon');
    if (cartIcon) {
      var panel = qs('#cartPanel');
      var expanded = cartIcon.getAttribute('aria-expanded') === 'true';
      cartIcon.setAttribute('aria-expanded', String(!expanded));
      if (panel) panel.classList.toggle('open');
      return;
    }

    var checkout = hasClosest(e.target, '#checkoutBtn') || hasClosest(e.target, '.btn-checkout');
    if (checkout) { openOrderModal(); return; }

    if (e.target === orderModal) { closeOrderModal(); }
    if (e.target === pizzaModal) { closePizzaBuilder(); }
    if (e.target === estofadoModal) { closeEstofadoBuilder(); }
    if (hasClosest(e.target, '#orderModal .close')) { closeOrderModal(); }
    if (hasClosest(e.target, '#pizzaBuilderModal .close')) { closePizzaBuilder(); }
    if (hasClosest(e.target, '#estofadoModal .close')) { closeEstofadoBuilder(); }
  });

  var pm = qs('#paymentMethod');
  if (pm) {
    pm.addEventListener('change', function () {
      var nw = qs('#nequiWarning');
      if (!nw) return;
      nw.hidden = (pm.value !== 'Nequi');
    });
  }

  var clearBtn = qs('#clearCartBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', function () { clearCart(); });
  }

  var orderForm = qs('#orderForm');
  if (orderForm) {
    orderForm.addEventListener('submit', handleOrderSubmit);
  }

  // ⬇️ AQUÍ llamamos al botón de ubicación
  setupLocationButton();
}


  // ---- Eventos del modal de Adiciones ----
var addonsConfirm = qs('#addonsConfirm');
if (addonsConfirm) {
  addonsConfirm.addEventListener('click', function (e) {
    e.preventDefault();
    confirmAdditions();
  });
}

var addonsSkip = qs('#addonsSkip');
if (addonsSkip) {
  addonsSkip.addEventListener('click', function (e) {
    e.preventDefault();
    // Sin adiciones: usamos el producto base
    if (pendingProduct) {
      cart.push({ product: pendingProduct, quantity: pendingQty });
      persistCart(); updateCartView(); animateCart();
      if (typeof toast === 'function') toast(pendingQty + ' ' + pendingProduct.name + ' agregada(s)');
    }
    pendingProduct = null;
    pendingQty = 1;
    closeAdditionsModal();
  });
}

var addonsClose = qs('#addonsClose');
if (addonsClose) {
  addonsClose.addEventListener('click', function () {
    pendingProduct = null;
    pendingQty = 1;
    closeAdditionsModal();
  });
}

// Cerrar si se hace clic en el fondo del modal
document.addEventListener('click', function (e) {
  if (e.target === addonsModal) {
    pendingProduct = null;
    pendingQty = 1;
    closeAdditionsModal();
  }
});


  // --- util: focus trap ---
  var lastFocused = null;
  function trapFocus(modal) {
    lastFocused = document.activeElement;
    var focusables = qsa('button, [href], input, select, textarea, [tabindex]:not([disabled])', modal)
      .filter(function (el) { return !el.hasAttribute('disabled'); });
    if (focusables[0]) focusables[0].focus();
    function onKey(e) {
      if (e.key !== 'Tab') return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
    modal.addEventListener('keydown', onKey);
    modal._trapHandler = onKey;
  }
  function releaseTrap(modal) {
    if (modal && modal._trapHandler) {
      modal.removeEventListener('keydown', modal._trapHandler);
      modal._trapHandler = null;
    }
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }
  function bindOutsideOnce(modal, onClose) {
    if (modal._outsideBound) return;
    modal._outsideBound = true;
    function outside(e) { if (e.target === modal) { onClose(); } }
    modal._outsideHandler = outside;
    window.addEventListener('click', outside);
  }
  function unbindOutside(modal) {
    if (!modal || !modal._outsideBound) return;
    window.removeEventListener('click', modal._outsideHandler);
    modal._outsideHandler = null;
    modal._outsideBound = false;
  }
})();
