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
    const { origin, hostname, pathname, search, searchParams, hash } = new URL(url)
    const [ _, instance, operation ] = pathname.split('/')
    const id = req.headers.get('cf-ray') + '-' + req.cf.colo
    const ts = Date.now()
    
    console.log({ id, ts, search, })
    
    console.log('hello world')
    
    if (operation == 'enqueue') {
      // Add new item to queue
      console.log({ id, ts, search, 
                   //data: Object.fromEntries(searchParams) 
                  })
      await this.state.storage.put(id, { id, ts, search, 
                                        //data: Object.fromEntries(searchParams) 
                                       })
    }
            
    // get next item in queue
    const data = await this.state.storage.list({ startAfter: this.cursor, 
                                                //reverse: true, 
                                                limit: searchParams.get('limit') ?? 1 }).then(data => Object.fromEntries(data))
    
    if (operation == 'dequeue') {
      // update the cursor position
      const keys = Object.keys(data)
      console.log({keys})
      this.cursor = keys[0]
      this.state.storage.put('cursor', this.cursor)
    }
    
    const all = await this.state.storage.list().then(data => Object.fromEntries(data))
    
    console.log({all})
    
    const retval = {
      origin,
      method,
      hostname,
      pathname,
      search,
      searchParams,
      hash,
      id,
      ts,
      instance,
      doId: this.state.id.toString(),
      operation,
      cursor: this.cursor,
      keys,
      data,
      all,
    }
    
    return new Response(JSON.stringify(retval, null, 2), { headers: { 'content-type': 'application/json' } })
  }
}
