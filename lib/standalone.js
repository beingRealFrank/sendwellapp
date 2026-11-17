// Bakes a design into an engine so the template works on its own, with no app and no metafield:
// the free web designer hands merchants this. The Sendwell app instead keeps the design in a
// shop metafield so later changes need no re-paste.

import { TEMPLATES } from './engine-versions.js';

// Merchant text is HTML-escaped by buildDesign but braces pass through; in a pasted template
// "{{" or "{%" would run as Liquid, so neutralize them.
const inert = (s) => String(s ?? '').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');

export function standaloneTemplate(engineSource, design) {
  const key = TEMPLATES[design.template || 'order_confirmation'].metafield;
  const read = `{%- assign sw = shop.metafields.sendwell.${key} -%}`;
  if (!engineSource.includes(read)) throw new Error(`engine does not read sendwell.${key}`);
  const fields = Object.entries(design).filter(([k, v]) => typeof v === 'string' && (k === 'css' || k === 'layout' || k === 'item_row' || k.endsWith('_block')));
  const captures = fields.map(([k, v]) => `{%- capture sw_${k} -%}${inert(v)}{%- endcapture -%}`).join('\n');
  let out = engineSource.replace(read, `${captures}\n{%- assign sw = nil -%}`);
  // Point every read of the design at the baked-in captures.
  for (const [k] of fields) out = out.split(`sw.${k} | append: ''`).join(`sw_${k} | append: ''`).split(`{{ sw.${k} }}`).join(`{{ sw_${k} }}`);
  out = out.replace(/\{%- assign sw_layout = sw_layout \| append: '' -%\}/, '');
  out = out.replace("{%- if sw.min_engine > sw_engine -%}{%- assign sw_layout = '' -%}{%- endif -%}\n", '');
  return out.replace(/Paste this once into ([^\n]+)\./, 'Paste this into $1. Made with the free Sendwell designer: https://beingrealfrank.github.io/sendwellapp/');
}
