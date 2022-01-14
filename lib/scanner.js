const EventEmitter = require('events')
const SET_COMMANDS = ['SET', 'SETEX', 'SETNX', 'SETRANGE', 'HSET', 'HMSET', 'HSETNX', 'LSET', 'MSET', 'MSETNX', 'PSETEX', 'SETBIT']
const IGNORED_KEYS = ['ElastiCacheMasterReplicationTimestamp']
const DRAIN_TIMER = 1000
const HOTSYNC_TIMER = 10000
const PROGRESS_TIMER = 5000

class Scanner extends EventEmitter {
  constructor (client, logger, options) {
    super()
    this.client = client
    this.logger = logger
    this.keyProgress = 0
    this.hotSyncEnabled = options.hotSync
    this.commandsQueue = []
  }

  start () {
    this.logger.info('Initiating scan...')
    this.logger.time('Scan run time')
    this.getKeyCount((err, value) => {
      if (err) {
        throw err
      }
      this.initialKeyCount = value
      this.logger.info(`Starting migration of ${value} keys at current point in time...`)
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
    const progress = (((this.keyProgress / this.initialKeyCount) * 100)).toFixed(2)
    this.logger.inline(`${progress}% scanned of original key count`)

    if (this.progressTrackerDeactivated) {
      this.logger.info('Deactivating progress tracking...')
      return
    }

    this.progressTracker = setTimeout(this.trackProgress.bind(this), PROGRESS_TIMER)
  }

  deactivateProgressTracking () {
    this.progressTrackerDeactivated = true
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

      if (value === null) {
        this.logger.debug('Encountered empty record, queuing it for retry.', key)
        this.addToQueue(key)
        return
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
        this.logger.timeEnd('Scan run time')
        this.deactivateProgressTracking()
        if (this.hotSyncEnabled) {
          this.logger.debug(`Waiting ${DRAIN_TIMER}ms to allow cursor to drain`)
          setTimeout(() => {
            this.logger.info('Switching to hot sync mode...')
            this.processQueuedCommands()
          }, DRAIN_TIMER)
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

  processQueuedCommands () {
    while (this.commandsQueue.length > 0) {
      this.getValueWithTtl(this.commandsQueue.shift())
    }
    setTimeout(this.processQueuedCommands.bind(this), HOTSYNC_TIMER)
  }

  addToQueue (key) {
    if (this.commandsQueue.includes(key)) {
      this.logger.debug('Already queued, skipping:', key)
      return
    }
    this.commandsQueue.push(key)
  }

  hotSync (commandArgs) {
    const [command, key] = commandArgs
    const commandName = command.toUpperCase()

    if (IGNORED_KEYS.includes(key)) {
      this.logger.debug('Skipping key in ignore list:', key)
      return
    }

    if (SET_COMMANDS.includes(commandName)) {
      this.logger.debug(`Received ${commandName} command on ${key} key.`)
      this.addToQueue(key)
    }
  }
}

module.exports = Scanner
