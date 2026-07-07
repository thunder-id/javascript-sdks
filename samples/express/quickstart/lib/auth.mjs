/**
 * Bearer-token protection for the API routes in this quickstart.
 *
 * This is a resource-server style check: it does not depend on a browser
 * session or cookie. Any client (curl, Postman, another service) can call
 * a protected endpoint by sending a ThunderID-issued access token in the
 * `Authorization: Bearer <token>` header. The token is validated by asking
 * ThunderID's OIDC userinfo endpoint whether it's still valid — the same
 * endpoint any OAuth 2.0 resource server would call.
 */
export function verifyBearerToken(baseUrl) {
  return async function bearerAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      res.set('WWW-Authenticate', 'Bearer realm="thunderid-express-quickstart"');
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Missing or malformed Authorization header. Expected: Authorization: Bearer <access_token>',
      });
    }

    let response;
    try {
      response = await fetch(`${baseUrl}/oauth2/userinfo`, {
        headers: {Authorization: `Bearer ${token}`},
      });
    } catch {
      return res.status(502).json({
        error: 'bad_gateway',
        message: 'Could not reach ThunderID to validate the access token.',
      });
    }

    if (!response.ok) {
      res.set('WWW-Authenticate', 'Bearer error="invalid_token"');
      return res.status(401).json({
        error: 'invalid_token',
        message: 'The access token is invalid or expired. Get a fresh one at /token.',
      });
    }

    req.thunderIDUserInfo = await response.json();
    next();
  };
}
