import net from 'net'

import DHT from '@hyperswarm/dht'
import { relay } from '@hyperswarm/dht-relay'
import Stream from '@hyperswarm/dht-relay/tcp'

let opts = {}
try {
  opts = JSON.parse(process.argv[2])
} catch (error) {}

const dht = new DHT(opts)
const server = net.createServer().listen(() => {
  /** @type {number} port */
  // @ts-ignore
  const port = server.address()?.port

  console.log('port', port)
  process.send?.(port)
})

server.on('connection', (socket) => {
  const stream = new Stream(false, socket)
  stream.on('close', noop)
  relay(dht, stream)
})

function noop () {}
