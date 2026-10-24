(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let api, getUser, updateUser, toast, countryRequest, view = 0, dirty = () => false;
  const money = (amount, currency = 'PHP') => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  async function fillCountries(root = document) {
    const selects = [...root.querySelectorAll('[data-country-select]')];
    if (!selects.length) return;
    try {
      countryRequest ||= api('/api/shop/countries').catch(error => { countryRequest = null; throw error; });
      const { countries } = await countryRequest;
      const rows = Object.entries(countries).map(([code, currency]) => ({ code, currency, name: regionNames.of(code) || code })).sort((a,b) => a.name.localeCompare(b.name));
      for (const select of selects) {
        const selected = select.value;
        select.innerHTML = '<option value="">Not specified · prices in PHP</option>' + rows.map(row => `<option value="${row.code}">${escape(row.name)} (${row.currency})</option>`).join('');
        select.value = selected; delete select.dataset.loadError;
      }
    } catch (error) { for (const select of selects) select.dataset.loadError = 'true'; toast('Country choices could not load. Reopen this page to try again.'); }
  }
  const countryControl = code => `<label>Country / region of residence<select name="countryCode" autocomplete="country" data-country-select data-country="${escape(code)}"><option value="${escape(code)}">${escape(code ? regionNames.of(code) : 'Not specified · prices in PHP')}</option></select><small>This stays private and sets the currency used for price estimates.</small></label>`;
  function priceMarkup(product, exchange) {
    if (product.priceMinor === 0) return '<strong class="shop-product-price">Free</strong>';
    const base = money(product.price);
    if (exchange.currency === 'PHP' || !exchange.rate) return `<strong class="shop-product-price">${escape(base)}</strong>`;
    return `<strong class="shop-product-price">≈ ${escape(money(product.price * exchange.rate, exchange.currency))}</strong><small class="shop-base-price">${escape(base)} original price</small>`;
  }
  async function mount(root) {
    const token = ++view;
    root.innerHTML = '<div class="wrap"><div class="page-head"><h1>Shop</h1><p>Loading products…</p></div></div>';
    try {
      const data = await api('/api/shop');
      if (token !== view || !root.isConnected) return;
      const user = getUser(), owner = data.canManage;
      const currencyNote = data.exchange.currency === 'PHP' ? 'Original prices are in Philippine pesos (PHP).' : data.exchange.rate ? `Prices shown in ${data.currency} are estimates. Exchange rate date: ${data.exchange.date}${data.exchange.status === 'cached' ? ' · using a cached rate' : ''}.` : `A ${data.currency} exchange rate is unavailable right now. Original peso prices are shown.`;
      const cards = data.products.map(product => {
        const count = product.ticketType ? user?.tickets?.[product.ticketType] || 0 : user?.shopInventory?.[product.id] || 0;
        const actions = owner ? window.SolarisSocial.options(`<a href="shop-product.html?edit=${encodeURIComponent(product.id)}">Edit product</a><button type="button" class="is-danger" data-shop-delete="${escape(product.id)}">Delete product</button>`, 'Product options') : '';
        return `<article class="shop-ticket-card shop-product-card">${actions}${product.image ? `<img class="shop-ticket-art" src="${escape(product.image)}" alt="${escape(product.title)}">` : '<span class="shop-product-placeholder" aria-hidden="true">✦</span>'}<div class="shop-ticket-copy"><span class="section-eyebrow">${product.ticketType ? 'PROFILE TICKET' : 'SOLARIS PRODUCT'}</span><h2>${escape(product.title)}</h2><p>${escape(product.description)}</p>${user ? `<span class="shop-ticket-count">In your inventory: <strong>${count}</strong></span>` : ''}${priceMarkup(product, data.exchange)}</div><div class="shop-product-actions">${!user ? '<a class="btn btn-primary" href="account.html?mode=login">Log in to shop</a>' : product.priceMinor > 0 ? '<button class="btn btn-ghost" type="button" disabled>Checkout coming soon</button>' : `<button class="btn btn-primary" type="button" data-shop-claim="${escape(product.id)}" ${count >= 99 ? 'disabled' : ''}>${count >= 99 ? 'Inventory full' : 'Get for free'}</button>`}</div></article>`;
      }).join('');
      root.innerHTML = `<div class="wrap shop-page"><div class="page-head page-head-with-menu"><div><h1>Shop</h1><p>Profile tickets and creations for your Solaris account.</p></div>${owner ? window.SolarisSocial.options('<a href="shop-product.html">Add a product</a>', 'Shop options') : ''}</div><section class="shop-intro"><span class="section-eyebrow">SOLARIS MEMBER SHOP</span><h2>A little change, a fresh start</h2><p>Namecard tickets skip the seven-day username cooldown. WHO? tickets let you change a real name after it has been saved. Products and their prices are managed by Solaris Studio.</p><p>Payment checkout is coming soon. Priced products cannot be purchased yet, and no money will be taken. Existing tickets remain in your inventory.</p></section><section class="account-panel shop-country-panel"><div><h2>Your price display</h2><p class="panel-help">${escape(currencyNote)}</p>${data.exchange.rate && data.exchange.currency !== 'PHP' ? '<p class="panel-help">Estimates use <a class="text-link" href="https://frankfurter.dev/" target="_blank" rel="noopener noreferrer">Frankfurter reference rates</a>. A future checkout may use a different final rate.</p>' : ''}</div>${user ? `<form data-shop-country>${countryControl(data.countryCode)}<button class="btn btn-ghost btn-sm" type="submit">Save country</button><p class="form-message" data-shop-country-message role="status"></p></form>` : '<p class="panel-help">Log in and set your country in Personal Profile Information to see local currency estimates.</p>'}</section><div class="shop-ticket-list">${cards || '<p class="empty">No products are listed at the moment.</p>'}</div><div class="page-end"></div></div>`;
      await fillCountries(root);
      $('[data-shop-country]', root)?.addEventListener('submit', async event => {
        event.preventDefault(); const form = event.target, button = $('button', form); button.disabled = true;
        try {
          if ($('[data-country-select]', form).dataset.loadError) throw new Error('Reload the page to load country choices before saving.');
          const result = await api('/api/personal-info', 'PUT', { ...getUser().personalInfo, countryCode: form.elements.countryCode.value });
          updateUser(result.user); toast('Country saved.'); await mount(root);
        } catch (error) { $('[data-shop-country-message]', form).textContent = error.message; }
        finally { button.disabled = false; }
      });
      root.onclick = async event => {
        const claim = event.target.closest('[data-shop-claim]'), remove = event.target.closest('[data-shop-delete]');
        if (!claim && !remove) return;
        if (remove && !confirm('Delete this product from the shop? Existing inventory and tickets are kept.')) return;
        const button = claim || remove; button.disabled = true;
        try {
          const result = await api(remove ? '/api/owner/shop/products/' + remove.dataset.shopDelete : '/api/shop/products/' + claim.dataset.shopClaim + '/claim', remove ? 'DELETE' : 'POST', {});
          if (result.user) updateUser(result.user);
          toast(result.message || 'Product removed.'); await mount(root);
        } catch (error) { toast(error.message); button.disabled = false; }
      };
    } catch (error) { if (token === view) root.innerHTML = `<div class="wrap"><div class="page-head"><h1>Shop unavailable</h1><p>${escape(error.message)}</p><a class="btn btn-ghost" href="shop.html">Try again</a></div></div>`; }
  }
  async function imageData(file) {
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error('Choose a PNG, JPG, or WebP image smaller than 20 MB.');
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height)), canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale)); canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [.9,.75,.6]) { const data = canvas.toDataURL('image/webp', quality); if (data.length <= 900000) return data; }
      throw new Error('This image is too detailed. Choose a smaller image.');
    } finally { bitmap.close(); }
  }
  async function editor(root) {
    if (getUser()?.accountRole !== 'owner') { root.innerHTML = '<div class="wrap"><div class="page-head"><h1>Owner access required</h1><p>Only the Solaris owner can manage products.</p><a class="btn btn-ghost" href="shop.html">Back to shop</a></div></div>'; return; }
    try {
      const { products } = await api('/api/shop'), id = new URLSearchParams(location.search).get('edit');
      const item = id ? products.find(product => product.id === id) : null;
      if (id && !item) throw new Error('This product no longer exists.');
      root.innerHTML = `<div class="wrap shop-product-editor"><div class="page-head"><a class="text-link" href="shop.html">← Back to shop</a><h1>${item ? 'Edit product' : 'Add a product'}</h1><p>Set the original price in Philippine pesos. The shop converts its display using each member’s country.</p></div><form class="account-panel" data-product-editor><label>Product name<input name="title" maxlength="120" required value="${escape(item?.title)}"></label><label>Description<textarea name="description" rows="4" maxlength="3000">${escape(item?.description)}</textarea></label><div class="social-form-grid"><label>Price (PHP / ₱)<input name="price" type="number" min="0" max="1000000" step="0.01" value="${item?.price ?? 0}" required><small>Set 0 for a free product. Payment checkout is coming soon.</small></label><label>Product benefit<select name="ticketType"><option value="">General product · add to inventory</option><option value="namecard" ${item?.ticketType === 'namecard' ? 'selected' : ''}>Namecard ticket</option><option value="who" ${item?.ticketType === 'who' ? 'selected' : ''}>WHO? ticket</option></select></label></div><label>Product image<input type="file" name="image" accept="image/png,image/jpeg,image/webp"><small>Import from your device. Transparent images are supported.</small></label><div class="shop-image-preview"><img data-product-preview alt="Product image preview" ${item?.image ? `src="${escape(item.image)}"` : 'hidden'}><button class="btn btn-ghost btn-sm" type="button" data-clear-product-image ${item?.image ? '' : 'hidden'}>Remove image</button></div><p class="form-message" data-product-message role="status"></p><div class="actions"><button class="btn btn-primary" type="submit">Save product</button><a class="btn btn-ghost" href="shop.html">Cancel</a></div></form></div>`;
      const form = $('[data-product-editor]', root), message = $('[data-product-message]', form), submit = $('[type=submit]', form);
      let image = item?.image || '', importing = false;
      const snapshot = () => JSON.stringify([form.elements.title.value, form.elements.description.value, form.elements.price.value, form.elements.ticketType.value, image]);
      const baseline = snapshot(); dirty = () => importing || snapshot() !== baseline;
      form.elements.image.addEventListener('change', async event => {
        if (!event.target.files[0]) return;
        importing = true; submit.disabled = true; message.textContent = 'Importing image…';
        try { image = await imageData(event.target.files[0]); const preview = $('[data-product-preview]', form); preview.src = image; preview.hidden = false; $('[data-clear-product-image]', form).hidden = false; message.textContent = ''; }
        catch (error) { message.textContent = error.message; }
        finally { importing = false; submit.disabled = false; event.target.value = ''; }
      });
      $('[data-clear-product-image]', form).onclick = () => { image = ''; $('[data-product-preview]', form).hidden = true; $('[data-clear-product-image]', form).hidden = true; };
      form.addEventListener('submit', async event => {
        event.preventDefault(); if (importing) return; submit.disabled = true; message.textContent = 'Saving…';
        try { await api('/api/owner/shop/products' + (item ? '/' + item.id : ''), item ? 'PUT' : 'POST', { title: form.elements.title.value, description: form.elements.description.value, price: form.elements.price.value, ticketType: form.elements.ticketType.value, image }); dirty = () => false; location.assign('shop.html'); }
        catch (error) { message.textContent = error.message; submit.disabled = false; }
      });
    } catch (error) { root.innerHTML = `<div class="wrap"><div class="page-head"><h1>Product unavailable</h1><p>${escape(error.message)}</p><a class="btn btn-ghost" href="shop.html">Back to shop</a></div></div>`; }
  }
  window.addEventListener('beforeunload', event => { if (dirty()) { event.preventDefault(); event.returnValue = ''; } });
  window.SolarisShop = { configure(config) { ({ api, getUser, updateUser, toast } = config); }, mount, editor, fillCountries, countryControl };
})();
