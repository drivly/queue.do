export default {
  fetch: (req, env) => {
    const { hostname, pathname } = new URL(req.url)
    const instance = pathname.split('/')[1]
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
    const { pathname, search, searchParams } = new URL(req.url)
    const [_, instance, operation] = pathname.split('/')
    const id = req.headers.get('cf-ray') + '-' + req.cf.colo
    const ts = Date.now()

    const item = { id, ts, search }
    console.log(item)

    // Add new item to queue
    if (operation === 'enqueue') await this.state.storage.put(id, item)

    // get next item in queue
    const data = Object.fromEntries(
      await this.state.storage.list({
        startAfter: this.cursor,
        limit: Math.max(searchParams.get('limit'), 1) || 1,
      })
    )
    if (data.cursor) delete data.cursor

    if (operation === 'dequeue') {
      // update the cursor position
      const keys = Object.keys(data)
      const key = keys?.[keys.length - 1]
      if (key) this.state.storage.put('cursor', (this.cursor = key))
    }
    
    let all
    if (!searchParams.get('excludes').includes('all')) {
      all = Object.fromEntries(await this.state.storage.list())
    }

    console.log(all)

    const retval = {
      id,
      doId: this.state.id.toString(),
      ts,
      instance,
      operation,
      search,
      cursor: this.cursor,
      data,
      all,
    }

    return new Response(JSON.stringify(retval, null, 2), { headers: { 'content-type': 'application/json' } })
  }
}
