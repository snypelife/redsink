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

  scanner.on('keyscan', (key, value, ttl) => {
    dest.client.restore(key, ttl, value, 'REPLACE')
  })

  scanner.on('end', () => {
    source.logger.info('All done!')
    if (config.hotSync) {
      source.logger.info('Still hot syncing...')
    } else {
      process.exit(0)
    }
  })

  scanner.scanAllKeys()
}

module.exports = redsink
