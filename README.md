# Hyperswarm Cluster

Scalable hyperswarm cluster to announce 1000s of topics as quickly as possible.

## Usage 

```js
import HyperswarmCluster = require('@synonymdev/hyperswarm-cluster')

const cluster = new HyperswarmCluster()
await cluster.ready() // await opening of all relayed hyperswarm nodes

swarm.on('connection', (conn, peerInfo) => {
  // do something
})

cnost topics = [
  //...
]

for (let i=0; i < 3000; i++) {
  discovery = swarm.join(topics[i], { server: true, client: false })
  discovery.flush() // you can await the announcement of each topic on its own.
}

await cluster.flush()
// All topics announced

await cluster.destroy()
```

## Benchmark

```bash
  npm run benchmark <optional number of topics - default to 3000>
```
