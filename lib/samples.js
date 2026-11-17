// Builds the extra notification variables the shipping and refund templates need from an
// order's data, so the preview can show any order (the store's latest, or the sample) in all
// three emails. Shapes follow Shopify's notification variables (fulfillment, amount,
// refund_line_items).

export function withFulfillment(order, { tracking = true } = {}) {
  const number = '1Z999AA10123456784';
  return {
    ...order,
    fulfillment: {
      tracking_company: tracking ? 'UPS' : '',
      tracking_numbers: tracking ? [number] : [],
      tracking_urls: tracking ? [`https://www.ups.com/track?tracknum=${number}`] : [],
      fulfillment_line_items: (order.line_items || []).map((l) => ({ line_item: l, quantity: l.quantity })),
    },
  };
}

// A partial refund of one unit of the first item (or an amount-only refund with items: false).
export function withRefund(order, { items = true } = {}) {
  const first = (order.line_items || [])[0];
  const unit = first ? first.final_price ?? Math.round(first.final_line_price / first.quantity) : 0;
  return {
    ...order,
    amount: first ? unit : 1000,
    refund_line_items: items && first ? [{ line_item: first, quantity: 1 }] : [],
  };
}

export const sampleFor = (template, order) =>
  template === 'shipping_confirmation' ? withFulfillment(order) : template === 'refund_notification' ? withRefund(order) : order;
