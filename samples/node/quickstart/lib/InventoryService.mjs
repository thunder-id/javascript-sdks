const CATALOG = {
  'SKU-100': {sku: 'SKU-100', name: 'Wireless Mouse', stock: 42},
  'SKU-200': {sku: 'SKU-200', name: 'Mechanical Keyboard', stock: 7},
  'SKU-300': {sku: 'SKU-300', name: '4K Monitor', stock: 0},
};

/**
 * Business logic for a service that needs to call another backend. It asks
 * AuthService for a token before answering, so the rest of the app never
 * handles a token or an Authorization header directly. In a real deployment
 * this would send the token to a separate inventory service over HTTP
 * instead of just holding it in-process.
 */
export class InventoryService {
  constructor({auth}) {
    this.auth = auth;
  }

  async getStock(sku) {
    // A real backend would attach this as `Authorization: Bearer ${accessToken}`
    // on the request to the inventory service; here it just proves the token
    // was obtained before answering.
    await this.auth.getAccessToken();

    const item = CATALOG[sku];
    if (!item) throw new Error(`No item with SKU ${sku}`);
    return item;
  }
}
