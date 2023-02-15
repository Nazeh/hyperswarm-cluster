import Hyperswarm from 'hyperswarm'
import { decode, encode } from './messages.js'

const swarm = new Hyperswarm()

swarm.on('connection', (conn) => {
  console.log("GOT CONNECTION")
})

process.on('message', (/** @type {string} */ data) => {
  const call = decode(data)

  if (!call) return
  switch(call.method) {
    case "JOIN":
      const [topicHex, opts] = call.args
      const discovery = swarm.join(Buffer.from(topicHex, 'hex'), opts);
      discovery.flushed().then(() => {
        process.send?.(encode("joinFlushed", [topicHex]))
      })
    default:
      return
  }
});
