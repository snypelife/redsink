const { promisify } = require('util')
const path = require('path')
const { setTimeout: sleep } = require('timers/promises')
const assert = require('assert')
const redis = require('redis')
const { GenericContainer } = require('testcontainers')
const cmd = require('./cmd.js')

function startRedis (name) {
  console.log(`Starting ${name} container...`)
  return new GenericContainer('redis:alpine')
    .withName(name)
    .withExposedPorts(6379)
    .start()
}

function async (object, methodName) {
  return promisify(object[methodName]).bind(object)
}

async function populate (client, namespace, count) {
  return async(client, 'sendCommand')('DEBUG', ['POPULATE', count, namespace])
}

describe('redsink (integration)', function () {
  let sourceRedis
  let destRedis
  const pathToCli = path.join(__dirname, '/../cli.js')
  const DATA_SIZE = 100

  before(async function () {
    this.timeout(30000)
    sourceRedis = await startRedis('source-redis')
    destRedis = await startRedis('dest-redis')

    this.sourcePort = sourceRedis.getMappedPort(6379)
    this.sourceHost = sourceRedis.getHost()
    this.destPort = destRedis.getMappedPort(6379)
    this.destHost = destRedis.getHost()

    this.sourceClient = redis.createClient(
      this.sourcePort,
      this.sourceHost
    )

    this.destClient = redis.createClient(
      this.destPort,
      this.destHost
    )
  })

  beforeEach(async function () {
    // clear out the data from the destination redis
    console.log('Flushing databases...')
    await async(this.sourceClient, 'sendCommand')('FLUSHALL')
    await async(this.destClient, 'sendCommand')('FLUSHALL')

    // reset db index we're working with
    await async(this.sourceClient, 'select')(0)
    await async(this.destClient, 'select')(0)

    console.log('Populating source database...')
    await populate(this.sourceClient, 'redsink', DATA_SIZE)
  })

  afterEach(function () {
    // kill any hanging spawned processes
    cmd.kill()
  })

  after(async function () {
    this.sourceClient.quit()
    this.destClient.quit()
    await sourceRedis.stop()
    await destRedis.stop()
  })

  it('should migrate data from one redis to another using args', async function () {
    this.timeout(10000)

    const sourceDbSize = await async(this.sourceClient, 'DBSIZE')()
    let destDbSize = await async(this.destClient, 'DBSIZE')()

    assert.notEqual(destDbSize, sourceDbSize)
    assert.equal(destDbSize, 0)
    const { sourcePort, sourceHost, destPort, destHost } = this
    await cmd.execute(pathToCli, [
      `${sourceHost}:${sourcePort}`,
      `${destHost}:${destPort}`
    ])
    await sleep(2500)

    destDbSize = await async(this.destClient, 'DBSIZE')()

    assert.equal(destDbSize, sourceDbSize)
    assert.equal(destDbSize, DATA_SIZE)
    assert.equal(sourceDbSize, DATA_SIZE)
  })

  it('should migrate data from one redis to another using flags', async function () {
    this.timeout(10000)

    const sourceDbSize = await async(this.sourceClient, 'DBSIZE')()
    let destDbSize = await async(this.destClient, 'DBSIZE')()

    assert.notEqual(destDbSize, sourceDbSize)
    assert.equal(destDbSize, 0)
    const { sourcePort, sourceHost, destPort, destHost } = this
    await cmd.execute(pathToCli, [
      `--from=${sourceHost}:${sourcePort}`,
      `--to=${destHost}:${destPort}`
    ])
    await sleep(2500)

    destDbSize = await async(this.destClient, 'DBSIZE')()

    assert.equal(destDbSize, sourceDbSize)
    assert.equal(destDbSize, DATA_SIZE)
    assert.equal(sourceDbSize, DATA_SIZE)
  })

  it('should migrate from one database index to another', async function () {
    this.timeout(10000)

    await async(this.destClient, 'select')(1)
    const sourceDbSize = await async(this.sourceClient, 'DBSIZE')()
    let destDbSize = await async(this.destClient, 'DBSIZE')()

    assert.notEqual(destDbSize, sourceDbSize)
    assert.equal(destDbSize, 0)
    const { sourcePort, sourceHost, destPort, destHost } = this
    await cmd.execute(pathToCli, [
      `--from=${sourceHost}:${sourcePort}/0`,
      `--to=${destHost}:${destPort}/1`
    ])
    await sleep(2500)

    destDbSize = await async(this.destClient, 'DBSIZE')()

    assert.equal(destDbSize, sourceDbSize)
    assert.equal(destDbSize, DATA_SIZE)
    assert.equal(sourceDbSize, DATA_SIZE)
  })

  it('should log a ton when debug mode is enabled', async function () {
    this.timeout(10000)

    const { sourcePort, sourceHost, destPort, destHost } = this
    const output = await cmd.execute(pathToCli, [
      '--debug',
      `${sourceHost}:${sourcePort}`,
      `${destHost}:${destPort}`
    ])
    await sleep(2500)

    assert.match(output, /"debug":true/)
    assert.match(output, /Scanning index:/)
    assert.match(output, /Waiting 1000ms to allow cursor to drain/)
  })

  it('should sync data that comes in after the migration starts', async function () {
    this.timeout(25000)

    const { sourcePort, sourceHost, destPort, destHost } = this

    // not awaiting on purpose, as it spins up a long running process that watches
    cmd.execute(pathToCli, [
      '--hot-sync',
      `${sourceHost}:${sourcePort}`,
      `${destHost}:${destPort}`
    ])
    await sleep(2500)

    let sourceDbSize = await async(this.sourceClient, 'DBSIZE')()
    let destDbSize = await async(this.destClient, 'DBSIZE')()

    assert.equal(destDbSize, sourceDbSize)
    assert.equal(sourceDbSize, DATA_SIZE)
    assert.equal(destDbSize, DATA_SIZE)

    console.log('Running SET commands to trigger hot sync...')
    for (let x = 0; x < DATA_SIZE; x++) {
      this.sourceClient.set(`hotsync:${x}`, x)
    }
    await sleep(10000)

    sourceDbSize = await async(this.sourceClient, 'DBSIZE')()
    destDbSize = await async(this.destClient, 'DBSIZE')()

    assert.equal(destDbSize, sourceDbSize)
    assert.equal(sourceDbSize, DATA_SIZE * 2)
    assert.equal(destDbSize, DATA_SIZE * 2)
  })

  it('should work for large datasets', async function () {
    this.timeout(60000)

    const { sourcePort, sourceHost, destPort, destHost } = this

    await populate(this.sourceClient, 'longtest', 100000)

    const sourceDbSize = await async(this.sourceClient, 'DBSIZE')()
    await cmd.execute(pathToCli, [
      `${sourceHost}:${sourcePort}`,
      `${destHost}:${destPort}`
    ])
    const destDbSize = await async(this.destClient, 'DBSIZE')()

    assert.equal(destDbSize, sourceDbSize)
    assert.equal(sourceDbSize, DATA_SIZE + 100000)
    assert.equal(destDbSize, DATA_SIZE + 100000)
  })
})
