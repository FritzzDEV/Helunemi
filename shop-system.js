'use strict';

const crypto = require('node:crypto');
const { countries } = require('./country-currencies.json');
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const countryCode = value => typeof value === 'string' && /^[A-Za-z]{2}$/.test(value.trim()) && Object.hasOwn(countries, value.trim().toUpperCase()) ? value.trim().toUpperCase() : '';
const defaults = () => [
  { id: 'namecard-ticket', title: 'Namecard ticket', description: 'Change your username without waiting for the seven-day cooldown.', image: 'assets/namecard-ticket.png', ticketType: 'namecard', price: 90 },
  { id: 'who-ticket', title: 'WHO? ticket', description: 'Change the real name you made permanent when you first saved it.', image: 'assets/who-ticket.png', ticketType: 'who', price: 350 }
];

function createShopSystem({ getAccount, send, readBody, save, privateProfile, cleanImage }) {
  let products = [], mutation = Promise.resolve(), cachedRates = null, pendingRates = null, retryAt = 0;
  function cleanProduct(value) {
    if (!value || typeof value !== 'object') throw fail('Enter product information.');
    const price = Number(value.price);
    if (value.price === '' || value.price == null || !Number.isFinite(price) || price < 0 || price > 1000000 || Math.abs(price * 100 - Math.round(price * 100)) > 0.000001) throw fail('Enter a peso price from 0 to 1,000,000 with up to two decimal places.');
    const id = text(value.id, 100) || 'product-' + crypto.randomUUID();
    if (!/^[a-z0-9-]{1,100}$/.test(id)) throw fail('Invalid product ID.');
    const title = text(value.title, 120), rawImage = text(value.image, 1100000);
    if (!title) throw fail('Give the product a name.');
    if (rawImage && !rawImage.startsWith('data:image/') && !/^\/?assets\/(namecard-ticket|who-ticket)\.png$/.test(rawImage)) throw fail('Import a product image from your device.');
    return { id, title, description: text(value.description, 3000), image: cleanImage(rawImage), price: Math.round(price * 100) / 100, priceMinor: Math.round(price * 100), currency: 'PHP', ticketType: ['namecard','who'].includes(value.ticketType) ? value.ticketType : '', updatedAt: Number(value.updatedAt) || Date.now() };
  }
  function load(value) {
    const source = Array.isArray(value?.products) ? value.products : defaults();
    products = source.slice(0, 200).map(item => { try { return cleanProduct(item); } catch { return null; } }).filter(Boolean);
    products = [...new Map(products.map(item => [item.id, item])).values()];
  }
  async function commit(change) {
    const task = mutation.catch(() => {}).then(async () => {
      const before = structuredClone(products);
      try { return await change(); } catch (error) { products = before; throw error; }
    });
    mutation = task; return task;
  }
  async function exchange(currency) {
    if (currency === 'PHP') return { base: 'PHP', currency, rate: 1, date: null, status: 'base' };
    if ((!cachedRates || Date.now() - cachedRates.loadedAt > 6 * 60 * 60 * 1000) && Date.now() >= retryAt) {
      if (!pendingRates) pendingRates = (async () => {
        try {
          const response = await fetch('https://api.frankfurter.dev/v2/rates?base=PHP', { signal: AbortSignal.timeout(4000), headers: { Accept: 'application/json' } });
          if (!response.ok) throw new Error('Exchange provider returned ' + response.status);
          const rows = await response.json();
          if (!Array.isArray(rows)) throw new Error('Invalid exchange response');
          const rates = {};
          for (const row of rows) {
            const quote = String(row.quote || '').toUpperCase();
            if (String(row.base).toUpperCase() === 'PHP' && /^[A-Z]{3}$/.test(quote) && Number.isFinite(row.rate) && row.rate > 0 && /^\d{4}-\d{2}-\d{2}$/.test(row.date)) rates[quote] = { rate: row.rate, date: row.date };
          }
          if (!Object.keys(rates).length) throw new Error('No peso rates returned');
          cachedRates = { loadedAt: Date.now(), rates }; retryAt = 0;
        } catch (error) { retryAt = Date.now() + 15 * 60 * 1000; console.warn('SHOP EXCHANGE RATES:', error.message); }
        finally { pendingRates = null; }
      })();
      await pendingRates;
    }
    const quote = cachedRates?.rates[currency];
    if (!quote || Date.now() - cachedRates.loadedAt > 7 * 24 * 60 * 60 * 1000) return { base: 'PHP', currency, rate: null, date: null, status: 'unavailable' };
    return { base: 'PHP', currency, ...quote, status: Date.now() - cachedRates.loadedAt > 6 * 60 * 60 * 1000 ? 'cached' : 'current', provider: 'Frankfurter' };
  }
  async function claim(req, res, productId, ticketType) {
    const user = await getAccount(req);
    if (!user) throw fail('Log in to get shop products.', 401);
    const result = await commit(async () => {
      const product = products.find(item => productId ? item.id === productId : item.ticketType === ticketType);
      if (!product) throw fail('This product is no longer in the shop.', 404);
      // The server always checks the stored price, including the legacy ticket endpoint.
      if (product.priceMinor > 0) throw fail('This product costs money. Payment checkout is coming soon; no payment was taken.', 409);
      const previousTickets = structuredClone(user.tickets || { namecard: 0, who: 0 });
      const previousInventory = structuredClone(user.shopInventory || {});
      const inventory = product.ticketType ? (user.tickets ||= { namecard: 0, who: 0 }) : (user.shopInventory ||= {});
      const key = product.ticketType || product.id, count = Number(inventory[key]) || 0;
      if (count >= 99) throw fail('Your inventory for this product is full.', 409);
      inventory[key] = count + 1;
      try { await save(); } catch (error) { user.tickets = previousTickets; user.shopInventory = previousInventory; throw error; }
      return { user: privateProfile(user), message: product.title + ' added to your inventory.' };
    });
    send(res, 200, result);
  }
  async function handle(req, res, pathname) {
    if (!pathname.startsWith('/api/shop') && !pathname.startsWith('/api/owner/shop')) return false;
    if (req.method === 'GET' && pathname === '/api/shop/countries') { send(res, 200, { countries }); return true; }
    if (req.method === 'GET' && pathname === '/api/shop') {
      const user = await getAccount(req), code = countryCode(user?.personalInfo?.countryCode), currency = countries[code] || 'PHP';
      send(res, 200, { products, countryCode: code, currency, exchange: await exchange(currency), canManage: user?.role === 'owner', checkoutAvailable: false }); return true;
    }
    if (req.method === 'POST' && pathname === '/api/shop/purchase-ticket') {
      const input = await readBody(req);
      if (!['namecard','who'].includes(input.ticketType)) throw fail('Choose a valid ticket.');
      await claim(req, res, null, input.ticketType); return true;
    }
    const claimMatch = /^\/api\/shop\/products\/([a-z0-9-]{1,100})\/claim$/.exec(pathname);
    if (req.method === 'POST' && claimMatch) { await claim(req, res, claimMatch[1]); return true; }
    const productMatch = /^\/api\/owner\/shop\/products(?:\/([a-z0-9-]{1,100}))?$/.exec(pathname);
    if (productMatch && ['POST','PUT','DELETE'].includes(req.method)) {
      const user = await getAccount(req);
      if (!user || user.role !== 'owner') throw fail('Only the owner can manage shop products.', 403);
      const id = productMatch[1], input = req.method === 'DELETE' ? {} : await readBody(req);
      await commit(async () => {
        const index = products.findIndex(item => item.id === id);
        if (req.method !== 'POST' && index < 0) throw fail('Product not found.', 404);
        if (req.method === 'DELETE') products.splice(index, 1);
        else {
          if (req.method === 'POST' && (id || products.length >= 200)) throw fail('The shop product limit has been reached.');
          const product = cleanProduct({ ...(index >= 0 ? products[index] : {}), ...input, id: req.method === 'POST' ? 'product-' + crypto.randomUUID() : id, updatedAt: Date.now() });
          if (product.ticketType && products.some(item => item.id !== product.id && item.ticketType === product.ticketType)) throw fail('A product already grants this ticket. Edit it instead, or delete it first.');
          if (index >= 0) products[index] = product; else products.push(product);
        }
        await save();
      });
      send(res, req.method === 'POST' ? 201 : 200, { products }); return true;
    }
    return false;
  }
  load();
  return { handle, load, snapshot: () => ({ version: 1, products: structuredClone(products) }) };
}

module.exports = { createShopSystem, countryCode };
