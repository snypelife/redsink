const Scanner = require('./scanner.js')
const connect = require('./connect.js')

function redsink (config) {
  const { source, monitor, dest } = connect(config)
  const scanner = new Scanner(source.client, source.logger)

  if (config.hotSync) {
    monitor.client.on('monitor', (_, args) => {
      monitor.logger.debug(JSON.stringify(args))
      scanner.hotSync(args)
    })

    try {
      monitor.client.monitor()
    } catch (ex) {
      monitor.logger.error(ex)
    }
  }

  const batch = dest.client.batch()
  let batchCounter = 0
  let batchDrainTimer = null
  const BATCH_SIZE = 1000
  const BATCH_OFFSET_MS = 1000

  function drainBatch () {
    batch.exec()
    batchCounter = 0
  }

  scanner.on('keyscan', (key, value, ttl) => {
    clearTimeout(batchDrainTimer)
    batch.restore(key, ttl, value, 'REPLACE')
    batchCounter += 1
    if (batchCounter >= BATCH_SIZE) {
      drainBatch()
    }
    batchDrainTimer = setTimeout(drainBatch, BATCH_OFFSET_MS)
  })

  scanner.on('end', () => {
    source.logger.info('All done!')
    if (config.hotSync) {
      source.logger.info('Still hot syncing...')
    } else {
      process.exit(0)
    }
  })

  scanner.start()
}

module.exports = redsink
