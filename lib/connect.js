const redis = require('redis')
const logger = require('./logger.js')
const extractConfig = require('./extract-config.js')

function connect (config) {
  const source = {
    client: redis.createClient({
      ...extractConfig(config.source),
      auth_pass: config.source_auth_token,
      user: config.source_user,
      password: config.source_password,
      return_buffers: true
    }),
    logger: logger('source', { debug: config.debug })
  }
  const dest = {
    client: redis.createClient({
      ...extractConfig(config.dest),
      auth_pass: config.dest_auth_token,
      user: config.dest_user,
      password: config.dest_password
    }),
    logger: logger('dest', { debug: config.debug })
  }
  const connections = [source, dest]

  let monitor

  if (config.hotSync) {
    monitor = {
      client: source.client.duplicate(),
      logger: logger('monitor', { debug: config.debug })
    }
    connections.push(monitor)
  }

  connections.forEach(({ client, logger }) => {
    client.on('error', (err) => {
      logger.error('Redis Client Error', err)
    })
    logger.info('Connected!')
  })

  return { source, monitor, dest }
}

module.exports = connect
