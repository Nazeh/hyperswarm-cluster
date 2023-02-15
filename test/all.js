import test from 'brittle'
import Hyperswarm from 'hyperswarm'
import { cpus } from 'node:os'

import HyperswarmCluster from '../index.js'

test("open - destroy", async (t) => {
  const cluster = new HyperswarmCluster()
  await cluster.destroy()
})

test.solo("announce topic", async (t) => {
  const cluster = new HyperswarmCluster()
  const swarm = new Hyperswarm()

  t.plan(2)

  const topic = random()

  const discovery = cluster.join(topic, {server: true, client: false})
  console.log(discovery.flushed())
  await discovery.flushed()
  console.log("AFTER FLUSH")

  cluster.on('connection', (conn) => {
    t.alike(conn.remotePublicKey, swarm.keyPair.publicKey)
    conn.write('foo')
  })

  await swarm.join(topic)
  swarm.on('connection', (conn) => {
    conn.on('message', (message) => {
      console.log(message)
      t.is(message, 'foo')
    })
  })
  
  await t

  await cluster.destroy()
})

function random () {
  let x = ''
  for (let i=0; i < 8; i++) {
    x += Math.random().toString(16).slice(2);
  }
  return Buffer.from(x.slice(0, 64), 'hex')
}
