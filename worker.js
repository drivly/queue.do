export default {
  fetch: (req, env) => {
    const { hostname, pathname } = new URL(req.url)
    const [ _, instance ] = pathname.split('/')
    const id = env.QUEUE.idFromName(hostname + instance)
    const stub = env.QUEUE.get(id)
    return stub.fetch(req)
  },
}

export class Queue {
  constructor(state, env) {
    this.state = state
    state.blockConcurrencyWhile(async () => {
      this.cursor = await this.state.storage.get('cursor')
    })
  }

  async fetch(req) {
    const { url, method } = req
    const { origin, hostname, pathname, searchParams, hash } = new URL(url)
    const [ _, instance, operation ] = pathname.split('/')
    const id = req.headers.get('cf-ray') + '-' + req.cf.colo
    const ts = Date.now()
    
    if (operation == 'enqueue') {
      // Add new item to queue
      await this.state.storage.put(id, Object.fromEntries(searchParams))
      if (!this.cursor) {
        this.cursor = id
        this.state.storage.put('cursor', this.cursor)
      }
    }
            
    // get next item in queue
    const data = await this.state.storage.list({ startAfter: this.cursor, reverse: true, limit: searchParams.get('limit') ?? 1 })
    
    if (operation == 'dequeue') {
      // update the cursor position
      const keys = Array.from(data.keys())
      this.state.storage.put('cursor', keys[keys.size - 1])
    }
    
    const retval = {
      origin,
      method,
      hostname,
      pathname,
      searchParams,
      hash,
      id,
      ts,
      data,
    }
    
    return new Response(JSON.stringify(retval, null, 2), { headers: { 'content-type': 'application/json' } })
  }
}
