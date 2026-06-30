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

import {sanitizeForLog} from './sanitizer';

/* eslint-disable no-console -- DefaultLogger intentionally wraps console as the default log transport */

export interface LoggerAdapter {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
}

export class DefaultLogger implements LoggerAdapter {
  private prefix: string;

  constructor(prefix = '[thunderid]') {
    this.prefix = prefix;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(this.prefix, sanitizeForLog(message), this.sanitizeContext(context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.info(this.prefix, sanitizeForLog(message), this.sanitizeContext(context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(this.prefix, sanitizeForLog(message), this.sanitizeContext(context));
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    console.error(this.prefix, sanitizeForLog(message), error ?? '', this.sanitizeContext(context));
  }

  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!context) return undefined;
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeForLog(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}

let _logger: LoggerAdapter = new DefaultLogger();

export function setLogger(logger: LoggerAdapter): void {
  _logger = logger;
}

export function getLogger(): LoggerAdapter {
  return _logger;
}
