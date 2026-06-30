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

const TOKEN_PATTERN = /^[A-Za-z0-9\-_.]+\.[A-Za-z0-9\-_.]+\.[A-Za-z0-9\-_.]+$/;
const EMAIL_PATTERN = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const PHONE_PATTERN = /(\+?\d[\d\s\-().]{6,}\d)/g;

export function sanitizeForLog(input: string): string {
  let result: string = input;

  result = result.replace(EMAIL_PATTERN, (_match: string, local: string, domain: string) => {
    const maskedLocal: string = local.length > 1 ? local[0] + '*'.repeat(local.length - 1) : local[0];
    const domainParts: string[] = domain.split('.');
    const maskedDomain: string = domainParts.map((part: string, i: number) =>
      i === domainParts.length - 1 ? part : '*'.repeat(part.length),
    ).join('.');
    return `${maskedLocal}@${maskedDomain}`;
  });

  result = result.replace(PHONE_PATTERN, (match: string) => {
    const digits: string = match.replace(/\D/g, '');
    if (digits.length <= 4) return match;
    const last4: string = digits.slice(-4);
    const prefix: string = digits.length > 4 ? digits[0] : '';
    return prefix + '*'.repeat(digits.length - 4 - (prefix ? 1 : 0)) + last4;
  });

  return result;
}

export function sanitizeTokenForLog(token: string): string {
  if (TOKEN_PATTERN.test(token)) {
    const parts: string[] = token.split('.');
    return `${parts[0]}.${parts[1].substring(0, 8)}...<masked>`;
  }
  return '<token-masked>';
}
