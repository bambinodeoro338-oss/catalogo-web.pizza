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

  // Para modal de adiciones
  var pendingProduct = null; // { id, name, price, categoryId? }
  var pendingQty = 1;

  // Para geolocalización
  var clientLocation = null;

  var $home = document.getElementById('home');
  var $vista = document.getElementById('vista');
  var orderModal = document.getElementById('orderModal');
  var pizzaModal = document.getElementById('pizzaBuilderModal');
  var estofadoModal = document.getElementById('estofadoModal');
  var addonsModal = document.getElementById('addonsModal');

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function hasClosest(el, selector) {
    while (el) {
      if (el.matches && el.matches(selector)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function money(v) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(v || 0);
  }

  // Normalización de datos (Pizza Paisa -> especial, etc.)
  function normalizeData() {
    if (!hasAppData() || !appData.categories) return;
    var pizzaCat = appData.categories.find(function (c) { return c.id === 'pizza'; });
    if (!pizzaCat) return;
    (pizzaCat.products || []).forEach(function (p) {
      var name = (p.name || '').toLowerCase();
      if (name.includes('paisa') && p.group !== 'especial') {
        p.group = 'especial';
      }
    });
  }

  function normalizeText(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Sabores permitidos Estofados
  function isAllowedEstofadoFlavor(product) {
    var n = normalizeText(product && product.name);
    if (!n) return false;
    if (n.includes('hawa')) return true;
    if (n.includes('kabano') || n.includes('cabano')) return true;
    if (n.includes('jamon') && n.includes('queso')) return true;
    if (n.includes('pollo') && (n.includes('champi') || n.includes('champin'))) return true;
    return false;
  }

  function animateCart() {
    var cartIcon = qs('.cart-icon');
    if (!cartIcon) return;
    cartIcon.classList.add('highlight');
    setTimeout(function () { cartIcon.classList.remove('highlight'); }, 800);
  }

  // Routing
  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', function () {
    normalizeData();
    initHeaderFooter();
    renderHome();
    route();
    addEventListeners();
    updateCartView();
  });
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(route, 0);
  }

  function initHeaderFooter() {
    try {
      if (hasAppData() && appData.config) {
        var nameEl = qs('#pizzeriaName');
        if (nameEl) nameEl.textContent = '🍕 ' + appData.config.pizzeriaName;

        var waEl = qs('#whatsappNumber');
        if (waEl) waEl.textContent = appData.config.whatsappNumber || '—';

        var hrsEl = qs('#businessHours');
        if (hrsEl) hrsEl.textContent = appData.config.businessHours || '—';
      }
    } catch (e) {
      console.warn(e);
    }
  }

  function normalizeHash(h) {
    if (!h || h === '#') return 'home';
    if (h.charAt(0) === '#') h = h.slice(1);
    return h || 'home';
  }

  function route() {
    var hash = normalizeHash(location.hash);
    if (hash === 'home') {
      showHome();
      return;
    }
    var cats = (hasAppData() && appData.categories) ? appData.categories : [];
    var cat = cats.find(function (c) { return String(c.id) === String(hash); });
    if (cat) {
      renderCategory(hash);
      showVista();
      window.scrollTo(0, 0);
    } else {
      showHome();
    }
  }


  function showHome() {
    if ($home) $home.classList.remove('hidden');
    if ($vista) $vista.classList.add('hidden');
    document.title = 'Menú – Bambino D’ Oro';
  }
  function showVista() {
    if ($home) $home.classList.add('hidden');
    if ($vista) $vista.classList.remove('hidden');
  }

  function renderHome() {
    var cats = (hasAppData() && appData.categories) ? appData.categories : [];
    if (!$home) return;
    $home.innerHTML = cats.map(function (c) {
      return '<a class="card" data-cat="' + c.id + '" href="#' + c.id + '">' +
        '<span style="font-size:1.1rem;margin-right:.4rem">' + (c.icon || '') + '</span>' +
        (c.name || '') +
      '</a>';
    }).join('');
  }

  function renderCategory(catId) {
    var categories = (hasAppData() && appData.categories) ? appData.categories : [];
    var category = categories.find(function (c) { return String(c.id) === String(catId); });
    if (!$vista) return;

    if (!category) {
      $vista.innerHTML = '<p>No se encontró la categoría</p>';
      return;
    }

    $vista.style.backgroundImage = "url('images/fondos/fondo-" + category.id + ".png')";
    $vista.style.backgroundSize = "350px";
    $vista.style.backgroundPosition = "center";
    $vista.style.backgroundRepeat = "repeat";
    $vista.style.backgroundAttachment = "fixed";

    var products = category.products || [];
    var gridId = 'grid-' + category.id;

    var isPizzaPortions = category.id === 'pizza';
    var isPizzaSizes = category.id === 'pizza-tamanos';

    var sizes = isPizzaSizes
      ? ((hasAppData() && appData.pizzaOptions && appData.pizzaOptions.sizes) || [])
      : [];

    var tabsHtml = isPizzaPortions ? (
      '<div class="tabs" role="tablist">' +
        '<button class="tab active" data-group="tradicional" aria-selected="true">Individuales – Tradicionales</button>' +
        '<button class="tab" data-group="especial">Individuales – Especiales</button>' +
      '</div>'
    ) : '';

    $vista.innerHTML =
      '<button class="back" data-back>← Volver</button>' +
      '<h2 class="chalk">' + category.name + ' <span class="badge"><span>•</span> ' + products.length + ' items</span></h2>' +
      (sizes.length
        ? '<section class="panel">' +
            '<div class="panel-head">' +
              '<h3 class="chalk">Arma tu Pizza</h3>' +
              '<small>Elige tamaño y sabor / mitad y mitad</small>' +
            '</div>' +
            '<div class="size-picker" id="sizesRow"></div>' +
          '</section>'
        : ''
      ) +
      tabsHtml +
      '<div class="items" id="' + gridId + '"></div>';

    if (sizes.length) {
      var sr = qs('#sizesRow');
      if (sr) {
        sizes.forEach(function (s) {
          var b = document.createElement('button');
          b.className = 'size-btn';
          b.setAttribute('data-builder-size', s.id);
          if (s.image) {
            b.classList.add('size-btn-has-image');
            b.innerHTML =
              '<img class="size-thumb" src="' + s.image + '" alt="' +
                (s.label || ('Pizza ' + s.id)) + '" loading="lazy">' +
              '<span class="size-label">' + s.label + '</span>';
          } else {
            b.textContent = s.label;
          }
          sr.appendChild(b);
        });
      }
    }

    var grid = document.getElementById(gridId);
    var initialGroup = isPizzaPortions ? 'tradicional' : null;
    renderProductsGrid(grid, products, initialGroup);

    if (isPizzaPortions) {
      qsa('.tab', $vista).forEach(function (btn) {
        btn.onclick = function () {
          qsa('.tab', $vista).forEach(function (x) { x.classList.remove('active'); });
          btn.classList.add('active');
          var group = btn.getAttribute('data-group');
          renderProductsGrid(grid, products, group);
        };
      });
    }

    document.title = category.name + ' – Bambino D’ Oro';
  }

  function renderProductsGrid(gridEl, products, groupFilter) {
    if (!gridEl) return;
    gridEl.innerHTML = '';
    var list = groupFilter
      ? products.filter(function (p) { return p.group === groupFilter; })
      : products;
    list.forEach(function (p) { gridEl.appendChild(productCard(p)); });
  }

  function productCard(p) {
    var el = document.createElement('article');
    el.className = 'item';
    el.dataset.productId = p.id;

    var photo = p.image
      ? '<div class="photo"><img src="' + p.image +
        '" alt="' + p.name + ' de Bambino D’Oro" loading="lazy"></div>'
      : '';

    el.innerHTML =
      photo +
      '<h3>' + (p.icon ? (p.icon + ' ') : '') + p.name +
        ' <span class="precio">' + money(p.price) + '</span>' +
      '</h3>' +
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

  // =========================
  // CARRITO
  // =========================

  function findProductById(id) {
    var cats = (hasAppData() && appData.categories) ? appData.categories : [];
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i];
      var pr = (c.products || []).find(function (p) { return String(p.id) === String(id); });
      if (pr) {
        if (!pr.categoryId) pr.categoryId = c.id;
        return pr;
      }
    }
    return null;
  }

  function productAllowsAdiciones(product) {
    var cat = product && product.categoryId;
    if (cat === 'beverages') return false;
    return true;
  }

  function getAdicionesCatalog() {
    if (!hasAppData()) return [];
    if (Array.isArray(appData.adiciones)) return appData.adiciones;
    if (Array.isArray(appData.addons)) return appData.addons;
    return [];
  }

  function updateQuantity(id, delta) {
    var label = qs('#quantity-' + CSS.escape(String(id)));
    if (!label) return;
    var q = parseInt(label.textContent || '1', 10);
    q = Math.max(1, Math.min(20, q + delta));
    label.textContent = String(q);
  }
  function getQty(id) {
    var label = qs('#quantity-' + CSS.escape(String(id)));
    return label ? parseInt(label.textContent || '1', 10) : 1;
  }

  function openAdditionsModal() {
    if (!addonsModal || !pendingProduct) {
      if (pendingProduct) {
        cart.push({ product: pendingProduct, quantity: pendingQty });
        persistCart();
        updateCartView();
        animateCart();
        if (typeof toast === 'function') {
          toast(pendingQty + ' ' + pendingProduct.name + ' agregada(s)');
        }
      }
      pendingProduct = null;
      pendingQty = 1;
      return;
    }

    var list = qs('#addonsList', addonsModal);
    if (!list) return;

    var catalog = getAdicionesCatalog();
    list.innerHTML = catalog.map(function (a) {
      return '<label class="addon-option">' +
        '<input type="checkbox" data-addon-id="' + a.id + '">' +
        (a.icon ? '<span class="addon-icon">' + a.icon + '</span>' : '') +
        '<span class="addon-name">' + a.name + '</span>' +
        '<span class="addon-price">+' + money(a.price || 0) + '</span>' +
      '</label>';
    }).join('');

    addonsModal.style.display = 'grid';
    addonsModal.removeAttribute('hidden');
    trapFocus(addonsModal);
  }

  function closeAdditionsModal() {
    if (!addonsModal) return;
    addonsModal.style.display = 'none';
    addonsModal.setAttribute('hidden', '');
    releaseTrap(addonsModal);
  }

  function confirmAdditions() {
    if (!pendingProduct) {
      closeAdditionsModal();
      return;
    }

    var list = qs('#addonsList', addonsModal);
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

    var finalProduct = {
      id: String(pendingProduct.id) + '-a-' + Date.now(),
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
    persistCart();
    updateCartView();
    animateCart();

    if (typeof toast === 'function') {
      toast(pendingQty + ' ' + finalProduct.name + ' agregada(s)');
    }

    pendingProduct = null;
    pendingQty = 1;
    closeAdditionsModal();
  }

  function addToCart(id) {
    var p = findProductById(id);
    if (!p) return;

    if (p.type === 'estofado') {
      openEstofadoBuilder(p);
      return;
    }

    var qty = getQty(id);
    var qtyLabel = qs('#quantity-' + CSS.escape(String(id)));
    if (qtyLabel) qtyLabel.textContent = '1';

    if (!productAllowsAdiciones(p)) {
      var existing = cart.find(function (i) { return String(i.product.id) === String(id); });
      if (existing) existing.quantity += qty;
      else cart.push({ product: { id: p.id, name: p.name, price: p.price || 0 }, quantity: qty });

      persistCart();
      updateCartView();
      animateCart();
      if (typeof toast === 'function') {
        toast('¡' + qty + ' ' + p.name + ' agregada(s)!');
      }
      return;
    }

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

  function clearCart() {
    cart = [];
    persistCart();
    updateCartView();
    if (typeof toast === 'function') toast('Carrito vacío');
  }

  function totalItems() {
    return cart.reduce(function (s, i) { return s + i.quantity; }, 0);
  }
  function totalAmount() {
    return cart.reduce(function (s, i) {
      return s + ((i.product.price || 0) * i.quantity);
    }, 0);
  }

  function updateCartView() {
    var countEl = qs('#cartCount');
    if (countEl) countEl.textContent = String(totalItems());

    var totalEl = qs('#cartTotal');
    if (totalEl) totalEl.textContent = money(totalAmount());

    var itemsEl = qs('#cartItems');
    var btn = qs('#checkoutBtn');
    if (!itemsEl) return;

    itemsEl.innerHTML = '';

    if (!cart.length) {
      itemsEl.innerHTML = '<p>Tu carrito está vacío</p>';
      if (btn) btn.disabled = true;
      return;
    }

    if (btn) btn.disabled = false;

    cart.forEach(function (it, idx) {
      var row = document.createElement('div');
      row.className = 'cart-item';
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

  function persistCart() {
    try { localStorage.setItem('bdo_cart', JSON.stringify(cart)); } catch (e) {}
  }

  // =========================
  // CHECKOUT / WHATSAPP
  // =========================

  function addonsSubtotal() { return 0; }

  function openOrderModal() {
    if (!cart.length) {
      if (typeof toast === 'function') toast('Agrega productos primero');
      return;
    }
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
    var f = qs('#orderForm');
    if (f) f.reset();
  }

  function orderTotal() {
    return totalAmount() + DELIVERY_FEE + addonsSubtotal();
  }

  function updateOrderSummary() {
    var box = qs('#orderSummary');
    if (!box) return;

    var html = '<h3>Resumen de tu pedido:</h3>';

    cart.forEach(function (it) {
      html += '<div class="order-summary-item">' +
        '<span>' + it.quantity + 'x ' + it.product.name + '</span>' +
        '<span>' + money((it.product.price || 0) * it.quantity) + '</span>' +
      '</div>';
    });

    html += '<div class="order-summary-fee">' +
      '<span>Domicilio:</span><span>' + money(DELIVERY_FEE) + '</span>' +
    '</div>';

    html += '<div class="order-summary-total">' +
      '<span>Total a pagar:</span><span>' + money(orderTotal()) + '</span>' +
    '</div>';

    box.innerHTML = html;
  }

  function normalizeWhatsAppNumber(raw) {
    var digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 10) return '57' + digits;
    return digits;
  }

  function buildWhatsAppMessage(form) {
    var name = hasAppData() && appData.config && appData.config.pizzeriaName
      ? appData.config.pizzeriaName
      : 'Bambino D’ Oro';

    var msg = '¡Hola! Quiero hacer un pedido de ' + name + ':\n\n';
    msg += '*DETALLE DEL PEDIDO:*\n';

    cart.forEach(function (it) {
      msg += '- ' + it.quantity + 'x ' + it.product.name + ': ' +
        money((it.product.price || 0) * it.quantity) + '\n';
    });

    msg += '\n- Domicilio: ' + money(DELIVERY_FEE) + '\n';
    msg += '*Total: ' + money(orderTotal()) + '*\n\n';

    msg += '*INFORMACIÓN DEL CLIENTE:*\n';
    msg += '- Nombre: ' + (form.customerName || '') + '\n';
    msg += '- Teléfono: ' + (form.phone || '') + '\n';
    msg += '- Dirección: ' + (form.address || '') + '\n';

    if (form.locationLink) msg += '- Ubicación: ' + form.locationLink + '\n';

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

  function sendOrderToWhatsApp(form) {
    var number = (hasAppData() && appData.config && appData.config.whatsappNumber)
      ? appData.config.whatsappNumber
      : '';
    var phone = normalizeWhatsAppNumber(number);
    if (!phone) {
      if (typeof toast === 'function') toast('Número de WhatsApp no configurado');
      return;
    }
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
        setTimeout(function () { warningBox.hidden = true; }, 3000);
      }
      return;
    }
    if (warningBox) warningBox.hidden = true;

    sendOrderToWhatsApp(form);
    clearCart();
    closeOrderModal();
    if (typeof toast === 'function') toast('¡Pedido enviado!');
  }

  // ======================================================================
// ESTOFADOS BUILDER (versión simplificada y robusta)
// ======================================================================

var estofado = {
  baseProduct: null,
  qty: 1,
  s1: null,
  s2: null
};

// helper interno para nombres de sabores
function estofadoFlavorName(id) {
  if (!id) return '';
  var p = findProductById(id);
  return p && p.name ? p.name : '';
}

function openEstofadoBuilder(product) {
  estofado.baseProduct = product;
  estofado.qty = 1;
  estofado.s1 = null;
  estofado.s2 = null;

  renderEstofadoBuilder();

  if (estofadoModal) {
    estofadoModal.style.display = 'grid';
    estofadoModal.removeAttribute('hidden');
    trapFocus(estofadoModal);
  }
}

function closeEstofadoBuilder() {
  if (estofadoModal) {
    estofadoModal.style.display = 'none';
    estofadoModal.setAttribute('hidden', '');
    releaseTrap(estofadoModal);
  }
  estofado.baseProduct = null;
  estofado.qty = 1;
  estofado.s1 = null;
  estofado.s2 = null;
}

function renderEstofadoBuilder() {
  // 1) Tomamos las pizzas de la categoría "pizza"
  var all = [];
  if (hasAppData() && Array.isArray(appData.categories)) {
    var pizzaCat = appData.categories.find(function (c) { return c.id === 'pizza'; });
    if (pizzaCat && Array.isArray(pizzaCat.products)) {
      all = pizzaCat.products.slice();
    }
  }

  // 2) Permitimos SOLO estos IDs:
  // 1: Hawaiana, 2: Pollo con champiñón, 3: Kabano
  var allowedIds = [1, 2, 3];
  var allowed = all.filter(function (p) {
    return allowedIds.indexOf(Number(p.id)) !== -1;
  });

  var sel1 = qs('#selectEst1');
  var sel2 = qs('#selectEst2');

  function fillSelect(sel) {
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecciona un sabor</option>';
    allowed.forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = String(p.id);
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
  }

  fillSelect(sel1);
  fillSelect(sel2);

  if (sel1) {
    sel1.onchange = function () {
      estofado.s1 = sel1.value || null;
      updateEstofadoView();
    };
  }

  if (sel2) {
    sel2.onchange = function () {
      estofado.s2 = sel2.value || null;
      updateEstofadoView();
    };
  }

  var info = qs('#estofadoInfo');
  if (info && estofado.baseProduct) {
    info.textContent = estofado.baseProduct.description || '';
  }

  var modalImgBox = qs('#estofadoImageBox');
  if (modalImgBox) {
    if (estofado.baseProduct && estofado.baseProduct.image) {
      modalImgBox.innerHTML =
        '<img src="' + estofado.baseProduct.image +
        '" alt="' + estofado.baseProduct.name + '" class="estofado-img">';
    } else {
      modalImgBox.innerHTML = '<div class="no-image">Sin imagen disponible</div>';
    }
  }

  var minus = qs('#estofadoQtyMinus');
  var plus = qs('#estofadoQtyPlus');
  var add = qs('#estofadoAddBtn');

  if (minus) {
    minus.onclick = function () {
      estofado.qty = Math.max(1, estofado.qty - 1);
      updateEstofadoView();
    };
  }

  if (plus) {
    plus.onclick = function () {
      estofado.qty = Math.min(20, estofado.qty + 1);
      updateEstofadoView();
    };
  }

  if (add) {
    add.onclick = addEstofadoToCart;
  }

  qsa('.estofado-close').forEach(function (b) {
    b.onclick = closeEstofadoBuilder;
  });

  updateEstofadoView();
}

function updateEstofadoView() {
  var n1 = estofadoFlavorName(estofado.s1);
  var n2 = estofadoFlavorName(estofado.s2);

  var nameEl = qs('#estofadoName');
  if (nameEl) {
    nameEl.textContent = estofado.baseProduct ? estofado.baseProduct.name : 'Estofado';
  }

  var detEl = qs('#estofadoDetail');
  if (detEl) {
    detEl.textContent = (n1 && n2) ? (n1 + ' + ' + n2) : 'Elige 2 sabores';
  }

  var qtyEl = qs('#estofadoQty');
  if (qtyEl) {
    qtyEl.textContent = String(estofado.qty);
  }

  var priceEl = qs('#estofadoPrice');
  if (priceEl) {
    var basePrice = estofado.baseProduct ? (estofado.baseProduct.price || 0) : 0;
    priceEl.textContent = money(basePrice * estofado.qty);
  }
}

function addEstofadoToCart() {
  if (!estofado.baseProduct) return;
  if (!estofado.s1 || !estofado.s2) {
    if (typeof toast === 'function') toast('Elige los 2 sabores');
    return;
  }

  var n1 = estofadoFlavorName(estofado.s1);
  var n2 = estofadoFlavorName(estofado.s2);

  var name = estofado.baseProduct.name + ' - ' + n1 + ' + ' + n2;
  var price = estofado.baseProduct.price || 0;

  var baseProduct = {
    id: 'e-' + Date.now(),
    name: name,
    price: price
  };

  pendingProduct = baseProduct;
  pendingQty = estofado.qty;

  closeEstofadoBuilder();
  openAdditionsModal();
}



function getPizzaCategory() {
  try {
    if (typeof appData === 'undefined' || !appData || !Array.isArray(appData.categories)) {
      return null;
    }
    return appData.categories.find(function (c) {
      return c.id === 'pizza';
    }) || null;
  } catch (e) {
    console.error('getPizzaCategory error:', e);
    return null;
  }
}

function pickName(productId) {
  if (!productId) return '';
  var p = findProductById(productId);
  return p && p.name ? p.name : '';
}




  function addEstofadoToCart() {
    if (!estofado.baseProduct) return;
    if (!estofado.s1 || !estofado.s2) {
      if (typeof toast === 'function') toast('Elige los 2 sabores');
      return;
    }

    var n1 = pickName(estofado.s1);
    var n2 = pickName(estofado.s2);
    var name = estofado.baseProduct.name + ' - ' + n1 + ' + ' + n2;
    var price = estofado.baseProduct.price || 0;

    var baseProduct = { id: 'e-' + Date.now(), name: name, price: price };

    pendingProduct = baseProduct;
    pendingQty = estofado.qty;

    closeEstofadoBuilder();
    openAdditionsModal();
  }

  // =========================
  // PIZZA BUILDER (Tamaños)
  // =========================

  // ================== PIZZA BUILDER =====================
var builder = {
  size: null,
  slices: null,
  mode: 'tradicional', // 'tradicional' | 'especial' | 'mixta'
  qty: 1,
  saborTrad: null,
  saborEsp: null,
  mitad1: null,
  mitad2: null
};

function resetBuilderState(sizeId) {
  builder.size = sizeId || builder.size || 'familiar';
  builder.slices = null;
  builder.mode = 'tradicional';  // siempre arrancamos en tradicional
  builder.qty = 1;
  builder.saborTrad = null;
  builder.saborEsp = null;
  builder.mitad1 = null;
  builder.mitad2 = null;
}



  function openPizzaBuilder(sizeId) {
  // Estado interno limpio SIEMPRE
  builder.size = sizeId;
  builder.slices = null;
  builder.mode = 'tradicional';
  builder.qty = 1;
  builder.saborTrad = builder.saborEsp = builder.mitad1 = builder.mitad2 = null;

  // Limpiar selects visualmente
  ['#selectTradicional', '#selectEspecial', '#selectMixta1', '#selectMixta2'].forEach(function (id) {
    var sel = qs(id);
    if (sel) sel.selectedIndex = 0;
  });

  // Volver a pintar resumen + precio
  renderBuilder();

  // ⬅️ Aquí sincronizamos pestañas y contenido con el modo real
  syncBuilderTabsAndContent();

  // Mostrar modal
  if (pizzaModal) {
    pizzaModal.style.display = 'grid';
    pizzaModal.removeAttribute('hidden');
    trapFocus(pizzaModal);
    bindOutsideOnce(pizzaModal, closePizzaBuilder);
  }
}


  function syncBuilderTabsAndContent() {
  var currentMode = builder.mode; // 'tradicional' | 'especial' | 'mixta'

  // Botones de pestañas
  var tabs = qsa('#pizzaBuilderModal .builder-tabs .tab-btn');
  tabs.forEach(function (btn) {
    var tabName = btn.getAttribute('data-tab'); // tradicional / especial / mixta
    var isActive = (tabName === currentMode);
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  // Contenidos
  var tradContent = qs('#tab-tradicional');
  var espContent  = qs('#tab-especial');
  var mixContent  = qs('#tab-mixta');

  if (tradContent) tradContent.classList.toggle('hidden', currentMode !== 'tradicional');
  if (espContent)  espContent.classList.toggle('hidden', currentMode !== 'especial');
  if (mixContent)  mixContent.classList.toggle('hidden', currentMode !== 'mixta');
}


  function closePizzaBuilder() {
  if (pizzaModal) {
    pizzaModal.style.display = 'none';
    pizzaModal.setAttribute('hidden', '');
    releaseTrap(pizzaModal);
  }

  builder.size = null;
  builder.slices = null;
  builder.mode = 'tradicional';
  builder.qty = 1;
  builder.saborTrad = builder.saborEsp = builder.mitad1 = builder.mitad2 = null;

  // Dejamos el builder listo para la próxima vez
  resetBuilderState(null);
}


  function renderBuilder() {
    renderBuilderSizePicker();
    renderSliceOptions();
    renderBuilderSelectors();
    updateBuilderView();
  }

  function renderBuilderSizePicker() {
  var cont = qs('#sizePicker');
  if (!cont) return;

  cont.innerHTML = '';

  var sizes = (hasAppData() && appData.pizzaOptions && appData.pizzaOptions.sizes)
    ? appData.pizzaOptions.sizes
    : [];

  sizes.forEach(function (s) {
    var b = document.createElement('button');
    b.className = 'size-btn' + (builder.size === s.id ? ' active' : '');
    b.textContent = s.label;

    b.addEventListener('click', function () {
      // 🔥 IMPORTANTE: cambiar de tamaño dentro del modal = reset completo
      resetBuilderState(s.id);

      // opcional: para asegurarnos, limpiar selects visualmente
      ['#selectTradicional', '#selectEspecial', '#selectMixta1', '#selectMixta2'].forEach(function (id) {
        var sel = qs(id);
        if (sel) sel.selectedIndex = 0;
      });

      // volver a pintar UI (tamaños, porciones, selects, precio)
      renderBuilder();

      // y asegurar que la pestaña/contents queden en TRADICIONAL
      syncBuilderTabsAndContent();
    });

    cont.appendChild(b);
  });
}



  function renderSliceOptions() {
    var cont = qs('#sliceOptions');
    if (!cont) return;
    cont.innerHTML = '';
    var list = (hasAppData() && appData.pizzaOptions && appData.pizzaOptions.slices &&
      appData.pizzaOptions.slices[builder.size]) || [];
    list.forEach(function (num) {
      var b = document.createElement('button');
      b.className = 'slice-btn' + (builder.slices === num ? ' active' : '');
      b.textContent = num + ' porciones';
      b.addEventListener('click', function () {
        builder.slices = num;
        renderSliceOptions();
        updateBuilderView();
      });
      cont.appendChild(b);
    });
  }

    function renderBuilderSelectors() {
    var pizza = getPizzaCategory() || { products: [] };
    var allProducts = pizza.products || [];

    // === IDs permitidos para Pizza Tamaños ===
    // Tradicionales
    var allowedTradIds = [1, 2, 3, 4, 5, 6];
    // Especiales
    var allowedEspIds  = [7, 8, 9, 10, 11, 12, 13, 14, 39];

    // Filtramos por ID, no por texto ni por group
    var trad = allProducts.filter(function (p) {
      return allowedTradIds.indexOf(Number(p.id)) !== -1;
    });

    var esp = allProducts.filter(function (p) {
      return allowedEspIds.indexOf(Number(p.id)) !== -1;
    });

    var all = trad.concat(esp);


    var selTrad = qs('#selectTradicional'),
        selEsp = qs('#selectEspecial'),
        selM1 = qs('#selectMixta1'),
        selM2 = qs('#selectMixta2');

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

    function fillMixtaSelect(el, excludeId, selectedId) {
      if (!el) return;
      el.innerHTML = '<option value="">Selecciona un sabor</option>';

      function appendGroup(label, list) {
        if (!list || !list.length) return;
        var og = document.createElement('optgroup');
        og.label = label;
        list.forEach(function (p) {
          if (excludeId && p.id === excludeId) return;
          var o = document.createElement('option');
          o.value = p.id;
          o.textContent = p.name + ' (' + money(p.price) + ')';
          if (selectedId && p.id === selectedId) o.selected = true;
          og.appendChild(o);
        });
        el.appendChild(og);
      }

      appendGroup('Tradicionales', trad);
      appendGroup('Especiales', esp);
    }

    fillBasic(selTrad, trad, builder.saborTrad);
    fillBasic(selEsp, esp, builder.saborEsp);

    fillMixtaSelect(selM1, builder.mitad2, builder.mitad1);
    fillMixtaSelect(selM2, builder.mitad1, builder.mitad2);

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
        if (val && val === builder.mitad2) {
          builder.mitad2 = null;
        }
        builder.mitad1 = val;
        fillMixtaSelect(selM2, builder.mitad1, builder.mitad2);
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
        fillMixtaSelect(selM1, builder.mitad2, builder.mitad1);
        updateBuilderView();
      };
    }

    qsa('.tab-btn').forEach(function (btn) {
      var tab = btn.getAttribute('data-tab');
      btn.classList.toggle('active', tab === builder.mode);
      btn.onclick = function () {
        builder.mode = tab;
        qsa('.tab-btn').forEach(function (b2) {
          var t2 = b2.getAttribute('data-tab');
          b2.classList.toggle('active', t2 === builder.mode);
        });
        qsa('.tab-content').forEach(function (c) { c.classList.add('hidden'); });
        var panel = qs('#tab-' + builder.mode);
        if (panel) panel.classList.remove('hidden');
        updateBuilderView();
      };
    });

    var mixtaTab = qs('.tab-btn[data-tab="mixta"]');
    var mixtaContent = qs('#tab-mixta');
    var mixtaAllowed = (builder.size === 'familiar' || builder.size === 'mediana' || builder.size === 'junior');

    if (mixtaTab && mixtaContent) {
      if (!mixtaAllowed) {
        mixtaTab.classList.add('hidden');
        mixtaContent.classList.add('hidden');
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
        if (builder.mode === 'mixta') mixtaContent.classList.remove('hidden');
      }
    }
  }

    function computeBuilderPrice() {
  // Tabla de precios desde appData
  var t = (hasAppData() &&
           appData.pizzaOptions &&
           appData.pizzaOptions.sizePrices &&
           appData.pizzaOptions.sizePrices[builder.size]) || null;

  if (!t) return 0;

  var base = 0;

  // --- Tradicional completa ---
  if (builder.mode === 'tradicional') {
    base = builder.saborTrad ? (t.tradicional || 0) : 0;
  }

  // --- Especial completa ---
  else if (builder.mode === 'especial') {
    base = builder.saborEsp ? (t.especial || 0) : 0;
  }

  // --- Mixta ---
  else if (builder.mode === 'mixta') {
    var half1 = findProductById(builder.mitad1);
    var half2 = findProductById(builder.mitad2);

    // Hasta que no tenga las 2 mitades, 0
    if (!half1 || !half2) return 0;

    var g1 = half1.group;
    var g2 = half2.group;

    // trad + trad -> precio tradicional
    if (g1 === 'tradicional' && g2 === 'tradicional') {
      base = t.tradicional || 0;
    }
    // esp + esp -> precio especial
    else if (g1 === 'especial' && g2 === 'especial') {
      base = t.especial || 0;
    }
    // mezcla trad + esp -> precio mixta
    else {
      base = t.mixta || 0;
    }
  }

  // --- Extra pepperoni ---
  var extra = 0;

  if (builder.mode === 'tradicional' && builder.saborTrad) {
    if (isPepperoniFlavor(builder.saborTrad)) {
      extra = pepperoniExtra(builder.size);
    }
  } else if (builder.mode === 'especial' && builder.saborEsp) {
    if (isPepperoniFlavor(builder.saborEsp)) {
      extra = pepperoniExtra(builder.size);
    }
  } else if (builder.mode === 'mixta') {
    if (isPepperoniFlavor(builder.mitad1) || isPepperoniFlavor(builder.mitad2)) {
      extra = pepperoniExtra(builder.size);
    }
  }

  return base + extra;
}


  // ¿Cuánto vale el extra de pepperoni según el tamaño?
function pepperoniExtra(sizeId) {
  if (sizeId === 'familiar') return 2000;
  if (sizeId === 'mediana')  return 1000;
  if (sizeId === 'junior')   return 1000;
  return 0; // personal y mini sin extra
}

// ¿Este sabor es pepperoni?
function isPepperoniFlavor(flavorId) {
  if (!flavorId) return false;
  var p = findProductById(flavorId);
  if (!p || !p.name) return false;
  var name = p.name.toLowerCase();
  // id 5 + texto, por si acaso
  return name.includes('pepperoni') || name.includes('peperoni') || Number(p.id) === 5;
}



  function updateBuilderView() {
    var nameEl = qs('#builderName');
    var detailEl = qs('#builderDetail');
    var priceEl = qs('#builderPrice');
    var qtyEl = qs('#builderQty');
    var minus = qs('#builderQtyMinus');
    var plus = qs('#builderQtyPlus');
    var addBtn = qs('#builderAddBtn');

    if (nameEl) {
      var sizeLabel = '';
      var sizes = (hasAppData() && appData.pizzaOptions && appData.pizzaOptions.sizes)
        ? appData.pizzaOptions.sizes
        : [];
      var sz = sizes.find(function (s) { return s.id === builder.size; });
      if (sz) sizeLabel = sz.label;
      nameEl.textContent = 'Pizza ' + (sizeLabel || builder.size);
    }

    var detail = '';
    if (builder.mode === 'tradicional') {
      detail = builder.saborTrad ? pickName(builder.saborTrad) : 'Selecciona un sabor';
    }
    if (builder.mode === 'especial') {
      detail = builder.saborEsp ? pickName(builder.saborEsp) : 'Selecciona un sabor';
    }
    if (builder.mode === 'mixta') {
      var n1 = pickName(builder.mitad1);
      var n2 = pickName(builder.mitad2);
      if (n1 && n2) detail = '1/2 ' + n1 + ' + 1/2 ' + n2;
      else detail = 'Selecciona las dos mitades';
    }

    if (detailEl) detailEl.textContent = detail;

    var price = computeBuilderPrice();
    if (priceEl) priceEl.textContent = money(price);

    if (qtyEl) qtyEl.textContent = String(builder.qty);

    if (minus) minus.onclick = function () {
      builder.qty = Math.max(1, builder.qty - 1);
      updateBuilderView();
    };
    if (plus) plus.onclick = function () {
      builder.qty = Math.min(20, builder.qty + 1);
      updateBuilderView();
    };
    if (addBtn) addBtn.onclick = function () {
      addBuilderPizzaToCart();
    };
  }

  function addBuilderPizzaToCart() {
    var price = computeBuilderPrice();
    if (!price) {
      if (typeof toast === 'function') toast('Selecciona el sabor de la pizza');
      return;
    }

    var baseName = qs('#builderName') ? qs('#builderName').textContent : 'Pizza';
    var detail = qs('#builderDetail') ? qs('#builderDetail').textContent : '';
    var finalName = baseName + (detail ? ' - ' + detail : '');

    var product = {
      id: 'builder-' + Date.now(),
      name: finalName,
      price: price
    };

    pendingProduct = product;
    pendingQty = builder.qty;

    openAdditionsModal();
    closePizzaBuilder();
  }

  // =========================
  // GEOLOCALIZACIÓN
  // =========================

  function setupLocationButton() {
    var btn = document.getElementById('useLocationBtn');
    var status = document.getElementById('locationStatus');

    if (!btn) return;

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

  // =========================
  // EVENTOS GLOBALES
  // =========================

  function addEventListeners() {
    document.addEventListener('click', function (e) {
      var cardLink = hasClosest(e.target, '.card[data-cat][href^="#"]');
      if (cardLink) {
        setTimeout(route, 0);
      }

      var cartIcon = hasClosest(e.target, '.cart-icon');
  if (cartIcon) {
    var panel = qs('#cartPanel');
    var expanded = cartIcon.getAttribute('aria-expanded') === 'true';
    cartIcon.setAttribute('aria-expanded', String(!expanded));
    if (panel) panel.classList.toggle('open');
    return;
  }

      var qtyBtn = hasClosest(e.target, '.quantity-btn');
      if (qtyBtn) {
        var isPlus = qtyBtn.classList.contains('plus');
        var prodId = qtyBtn.getAttribute('data-product-id');
        if (prodId) { updateQuantity(prodId, isPlus ? +1 : -1); return; }
      }

      var addBtn = hasClosest(e.target, '.btn-add-to-cart');
      if (addBtn) {
        addToCart(addBtn.getAttribute('data-product-id'));
        return;
      }

      var remBtn = hasClosest(e.target, '.cart-item-remove');
      if (remBtn) {
        removeFromCart(remBtn.getAttribute('data-index'));
        return;
      }

      var back = hasClosest(e.target, '[data-back]');
      if (back) {
        location.hash = '#home';
        return;
      }


      var cartIcon = hasClosest(e.target, '.cart-icon');
      if (cartIcon) {
        var panel = qs('#cartPanel');
        var expanded = cartIcon.getAttribute('aria-expanded') === 'true';
        cartIcon.setAttribute('aria-expanded', String(!expanded));
        if (panel) panel.classList.toggle('open');
        return;
      }

      var checkout = hasClosest(e.target, '#checkoutBtn') || hasClosest(e.target, '.btn-checkout');
      if (checkout) {
        openOrderModal();
        return;
      }

      if (e.target === orderModal) closeOrderModal();
      if (e.target === pizzaModal) closePizzaBuilder();
      if (e.target === estofadoModal) closeEstofadoBuilder();
      if (hasClosest(e.target, '#orderModal .close')) closeOrderModal();
      if (hasClosest(e.target, '#pizzaBuilderModal .close')) closePizzaBuilder();
      if (hasClosest(e.target, '#estofadoModal .close')) closeEstofadoBuilder();

      var sizeBtnBuilder = hasClosest(e.target, '.size-btn[data-builder-size]');
      if (sizeBtnBuilder) {
        var sizeId = sizeBtnBuilder.getAttribute('data-builder-size');
        openPizzaBuilder(sizeId);
        return;
      }
var cartPanel = qs('#cartPanel');
    if (cartPanel && cartPanel.classList.contains('open')) {
      var clickInsidePanel = cartPanel.contains(e.target);
      var clickOnCartIconAgain = !!hasClosest(e.target, '.cart-icon');

      // Si no fue ni dentro del panel, ni en el icono → cerramos
      if (!clickInsidePanel && !clickOnCartIconAgain) {
        cartPanel.classList.remove('open');
        var cartIconReal = qs('.cart-icon');
        if (cartIconReal) {
          cartIconReal.setAttribute('aria-expanded', 'false');
        }
      }
    }
    // === FIN CIERRE CARRITO ===
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
    if (clearBtn) clearBtn.addEventListener('click', function () { clearCart(); });

    var orderForm = qs('#orderForm');
    if (orderForm) orderForm.addEventListener('submit', handleOrderSubmit);

    setupLocationButton();

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
        if (pendingProduct) {
          cart.push({ product: pendingProduct, quantity: pendingQty });
          persistCart();
          updateCartView();
          animateCart();
          if (typeof toast === 'function') {
            toast(pendingQty + ' ' + pendingProduct.name + ' agregada(s)');
          }
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

    document.addEventListener('click', function (ev) {
      if (ev.target === addonsModal) {
        pendingProduct = null;
        pendingQty = 1;
        closeAdditionsModal();
      }
      
    });

  
  }

  // =========================
  // FOCUS TRAP MODALES
  // =========================

  var lastFocused = null;

  function trapFocus(modal) {
    lastFocused = document.activeElement;
    var focusables = qsa('button, [href], input, select, textarea, [tabindex]:not([disabled])', modal)
      .filter(function (el) { return !el.hasAttribute('disabled'); });

    if (focusables[0]) focusables[0].focus();

    function onKey(e) {
      if (e.key !== 'Tab') return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
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
 

