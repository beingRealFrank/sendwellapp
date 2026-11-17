import { TEMPLATES } from './engine-versions.js';

// Renders the Sendwell engine locally with LiquidJS, mimicking the Shopify
// notification filters the engine uses (money, img_url). Used by the live
// preview and the tests. Pass a Liquid class (from 'liquidjs' or the browser bundle).

export function makeEngine(Liquid, { moneyFormat = '${{amount}}' } = {}) {
  const liquid = new Liquid({ strictFilters: true, ownPropertyOnly: true });
  liquid.registerFilter('money', (cents) => {
    const n = Number(cents);
    if (!Number.isFinite(n)) return '';
    const amount = (n / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return moneyFormat.replace(/\{\{\s*amount\s*\}\}/, amount);
  });
  liquid.registerFilter('img_url', (img) => (img && typeof img === 'object' ? img.src || '' : img || ''));
  return liquid;
}

// data: notification variables (see fixtures/sample_order.json); design: buildDesign() output,
// stored under its template's metafield key as Shopify would.
export async function renderEmail(liquid, engineSource, data, design) {
  const key = TEMPLATES[design?.template || 'order_confirmation'].metafield;
  const shop = { ...(data.shop || {}), metafields: { sendwell: { [key]: design } } };
  return liquid.parseAndRender(engineSource, { ...data, shop });
}
