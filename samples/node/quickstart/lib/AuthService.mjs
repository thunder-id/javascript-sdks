import {ThunderIDNodeClient} from '@thunderid/node';

/**
 * Authenticates this service as itself with the OAuth 2.0 client_credentials
 * grant, no user, no browser sign-in. Other services in this process (or a
 * real deployment) ask AuthService for a token instead of talking to
 * ThunderIDNodeClient directly, so the authentication concern stays in one
 * place and out of business logic like InventoryService.
 */
export class AuthService {
  #client = new ThunderIDNodeClient();
  #ready;

  constructor({baseUrl, clientId, clientSecret, scopes}) {
    this.#ready = this.#client.initialize({
      baseUrl,
      clientId,
      clientSecret,
      grantType: 'client_credentials',
      scopes,
    });
  }

  /** Fetches (or reuses the cached) access token for this service's own identity. */
  async getAccessToken() {
    await this.#ready;
    return this.#client.getAccessToken();
  }

  async decodeAccessToken(accessToken) {
    return this.#client.decodeJwtToken(accessToken);
  }
}
