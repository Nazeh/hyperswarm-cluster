import HyperswarmCluster from './index.js'

const COUNT = process.argv[2] || 3000

const cluster = new HyperswarmCluster()
await cluster.ready()

const shared = COUNT + ' topics, on ' + cluster.nodes.size + ' threads'

console.log('Announcing ' + shared + '...')

const title = 'Announced  ' + shared + ' in'
console.time(title)

for (let i = 0; i < COUNT; i++) {
  cluster.join(random(), { srever: true, client: false })
}

await cluster.flush()
console.timeEnd(title)

await cluster.destroy()

function random () {
  let x = ''
  for (let i = 0; i < 8; i++) {
    x += Math.random().toString(16).slice(2)
  }
  return Buffer.from(x.slice(0, 64), 'hex')
}
