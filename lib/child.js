import net from 'net'
import debug from 'debug'

import DHT from '@hyperswarm/dht'
import { relay } from '@hyperswarm/dht-relay'
import Stream from '@hyperswarm/dht-relay/tcp'

const log = debug('hyperswarm-cluster-child')

let opts = {}
try {
  opts = JSON.parse(process.argv[2])
} catch (error) {}

const dht = new DHT(opts)

const server = net.createServer().listen(() => {
  /** @type {number} port */
  // @ts-ignore
  const port = server.address()?.port

  log('DHT relay running on port:', port, 'bootstrap:', dht.bootstrapNodes)
  process.send?.(port)
})

server.on('connection', (socket) => {
  relay(dht, new Stream(false, socket))
})
