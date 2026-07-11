# @thunderid/nestjs

NestJS SDK for [ThunderID](https://github.com/thunder-id/thunderid). Built on top of [`@thunderid/express`](../express)
— works with NestJS applications running on the default Express platform.

## Installation

```bash
npm install @thunderid/nestjs cookie-parser
```

## Setup

Register `cookie-parser` and the ThunderID module:

```ts
// main.ts
import cookieParser from 'cookie-parser';

const app = await NestFactory.create(AppModule);
app.use(cookieParser());
```

```ts
// app.module.ts
import {ThunderIDModule} from '@thunderid/nestjs';

@Module({
  imports: [
    ThunderIDModule.forRoot({
      clientId: process.env.THUNDERID_CLIENT_ID,
      baseUrl: process.env.THUNDERID_BASE_URL,
    }),
  ],
})
export class AppModule {}
```

The module is global — `ThunderIDService` and `ThunderIDGuard` are injectable everywhere.

## Sign-in / sign-out routes

```ts
import {Request, Response} from 'express';
import {ThunderIDService} from '@thunderid/nestjs';

@Controller()
export class AuthController {
  constructor(private readonly thunderID: ThunderIDService) {}

  @Get('login')
  async login(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.thunderID.signIn(req, res);
    if (tokens.accessToken || tokens.idToken) {
      res.redirect('/');
    }
    // If no tokens were returned, signIn has already redirected the
    // response to the ThunderID sign-in page.
  }

  @Get('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    if (this.thunderID.isSignOutSuccess(req)) {
      res.redirect('/');
      return;
    }
    await this.thunderID.signOut(req, res);
  }
}
```

## Protecting routes

```ts
import {CurrentUser, ThunderIDGuard, User} from '@thunderid/nestjs';

@Controller()
export class ProfileController {
  @UseGuards(ThunderIDGuard)
  @Get('profile')
  profile(@CurrentUser() user: User) {
    return user;
  }
}
```

`ThunderIDGuard` returns `401 Unauthorized` for requests without a valid session. `@CurrentUser()` resolves the
authenticated user attached by the guard.

## API

| Export                            | Description                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `ThunderIDModule.forRoot(config)` | Global module; accepts `ThunderIDNestConfig` (same shape as the Node SDK config)                                   |
| `ThunderIDService`                | `signIn(req, res)`, `signOut(req, res)`, `isSignOutSuccess(req)`, `isSignedIn(req)`, `getUser(req)`, `getClient()` |
| `ThunderIDGuard`                  | Route guard that blocks unauthenticated requests                                                                   |
| `@CurrentUser()`                  | Param decorator resolving the authenticated `User` (requires `ThunderIDGuard`)                                     |

Everything from `@thunderid/express` (and transitively `@thunderid/node` / `@thunderid/javascript`) is re-exported.

## License

Apache-2.0
