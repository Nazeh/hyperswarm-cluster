import { cpus } from 'node:os'
import { fork } from 'node:child_process'
import debug from 'debug'
import { EventEmitter } from 'events'
import net from 'net'
import DHT from '@hyperswarm/dht'
import Hyperswarm from 'hyperswarm'
import Stream from '@hyperswarm/dht-relay/tcp'

import CustomMap from './lib/map.js'

const CHILD_PATH = './lib/child.js'

const MAX_THREADS_COUNT = cpus().length

const log = debug('hyperswarm-cluster-log')

export default class HyperswarmCluster extends EventEmitter {
  /**
   * @param {Options} [opts]
   */
  constructor (opts = {}) {
    super()

    opts = {
      bootstrap: opts.bootstrap
    }

    this._lastChildUsed = -1
    /** @type {Map<number, Child>} */
    this._children = new CustomMap()

    this.opened = this._open(opts)

    // Cleanup child processes in the case of uncaughtException
    process.on('uncaughtException', (err) => {
      this._children.forEach(child => child.destroy())
      throw err
    });
  }

  ready () {
    return this.opened
  }

  /** @param {Options} opts */
  async _open (opts) {
    /** @type {Map<number, Promise<any>>} */
    const promises = new Map()

    for (let i = 0; i < MAX_THREADS_COUNT; i++) {
      const child = new Child(this, i, opts)
      const opened = child.ready().then(() => this._children.set(i, child))
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
    /** @type {Child} */
    // @ts-ignore
    const child = this._children.next()
    return child?.swarm?.join(topic, opts)
  }

  flush () {
    return Promise.all([...this._children.values()].map(child => child.flush()))
  }

  async destroy () {
    await this.ready()
    return Promise.all([...this._children.values()].map(child => child.destroy()))
  }
}

class Child {
  /**
   * @param {HyperswarmCluster} cluster
   * @param {number} id
   * @param {Options} opts
   */
  constructor (cluster, id, opts) {
    this.swarm = null

    /** @type {import('child_process').ChildProcess} */
    this._cp = fork(CHILD_PATH, [JSON.stringify(opts)])

    let openedDone = noop
    this.opened = new Promise((resolve) => {
      openedDone = resolve
    })

    this._cp.once('close', (code, signal) => {
      log('Closed hyperswarm-cluster child process:', id, 'code:', code, 'signal:', signal)
      this.opened = Promise.resolve(false)
    })

    this._cp.on('message', (/** @type {string} */ message) => {
      if (typeof message !== 'number') return

      this.socket = net.connect(message)
      this.stream = new Stream(true, this.socket)
      this.stream.on('error', noop)

      this.dht = new DHT(this.stream)
      this.swarm = new Hyperswarm(this.dht)

      // @ts-ignore
      this.swarm.on('connection', (conn, peerInfo) => {
        console.log('CONNECTION', peerInfo)
        cluster.emit('connection', conn, peerInfo)
      })

      openedDone()
    })
  }

  ready () {
    return this.opened
  }

  flush() {
    return this.swarm?.flush()
  }

  async destroy () {
    await this.swarm.destroy()
    this._cp.kill()
  }
}

/** @param {any[]} _ */
function noop (..._) {}

/**
 * @typedef {{
 *  bootstrap?: {host: string, port: number}[]
 * }} Options
 */
