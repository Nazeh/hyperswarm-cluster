import { cpus } from 'node:os'
import { fork } from 'node:child_process'
import debug from 'debug'
import { EventEmitter } from 'events'
import net from 'net'
import Hyperswarm from 'hyperswarm'

import DHT from '@hyperswarm/dht-relay'
import Stream from '@hyperswarm/dht-relay/tcp'

import CustomMap from './lib/map.js'

const CHILD_PATH = './lib/child.js'
const MAX_THREADS_COUNT = cpus().length

const log = debug('hyperswarm-cluster-primary')

export default class HyperswarmCluster extends EventEmitter {
  /**
   * @param {Options} [opts]
   */
  constructor (opts = {}) {
    super()

    opts = {
      bootstrap: opts.bootstrap
    }

    /** @type {Map<string, Node>} */
    this.nodes = new CustomMap()

    this.opened = this._open(opts)

    // Cleanup child processes in the case of uncaughtException
    process.once('uncaughtException', (err) => {
      this.destroy().then(() => { throw err })
    })
  }

  [Symbol.iterator] () {
    return this.nodes.values()
  }

  ready () {
    return this.opened
  }

  /**
   * Set up child processes
   * @param {Options} opts
   */
  async _open (opts) {
    /** @type {Map<number, Promise<any>>} */
    const promises = new Map()

    for (let i = 0; i < MAX_THREADS_COUNT; i++) {
      const opened = Node.init(opts).then(node => {
        if (!node) return

        node.on('connection', (conn, peerInfo) => {
          this.emit('connection', conn, peerInfo)
        })

        if (!node._tcpAddress) return

        this.nodes.set(node._tcpAddress, node)
      })
      promises.set(i, opened)
    }

    return Promise.all([...promises.values()])
      .then(() => true)
  }

  /**
   * @param {Buffer} topic
   * @param {object} [opts]
   */
  join (topic, opts = {}) {
    /** @type {Node} */
    // @ts-ignore
    const child = this.nodes.next()
    return child?.join(topic, opts)
  }

  flush () {
    return Promise.all([...this.nodes.values()].map(child => child.flush()))
  }

  async destroy () {
    await this.ready()
    log('destroying cluster')
    return Promise.all([...this.nodes.values()].map(child => child.destroy()))
  }
}

class Node extends Hyperswarm {
  /**
   * @param {Options} opts
   */
  constructor (opts) {
    super(opts)
    this._tcpAddress = null
    this._childProcess = null
  }

  /**
   * @param {Options} opts
   */
  static async init (opts = {}) {
    return new Promise((resolve, reject) => {
      /** @type {import('child_process').ChildProcess} */
      const child = fork(CHILD_PATH, [JSON.stringify(opts)])

      child.once('close', (code, signal) => {
        log('Closed child:', { code, signal })
        resolve(false)
      })

      child.once('message', (/** @type {number} */ port) => {
        if (typeof port !== 'number') resolve(false)
        if (!port) return

        const socket = net.connect(port)
        const dht = new DHT(new Stream(true, socket))

        const node = new Node({ ...opts, dht })
        node._tcpAddress = 'localhost:' + Math.random()
        node._childProcess = child

        resolve(node)
      })
    })
  }

  /**
   * Destroy all sockets and child processes used by the cluster
   */
  async destroy () {
    // await this.dht.destroy()
    await super.destroy()
    this._childProcess?.kill()
  }
}

/**
 * @typedef {{
 *  bootstrap?: {host: string, port: number}[]
 *  dht?: any
 * }} Options
 */
