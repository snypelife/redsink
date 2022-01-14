const Scanner = require('./scanner.js')
const connect = require('./connect.js')
const logger = require('./logger.js')

function redsink (config) {
  logger.main.time('Total run time')
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
    process.exit(0)
  })

  function exitHandler (handle = () => {}) {
    return (value) => {
      handle(value)
      logger.main.timeEnd('Total run time')
      process.exit(0)
    }
  }

  process.on('exit', exitHandler((code) => {
    if (code !== 0) {
      logger.main.error('Exited with non-zero code')
    }
  }))
  process.on('SIGINT', exitHandler(() => {
    logger.main.info('Exiting at user request')
  }))
  process.on('SIGUSR1', exitHandler())
  process.on('SIGUSR2', exitHandler())
  process.on('uncaughtException', exitHandler((err) => {
    logger.main.error({ err }, 'An error occurred!')
  }))

  scanner.start()
}

module.exports = redsink
