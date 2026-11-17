// Turns a merchant's simple settings into the design JSON each Sendwell engine reads from a
// shop metafield (see engine/*.liquid and TEMPLATES in engine-versions.js).
// Works in the browser and in Node.
//
// Settings are flat: brand fields (colors, font, logo, footer, showAddress) are shared by all
// templates; heading, intro and buttonText are the copy for the template being built.

import { CURRENT_ENGINE, TEMPLATES, requiredEngine, supports } from './engine-versions.js';

export const DEFAULT_BRAND = {
  brandColor: '#1f6f5c',
  backgroundColor: '#f4f1ea',
  textColor: '#22252a',
  font: 'Georgia, "Times New Roman", serif',
  logoUrl: '',
  footer: 'Questions? Just reply to this email.',
  showAddress: true,
};

export const DEFAULT_COPY = {
  order_confirmation: {
    heading: 'Thank you, [[first_name]]!',
    intro: "Your order is confirmed and we're getting it ready. We'll email you again when it ships.",
    buttonText: 'View your order',
  },
  shipping_confirmation: {
    heading: "It's on the way, [[first_name]]!",
    intro: 'Good news: your order has shipped. You can follow it with the tracking link below.',
    buttonText: 'Track your package',
  },
  refund_notification: {
    heading: 'Your refund is on its way',
    intro: "We've refunded [[refund_amount]] to your original payment method. Depending on your bank it can take a few days to appear.",
    buttonText: 'View your order',
  },
};

// Order confirmation settings, as before multiple templates existed.
export const DEFAULT_SETTINGS = { ...DEFAULT_BRAND, ...DEFAULT_COPY.order_confirmation };

export const defaultSettings = (template = 'order_confirmation') => ({ ...DEFAULT_BRAND, ...DEFAULT_COPY[template] });

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Merchant text may contain our placeholders ([[first_name]]): escape HTML, keep the ones this
// template's engine replaces, and turn any other [[word]] into plain text (&#91;&#91;) so it can't break the email.
const textFor = (template, engine) => (s) => esc(s).replace(/\[\[([a-z_]+)\]\]/g, (m, n) => (supports(template, n, engine) ? m : `&#91;&#91;${n}&#93;&#93;`));
const color = (s, fallback) => (/^#[0-9a-fA-F]{3,8}$/.test(String(s || '')) ? s : fallback);
// Font stacks go inside style="..." attributes, so only single quotes are allowed.
const fontStack = (s) => String(s || '').replace(/"/g, "'").replace(/[^\w\s,'-]/g, '').trim() || 'Arial, Helvetica, sans-serif';
const url = (s) => (/^https:\/\/[^\s"'<>]+$/.test(String(s || '')) ? s : '');
const unsupported = (template, str, engine) => [...new Set([...str.matchAll(/\[\[([a-z_]+)\]\]/g)].map((m) => m[1]).filter((n) => !supports(template, n, engine)))].map((n) => `[[${n}]]`);

// engine: the engine version the merchant pasted into this template. The design only uses
// placeholders it understands.
export function buildDesign(input = {}, { engine = CURRENT_ENGINE, template = 'order_confirmation' } = {}) {
  if (!TEMPLATES[template]) throw new Error(`Unknown Sendwell template: ${template}`);
  if (engine < TEMPLATES[template].since) throw new Error(`${TEMPLATES[template].title} needs Sendwell engine v${TEMPLATES[template].since} or later`);
  const s = { ...defaultSettings(template), ...input };
  const text = textFor(template, engine);
  const brand = color(s.brandColor, DEFAULT_BRAND.brandColor);
  const bg = color(s.backgroundColor, DEFAULT_BRAND.backgroundColor);
  const fg = color(s.textColor, DEFAULT_BRAND.textColor);
  const font = fontStack(s.font);
  const logo = url(s.logoUrl);

  const header = logo
    ? `<img src="${esc(logo)}" alt="[[shop_name]]" style="max-height:48px;max-width:220px;display:block;margin:0 auto">`
    : `<div style="font-size:20px;font-weight:bold;letter-spacing:.5px;color:${brand}">[[shop_name]]</div>`;
  const button = (href, label) => `<a href="${href}" class="sw-button" style="display:inline-block;background:${brand};color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:6px;font-weight:bold">${label}</a>`;
  const muted = (t) => `<tr><td style="padding:18px 32px 0;font-size:13px;color:#777">${t}</td></tr>`;
  const itemsTable = `<tr><td style="padding:12px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee">[[items]]</table></td></tr>`;
  const address = (label) => (s.showAddress
    ? `<tr><td style="padding:20px 32px 0"><div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#777">${label}</div><div style="padding-top:6px;line-height:1.5">[[shipping_address]]</div></td></tr>`
    : '');
  const centered = (inner) => `<tr><td align="center" style="padding:28px 32px">${inner}</td></tr>`;
  const variantSep = engine >= 2 ? '[[item_variant_sep]]' : '';
  const itemRow = (withPrice) => `<tr><td width="64" style="padding:12px 12px 12px 0;border-bottom:1px solid #eee"><img src="[[item_image]]" alt="" width="56" style="width:56px;border-radius:6px;display:block"></td><td style="padding:12px 0;border-bottom:1px solid #eee;font-size:14px;line-height:1.4">[[item_title]]<div style="color:#777;font-size:12px">${variantSep}Qty [[item_qty]]</div></td>${withPrice ? '<td align="right" style="padding:12px 0;border-bottom:1px solid #eee;font-size:14px;white-space:nowrap">[[item_price]]</td>' : ''}</tr>`;

  const extra = {};
  let body;
  if (template === 'order_confirmation') {
    body = `${muted('Order [[order_name]] · [[order_date]]')}
${itemsTable}
<tr><td style="padding:8px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
<tr><td style="padding:3px 0;color:#777">Subtotal</td><td align="right">[[subtotal]]</td></tr>
<tr><td style="padding:3px 0;color:#777">Shipping</td><td align="right">[[shipping]]</td></tr>
<tr><td style="padding:3px 0;color:#777">Taxes</td><td align="right">[[tax]]</td></tr>
<tr><td style="padding:8px 0 0;font-weight:bold;font-size:16px">Total</td><td align="right" style="padding:8px 0 0;font-weight:bold;font-size:16px">[[total]]</td></tr>
</table></td></tr>
${address('Shipping to')}
${centered(button('[[order_status_url]]', text(s.buttonText)))}`;
  } else if (template === 'shipping_confirmation') {
    // [[tracking]] becomes tracking_block when the shipment has a tracking number, else no_tracking_block.
    extra.tracking_block = `<tr><td style="padding:20px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f5;border-radius:8px"><tr><td style="padding:14px 16px;font-size:14px;line-height:1.5"><div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#777">[[tracking_company]] tracking number</div><div style="font-weight:bold;padding-top:2px">[[tracking_number]]</div></td></tr></table></td></tr>
${centered(`${button('[[tracking_url]]', text(s.buttonText))}<div style="padding-top:12px;font-size:13px"><a href="[[order_status_url]]" style="color:${brand}">View your order</a></div>`)}`;
    extra.no_tracking_block = centered(button('[[order_status_url]]', 'View your order'));
    body = `${muted('Order [[order_name]]')}
[[tracking]]
${itemsTable}
${address('Shipping to')}`;
  } else {
    // [[refunded_items]] becomes refunded_items_block when specific items were refunded, else nothing.
    extra.refunded_items_block = `<tr><td style="padding:18px 32px 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#777">Refunded items</td></tr>
${itemsTable}`;
    body = `${muted('Order [[order_name]]')}
<tr><td style="padding:16px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f5;border-radius:8px"><tr><td style="padding:14px 16px;font-size:14px;color:#777">Refund total</td><td align="right" style="padding:14px 16px;font-size:20px;font-weight:bold;color:${fg}">[[refund_amount]]</td></tr></table></td></tr>
[[refunded_items]]
${centered(button('[[order_status_url]]', text(s.buttonText)))}`;
  }

  const layout = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};font-family:${font};color:${fg}">
<tr><td align="center" style="padding:32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden">
<tr><td style="padding:28px 32px 8px;text-align:center">${header}</td></tr>
<tr><td style="padding:16px 32px 0"><h1 style="margin:0;font-size:24px;line-height:1.3;color:${fg}">${text(s.heading)}</h1></td></tr>
<tr><td style="padding:10px 32px 0;font-size:15px;line-height:1.6">${text(s.intro)}</td></tr>
${body}
<tr><td style="padding:0 32px 28px;font-size:13px;color:#777;text-align:center">${text(s.footer)}</td></tr>
</table>
</td></tr>
</table>`;

  const item_row = itemRow(template !== 'shipping_confirmation');
  const css = `@media (max-width:480px){h1{font-size:20px!important}}a.sw-button:hover{opacity:.9}`;

  // Safety net: our own markup must never use a placeholder the store's engine doesn't replace.
  const parts = [layout, item_row, ...Object.values(extra)];
  const min_engine = requiredEngine(template, ...parts);
  if (min_engine > engine) {
    throw new Error(`This design needs Sendwell engine v${Number.isFinite(min_engine) ? min_engine : '?'} but the store has v${engine}. Unknown or newer placeholders: ${unsupported(template, parts.join(''), engine).join(', ')}`);
  }

  return { version: 1, template, min_engine, engine, css, layout, item_row, ...extra, settings: s };
}
