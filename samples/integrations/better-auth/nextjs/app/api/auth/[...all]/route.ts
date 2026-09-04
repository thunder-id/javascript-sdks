import { toNextJsHandler } from 'better-auth/next-js'
import { getAuth } from '../../../../lib/auth'

export const { GET, POST } = toNextJsHandler({
  handler: (request) => getAuth().handler(request),
})
