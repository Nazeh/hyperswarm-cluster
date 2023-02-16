import test from 'brittle'
import Hyperswarm from 'hyperswarm'
import createTestnet from '@hyperswarm/testnet'

import HyperswarmCluster from '../index.js'

test('open - destroy', async (t) => {
  const cluster = new HyperswarmCluster()
  await cluster.destroy()
})

test('announce topic', async (t) => {
  const testnet = await createTestnet(3, t.teardown)

  const cluster = new HyperswarmCluster(testnet)
  await cluster.ready()

  const swarm = new Hyperswarm(testnet)

  // t.plan(2)

  const topic = random()

  const discovery = cluster.join(topic, { server: true, client: false })
  await discovery.flushed()

  cluster.on('data', (data) => {
    console.log('HERE BE DATA', data)
  })

  cluster.on('connection', (conn) => {
    console.log(cluster)
    console.log('LOOK LOOK', conn.remotePublicKey)
    t.alike(conn.remotePublicKey, swarm.keyPair.publicKey)
    conn.write('foo')
    conn.on('message', (message) => {
      console.log('message in swarm', message)
      t.is(message, 'foo')
    })
  })

  await swarm.join(topic)
  swarm.on('connection', (conn) => {
    conn.write('foo from swarm')
    conn.on('message', (message) => {
      console.log('message in swarm', message)
      t.is(message, 'foo')
    })
  })

  await t

  await cluster.destroy()
  await swarm.destroy()
})

function random () {
  let x = ''
  for (let i = 0; i < 8; i++) {
    x += Math.random().toString(16).slice(2)
  }
  return Buffer.from(x.slice(0, 64), 'hex')
}
