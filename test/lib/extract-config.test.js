const assert = require('assert')
const extractConfig = require('../../lib/extract-config.js')

describe('extractConfig', function () {
  it('should default to localhost config if provided nothing', () => {
    const config = extractConfig()

    assert.deepStrictEqual(config, {
      protocol: 'redis:',
      host: 'localhost',
      port: 6379,
      db: 0
    })
  })

  it('should work for localhost', () => {
    const config = extractConfig('redis://localhost:6389/1')

    assert.deepStrictEqual(config, {
      protocol: 'redis:',
      host: 'localhost',
      port: 6389,
      db: '1'
    })
  })

  it('should work for TLS connections', () => {
    const config = extractConfig('rediss://localhost')

    assert.deepStrictEqual(config, {
      protocol: 'rediss:',
      host: 'localhost',
      port: 6379,
      db: 0,
      tls: {}
    })
  })

  it('should extract user creds', () => {
    const config = extractConfig('redis://username:password@localhost')

    assert.deepStrictEqual(config, {
      protocol: 'redis:',
      host: 'localhost',
      user: 'username',
      password: 'password',
      port: 6379,
      db: 0
    })
  })

  it('should extract AUTH_TOKEN', () => {
    const config = extractConfig('rediss://:token@localhost')

    assert.deepStrictEqual(config, {
      protocol: 'rediss:',
      host: 'localhost',
      auth_pass: 'token',
      port: 6379,
      db: 0,
      tls: {}
    })
  })
})
