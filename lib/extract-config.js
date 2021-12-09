const { urlToHttpOptions, URL } = require('url')

function extractConfig (uri = '') {
  if (!/^rediss?:\/\//.test(uri)) {
    uri = `redis://${uri}`
  }

  const parsedUrl = urlToHttpOptions(new URL(uri))
  const config = {
    protocol: parsedUrl.protocol,
    host: parsedUrl.hostname || 'localhost',
    port: Number(parsedUrl.port) || 6379,
    db: 0
  }

  if (parsedUrl.auth) {
    if (parsedUrl.auth.startsWith(':')) {
      config.auth_pass = parsedUrl.auth.slice(1)
    } else {
      const [user, password] = parsedUrl.auth.split(':')
      config.user = user
      config.password = password
    }
  }

  if (/^\/\d+/.test(parsedUrl.path)) {
    config.db = parsedUrl.path.slice(1)
  }

  if (parsedUrl.protocol === 'rediss:') {
    config.tls = {}
  }

  return config
}

module.exports = extractConfig
