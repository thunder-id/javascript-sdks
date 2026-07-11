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

import {CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException} from '@nestjs/common';
import {ThunderIDRequest} from '../models/config';
import ThunderIDService from '../ThunderIDService';

/**
 * Guard that blocks unauthenticated requests — the NestJS equivalent of the
 * Express SDK's `protect()` middleware.
 *
 * On success, the authenticated user is attached to the request and can be
 * read with the `@CurrentUser()` param decorator.
 *
 * ```ts
 * @UseGuards(ThunderIDGuard)
 * @Get('profile')
 * profile(@CurrentUser() user: User) {
 *   return user;
 * }
 * ```
 */
@Injectable()
class ThunderIDGuard implements CanActivate {
  public constructor(@Inject(ThunderIDService) private readonly thunderID: ThunderIDService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: ThunderIDRequest = context.switchToHttp().getRequest<ThunderIDRequest>();

    if (!(await this.thunderID.isSignedIn(req))) {
      throw new UnauthorizedException();
    }

    req.thunderIDUser = await this.thunderID.getUser(req);

    return true;
  }
}

export default ThunderIDGuard;
