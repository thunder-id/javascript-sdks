import {thunderIDProxy, createRouteMatcher} from '@thunderid/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

export default thunderIDProxy(async (thunderid, request) => {
  if (isProtectedRoute(request)) {
    await thunderid.protectRoute()
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
