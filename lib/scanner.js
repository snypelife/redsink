const EventEmitter = require('events')
const SET_COMMANDS = ['SET', 'SETEX', 'SETNX', 'SETRANGE', 'HSET', 'HMSET', 'HSETNX', 'LSET', 'MSET', 'MSETNX', 'PSETEX', 'SETBIT']
const DRAIN_TIMER = 1000
const HOTSYNC_TIMER = 10000

class Scanner extends EventEmitter {
  constructor (client, logger) {
    super()
    this.client = client
    this.logger = logger
    this.keyProgress = 0
    this.hotSyncEnabled = false
    this.hotSyncCommands = []
  }

  start () {
    this.logger.info('Initiating scan...')
    this.getKeyCount((err, value) => {
      if (err) {
        throw err
      }
      this.initialKeyCount = value
      this.logger.info(`Migrating ${value} keys...`)
      this.scanAllKeys(0)
      this.trackProgress()
    })
  }

  getKeyCount (cb) {
    this.client.dbsize((err, value) => {
      if (err) {
        this.emit('error', err)
        return
      }
      cb(null, value)
    })
  }

  trackProgress () {
    return setInterval(() => {
      const progress = (((this.keyProgress / this.initialKeyCount) * 100)).toFixed(2)
      this.logger.inline(`${progress}% scanned`)
    }, 5000)
  }

  // using batch here to:
  // 1. combine dump and pttl calls to slightly improve throughput
  // 2. easily keep key:value:ttl together
  getValueWithTtl (key) {
    const batch = this.client.batch()
    batch.dump(key)
    batch.pttl(key)
    batch.exec((err, [value, ttl]) => {
      if (err) {
        this.emit('error', err)
      }
      if (ttl <= 0) {
        ttl = 0
      }
      this.emit('keyscan', key, value, ttl)
      this.resetEndTimer()
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
      this.keyProgress += keys.length

      if (nextIndex.toString() === '0') {
        if (this.hotSyncEnabled) {
          this.logger.info('Switching to hot sync mode...')
          this.processHotSyncCommands()
        } else {
          this.setEndTimer()
        }
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

  processHotSyncCommands () {
    while (this.hotSyncCommands.length > 0) {
      this.getValueWithTtl(this.hotSyncCommands.shift())
    }
    setTimeout(this.processHotSyncCommands.bind(this), HOTSYNC_TIMER)
  }

  hotSync (commandArgs) {
    this.hotSyncEnabled = true
    const [command, key] = commandArgs
    const commandName = command.toUpperCase()
    if (SET_COMMANDS.includes(commandName)) {
      this.logger.debug(`Received ${commandName} command on ${key} key`)
      this.hotSyncCommands.push(key)
    }
  }
}

module.exports = Scanner
