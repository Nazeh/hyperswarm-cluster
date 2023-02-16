# Hyperswarm Cluster

Scalable hyperswarm cluster to announce 1000s of topics as quickly as possible.

## Features

[x] - Multithreading
[ ] - Horizontal scaling


## Usage 

```js
import HyperswarmCluster = require('@synonymdev/hyperswarm-cluster')

const swarm = new HyperswarmCluster()
await swarm.ready() // await opening of all child processes

swarm.on('connection', (conn) => {
  // do something
})

cnost topics = [
  //...
]

for (let i=0; i < 3000; i++) {
  swarm.join(topics[i], { server: true, client: false })
}
```

## API

// TODO
