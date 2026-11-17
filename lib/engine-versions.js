// The Sendwell templates and which placeholders each engine version understands.
//
// A merchant pastes an engine once, then keeps it for years. A design saved
// later must only use placeholders that their pasted engine replaces, or the
// customer would see "[[item_variant_sep]]" printed literally. Rule: a new
// placeholder ships with an engine version bump and is listed here with the
// version that introduced it. One version number covers all templates.

export const CURRENT_ENGINE = 2;

// Placeholders every template's item rows understand.
const ITEM = { item_title: 1, item_variant: 1, item_qty: 1, item_price: 1, item_image: 1, item_variant_sep: 2 };
const COMMON = { items: 1, first_name: 1, order_name: 1, order_date: 1, shipping_address: 1, order_status_url: 1, shop_name: 1 };
const at = (v, names) => Object.fromEntries(names.map((n) => [n, v]));

export const TEMPLATES = {
  order_confirmation: {
    title: 'Order confirmation',
    metafield: 'design', // the first template; its key predates the others
    since: 1,
    placeholders: { ...COMMON, ...ITEM, subtotal: 1, shipping: 1, tax: 1, total: 1 },
  },
  shipping_confirmation: {
    title: 'Shipping confirmation',
    metafield: 'shipping_confirmation',
    since: 2,
    placeholders: { ...at(2, Object.keys(COMMON)), ...at(2, Object.keys(ITEM)), ...at(2, ['tracking', 'tracking_company', 'tracking_number', 'tracking_url']) },
  },
  refund_notification: {
    title: 'Order refund',
    metafield: 'refund_notification',
    since: 2,
    placeholders: { ...at(2, Object.keys(COMMON)), ...at(2, Object.keys(ITEM)), ...at(2, ['refund_amount', 'refunded_items']) },
  },
};

export const TEMPLATE_KEYS = Object.keys(TEMPLATES);

// Order confirmation's placeholders (kept for older callers).
export const PLACEHOLDERS = TEMPLATES.order_confirmation.placeholders;

export const placeholdersFor = (template = 'order_confirmation') => {
  const t = TEMPLATES[template];
  if (!t) throw new Error(`Unknown Sendwell template: ${template}`);
  return t.placeholders;
};

// Whether a template's engine at this version replaces the placeholder.
export const supports = (template, name, engine) => (placeholdersFor(template)[name] ?? Infinity) <= engine;

// The lowest engine version that can render every placeholder in the given strings.
// Unknown placeholders count as "newer than any engine" (Infinity).
export function requiredEngine(template, ...parts) {
  const known = placeholdersFor(template);
  let need = TEMPLATES[template].since;
  for (const p of parts) {
    for (const [, name] of String(p || '').matchAll(/\[\[([a-z_]+)\]\]/g)) need = Math.max(need, known[name] ?? Infinity);
  }
  return need;
}

// Reads the engine version a template declares in its first lines ("Sendwell engine v2").
export function engineVersionOf(source) {
  const m = /Sendwell engine v(\d+)/.exec(String(source || ''));
  return m ? Number(m[1]) : null;
}
