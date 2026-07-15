/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {exportJWK, generateKeyPair, SignJWT} from 'jose';
import {DefaultCrypto} from '../DefaultCrypto';
import TokenConstants from '../constants/TokenConstants';
import {JWKInterface} from '../models/crypto';

describe('DefaultCrypto.verifyJwt with ML-DSA (AKP JWKs)', (): void => {
  it.each(['ML-DSA-44', 'ML-DSA-65', 'ML-DSA-87'] as const)(
    'verifies an id_token signed with %s against its AKP JWK',
    async (alg): Promise<void> => {
      const {publicKey, privateKey} = await generateKeyPair(alg, {extractable: true});
      const jwk = (await exportJWK(publicKey)) as unknown as JWKInterface;
      jwk.alg = alg;
      jwk.kid = `test-${alg}`;
      jwk.use = 'sig';

      const idToken: string = await new SignJWT({})
        .setProtectedHeader({alg, kid: jwk.kid})
        .setIssuedAt()
        .setIssuer('https://issuer.example')
        .setAudience('client-id')
        .setSubject('user-id')
        .setExpirationTime('1h')
        .sign(privateKey);

      const crypto = new DefaultCrypto();
      const result: boolean = await crypto.verifyJwt(
        idToken,
        jwk,
        TokenConstants.SignatureValidation.SUPPORTED_ALGORITHMS as unknown as string[],
        'client-id',
        'https://issuer.example',
        'user-id',
      );

      expect(result).toBe(true);
    },
  );

  it('rejects an ML-DSA id_token with a tampered signature', async (): Promise<void> => {
    const alg = 'ML-DSA-65';
    const {publicKey, privateKey} = await generateKeyPair(alg, {extractable: true});
    const jwk = (await exportJWK(publicKey)) as unknown as JWKInterface;
    jwk.alg = alg;
    jwk.kid = 'test-tampered';
    jwk.use = 'sig';

    const idToken: string = await new SignJWT({})
      .setProtectedHeader({alg, kid: jwk.kid})
      .setIssuedAt()
      .setIssuer('https://issuer.example')
      .setAudience('client-id')
      .setSubject('user-id')
      .setExpirationTime('1h')
      .sign(privateKey);

    const parts: string[] = idToken.split('.');
    const tamperedSignature: string = parts[2].slice(0, -4) + (parts[2].endsWith('AAAA') ? 'BBBB' : 'AAAA');
    const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSignature}`;

    const crypto = new DefaultCrypto();
    await expect(
      crypto.verifyJwt(
        tamperedToken,
        jwk,
        TokenConstants.SignatureValidation.SUPPORTED_ALGORITHMS as unknown as string[],
        'client-id',
        'https://issuer.example',
        'user-id',
      ),
    ).rejects.toThrow();
  });
});
