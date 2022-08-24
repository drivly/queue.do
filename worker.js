export default {
  fetch: (req, env) => {
    const { hostname, pathname } = new URL(req.url)
    const id = env.QUEUE.idFromName(hostname + pathname)
    const stub = env.QUEUE.get(id)
    return stub.fetch(req)
  },
}

export class Queue {
  constructor(state, env) {
    this.state = state
  }

  async fetch(req) {
    const { url, method } = req
    const { origin, hostname, pathname, searchParams, hash } = new URL(url)
    const id = req.headers.get('cf-ray') + '-' + req.cf.colo
    const ts = Date.now()
    const retval = {
      origin,
      method,
      hostname,
      pathname,
      searchParams,
      hash,
      id,
      ts,
    }
    return new Response(JSON.stringify(retval, null, 2), { headers: { 'content-type': 'application/json' } })
  }
}
