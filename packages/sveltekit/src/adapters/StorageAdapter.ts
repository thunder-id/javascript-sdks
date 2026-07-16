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

export interface StorageAdapter {
  getData(key: string): Promise<string | null>;
  setData(key: string, value: string): Promise<void>;
  removeData(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class DefaultStorage implements StorageAdapter {
  private store: Map<string, string> = new Map();

  async getData(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setData(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeData(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
