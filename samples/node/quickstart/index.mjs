import {AuthService} from './lib/AuthService.mjs';
import {InventoryService} from './lib/InventoryService.mjs';
import {printIntro, printConfigNeeded, printAuthenticated, printInventory} from './lib/ui.mjs';

printIntro();

const REQUIRED_ENV_VARS = ['THUNDERID_CLIENT_ID', 'THUNDERID_CLIENT_SECRET'];
const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  printConfigNeeded(missingEnvVars);
  process.exit(1);
}

const THUNDER_BASE_URL = process.env.THUNDERID_BASE_URL || 'https://localhost:8090';

// AuthService authenticates as this service itself (grantType: 'client_credentials'),
// no user and no browser sign-in, unlike the express/react/etc quickstarts, which
// authenticate a human through a login page.
const auth = new AuthService({
  baseUrl: THUNDER_BASE_URL,
  clientId: process.env.THUNDERID_CLIENT_ID,
  clientSecret: process.env.THUNDERID_CLIENT_SECRET,
  scopes: process.env.THUNDERID_SCOPE,
});

const inventory = new InventoryService({auth});

const accessToken = await auth.getAccessToken();
const {scope} = await auth.decodeAccessToken(accessToken);
printAuthenticated({baseUrl: THUNDER_BASE_URL, clientId: process.env.THUNDERID_CLIENT_ID, scope});

const rows = [];
for (const sku of ['SKU-100', 'SKU-200', 'SKU-300', 'SKU-999']) {
  try {
    const item = await inventory.getStock(sku);
    rows.push({sku, name: item.name, stock: item.stock});
  } catch (error) {
    rows.push({sku, error: error.message});
  }
}
printInventory(rows);
