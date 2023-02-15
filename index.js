import { cpus } from 'node:os'
import { fork } from 'node:child_process'
import debug from 'debug'
import {EventEmitter} from 'events'

import { encode, decode } from './lib/messages.js'

const CHILD_PATH = './lib/child.js'

const MAX_THREADS_COUNT = cpus().length

const log = debug('hyperswarm-cluster-log')

class Child {
  /**
   * @param {HyperswarmCluster} cluster
   * @param {number} i
   */
  constructor (cluster, i) {
    this._cluster = cluster

    /** @type {import('child_process').ChildProcess} */
    this._cp = fork(CHILD_PATH, ['foo bar']);

    this._cp.once('error', () => {
      log("Errored", i)
    })

    this._cp.once('close', (code, signal) => {
      log("Closed hyperswarm-cluster child process:", i, "code:", code, "signal:", signal)
    })

    this._cp.on('message', (/** @type {string} */ message) => {
      log("Message from child", message)
      const call = decode(message)

      if (!call) return

      switch(call.method) {
        case "JOIN_FLUSHED":
          const [topicHex] = call.args
          this._cluster.emit("flushed", i, topicHex)
        default:
          return
      }
    })
  }

  /**
   * @param {string} topicHex
   * @param {object} [opts]
   */
  join (topicHex, opts) {
    const message = encode("join", [topicHex, opts ])
    this._cp.send(message)
  }

  destroy () {
    return this._cp.kill()
  }
}

export default class HyperswarmCluster extends EventEmitter {
  constructor (opts) {
    super()

    this._lastChildUsed = -1;

    /** @type {Child[]} */
    this._childs = []

    this.opened = this._open()
  }

  async ready (){
    return this.opened
  }

  _open () {
    for (let i = 0; i < MAX_THREADS_COUNT; i++) {
      const child = new Child(this, i)
      this._childs.push(child)
    }
  }

  /**
   * @param {Buffer} topic
   * @param {object} [opts]
   */
  join(topic, opts={}) {
    const topicHex = topic.toString('hex')

    this.ready().then(() => {
      const child = this._nextChild()
      child.join(topicHex, opts)
    })

    return {
      flushed: () => new Promise(async (resolve) => {
        this.on(
          'flushed', 
          /**
           * @param {number} i
           * @param {string} topic
           */
          (i, topic) => {
            log('flushed man', i, topic)
            if (topic === topicHex) {
              resolve(true)
            }
          }
        )
      })
    }
  }

  _nextChild () {
    this._lastChildUsed += 1
    if (this._lastChildUsed >= this._childs.length) {
      this._lastChildUsed = 0
    }
    return this._childs[this._lastChildUsed]
  }

  async destroy () {
    await this.ready()
    this._childs.forEach(child => child.destroy())
  }
}
