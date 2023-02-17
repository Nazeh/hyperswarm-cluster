import test from 'brittle'
import Hyperswarm from 'hyperswarm'
import Corestore from 'corestore'
import RAM from 'random-access-memory'
import createTestnet from '@hyperswarm/testnet'

import HyperswarmCluster from '../index.js'

test('open - destroy', async (t) => {
  const testnet = await createTestnet(3, t.teardown)
  const cluster = new HyperswarmCluster(testnet)
  await cluster.ready()

  await cluster.destroy()
})

test('announce topic', async (t) => {
  const testnet = await createTestnet(3, t.teardown)

  const tc = t.test('connection')
  tc.plan(2)

  const cluster = new HyperswarmCluster(testnet)
  await cluster.ready()

  const swarm = new Hyperswarm(testnet)

  cluster.on('connection', (conn) => {
    conn.on('error', noop)
    tc.alike(conn.remotePublicKey, swarm.keyPair.publicKey)
  })

  const topic = random()
  cluster.join(topic, { srever: true, client: false })

  await cluster.flush()

  swarm.on('connection', (conn) => {
    tc.alike(conn.remotePublicKey, cluster.nodes.values().next().value.keyPair.publicKey)
  })

  swarm.join(topic)

  await tc

  await swarm.destroy()
  await cluster.destroy()
})

test('corestore replication', async (t) => {
  const testnet = await createTestnet(3, t.teardown)

  const cluster = new HyperswarmCluster(testnet)
  await cluster.ready()
  const storeA = new Corestore(RAM)
  cluster.on('connection', conn => storeA.replicate(conn))

  const coreA = storeA.get({ name: 'foo' })
  await coreA.ready()

  await cluster.join(coreA.discoveryKey, { server: true, client: false }).flushed()

  const swarm = new Hyperswarm(testnet)
  const storeB = new Corestore(RAM)
  swarm.on('connection', conn => storeB.replicate(conn))

  const coreB = storeB.get({ key: coreA.key })
  await coreB.ready()

  swarm.join(coreB.discoveryKey)

  await coreA.append(['foo', 'bar'])

  coreB.findingPeers()
  await coreB.update()
  t.is(coreB.length, 2)

  const block = await coreB.get(1)
  t.is(block?.toString(), 'bar')

  await swarm.destroy()
  await cluster.destroy()
})

function random () {
  let x = ''
  for (let i = 0; i < 8; i++) {
    x += Math.random().toString(16).slice(2)
  }
  return Buffer.from(x.slice(0, 64), 'hex')
}
function noop () {}
