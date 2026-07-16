import {describe, it, expect} from 'vitest';
import {sanitizeForLog, sanitizeTokenForLog} from '../logger/sanitizer';

describe('sanitizeForLog', () => {
  it('should mask email addresses', () => {
    expect(sanitizeForLog('user@example.com')).toBe('u***@*******.com');
  });

  it('should mask phone numbers', () => {
    const result = sanitizeForLog('+1 (555) 123-4567');
    expect(result).not.toContain('5551234567');
    expect(result).toContain('4567');
  });

  it('should mask password in JSON format', () => {
    const result = sanitizeForLog('{"password":"mySecret123"}');
    expect(result).toBe('{"password":"***"}');
  });

  it('should mask newPassword in JSON format', () => {
    const result = sanitizeForLog('{"newPassword":"newSecret456"}');
    expect(result).toBe('{"newPassword":"***"}');
  });

  it('should mask currentPassword in JSON format', () => {
    const result = sanitizeForLog('{"currentPassword":"oldPass789"}');
    expect(result).toBe('{"currentPassword":"***"}');
  });

  it('should mask secret in JSON format', () => {
    const result = sanitizeForLog('{"secret":"very-secret-value"}');
    expect(result).toBe('{"secret":"***"}');
  });

  it('should mask otp in JSON format', () => {
    const result = sanitizeForLog('{"otp":"123456"}');
    expect(result).toBe('{"otp":"***"}');
  });

  it('should mask pin in JSON format', () => {
    const result = sanitizeForLog('{"pin":"7890"}');
    expect(result).toBe('{"pin":"***"}');
  });

  it('should mask verificationCode in JSON format', () => {
    const result = sanitizeForLog('{"verificationCode":"abc123"}');
    expect(result).toBe('{"verificationCode":"***"}');
  });

  it('should mask mfaToken in JSON format', () => {
    const result = sanitizeForLog('{"mfaToken":"some-token"}');
    expect(result).toBe('{"mfaToken":"***"}');
  });

  it('should mask password in query string format', () => {
    const result = sanitizeForLog('password=mySecret123&grant_type=password');
    expect(result).toBe('password=***&grant_type=password');
  });

  it('should mask otp in query string format', () => {
    const result = sanitizeForLog('otp=123456&user=test');
    expect(result).toBe('otp=***&user=test');
  });

  it('should mask code in query string format', () => {
    const result = sanitizeForLog('code=abc123&state=xyz');
    expect(result).toBe('code=***&state=xyz');
  });

  it('should mask secret in query string format', () => {
    const result = sanitizeForLog('client_secret=supersecret&client_id=myapp');
    expect(result).toBe('client_secret=***&client_id=myapp');
  });

  it('should mask multiple sensitive fields', () => {
    const result = sanitizeForLog('{"password":"pass","otp":"123456","email":"test@example.com"}');
    expect(result).toContain('"password":"***"');
    expect(result).toContain('"otp":"***"');
    expect(result).toContain('"email"');
    expect(result).toMatch(/"password":"\*\*\*"/);
    expect(result).not.toMatch(/"password":"pass"/);
    expect(result).not.toContain('123456');
  });

  it('should not modify safe strings', () => {
    const safe = '{"name":"John","role":"admin"}';
    expect(sanitizeForLog(safe)).toBe(safe);
  });

  it('should not modify safe strings containing JWT-like patterns (inline tokens not masked by sanitizeForLog)', () => {
    const msg = 'Processing token for user 123';
    expect(sanitizeForLog(msg)).toBe(msg);
  });
});

describe('sanitizeTokenForLog', () => {
  it('should mask JWT token preserving header and first 8 chars of payload', () => {
    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8';
    const result = sanitizeTokenForLog(token);
    expect(result).toBe('eyJhbGciOiJIUzI1NiJ9.eyJzdWIi...<masked>');
  });

  it('should return masked string for non-JWT input', () => {
    expect(sanitizeTokenForLog('not-a-token')).toBe('<token-masked>');
  });
});
