const EventEmitter = require('events')
const SET_COMMANDS = ['SET', 'SETEX', 'SETNX', 'SETRANGE', 'HSET', 'HMSET', 'HSETNX', 'LSET', 'MSET', 'MSETNX', 'PSETEX', 'SETBIT']
const DRAIN_TIMER = 1000

class Scanner extends EventEmitter {
  constructor (client, logger) {
    super()
    this.client = client
    this.logger = logger
  }

  getValueWithTtl (key) {
    this.client.dump(key, (err, value) => {
      if (err) {
        this.emit('error', err)
        return
      }
      this.client.pttl(key, (err, ttl) => {
        if (err) {
          this.emit('error', err)
          return
        }
        if (ttl <= 0) {
          ttl = 0
        }
        this.emit('keyscan', key, value, ttl)
        this.resetEndTimer()
      })
    })
  }

  scanAllKeys (index = 0) {
    this.logger.debug(`Scanning index: ${index}`)
    this.client.scan(index, (err, response) => {
      if (err) {
        return this.emit('error', err)
      }
      const [nextIndex, keys] = response

      for (const key of keys) {
        this.getValueWithTtl(key)
      }

      if (nextIndex.toString() === '0') {
        this.setEndTimer()
        return
      }

      this.scanAllKeys(nextIndex)
    })
  }

  setEndTimer () {
    this.endTimer = setTimeout(() => {
      this.logger.debug(`Waiting ${DRAIN_TIMER}ms to allow cursor to drain`)
      this.emit('end')
    }, DRAIN_TIMER)
  }

  resetEndTimer () {
    if (this.endTimer) {
      clearTimeout(this.endTimer)
      this.setEndTimer()
    }
  }

  hotSync (commandArgs) {
    const [command, key] = commandArgs
    const commandName = command.toUpperCase()
    if (SET_COMMANDS.includes(commandName)) {
      this.logger.debug(`Received ${commandName} command on ${key} key`)
      this.getValueWithTtl(key)
    }
  }
}

module.exports = Scanner
