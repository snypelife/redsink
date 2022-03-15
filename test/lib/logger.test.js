const assert = require('assert')
const sinon = require('sinon')
const { readFile, rm, sleep } = require('../helpers.js')
const logger = require('../../lib/logger.js')

describe('logger', function () {
  beforeEach(function () {
    this.sandbox = sinon.createSandbox()
    this.sandbox.stub(console)
  })

  afterEach(function () {
    this.sandbox.restore()
  })

  it('should log with prefixed namespaces', function () {
    logger('info').info('this is an info log')
    sinon.assert.calledWith(console.info, '\x1B[34minfo:\x1B[39m this is an info log')
  })

  it('should default log to white', function () {
    logger('log').log('this is a log log')
    sinon.assert.calledWith(console.log, '\x1B[37mlog:\x1B[39m this is a log log')
  })

  describe('debug', function () {
    it('should do nothing in default mode', function () {
      logger('debug').debug('this is a debug log')
      sinon.assert.neverCalledWith(console.debug, '\x1B[34mdebug:\x1B[39m this is a debug log')
    })

    it('should log in debug mode', function () {
      logger('debug', { debug: true }).debug('this is a debug log')
      sinon.assert.calledWith(console.debug, '\x1B[90mdebug:\x1B[39m this is a debug log')
    })
  })

  describe('logfile', function () {
    it('should create a redsink.log file by default', async function () {
      after(async function () {
        // Remove log file
        await rm('redsink.log')
      })

      logger.openLogfile()
      logger('logfile').info('logger test!')
      logger.closeLogfile()
      await sleep(25)

      const data = await readFile('redsink.log')
      assert.ok(data, 'File does not exist')
    })

    it('should create a custom log file', async function () {
      after(async function () {
        // Remove log file
        await rm('custom.log')
      })

      logger.openLogfile('custom.log')
      logger('logfile').info('logger test!')
      logger.closeLogfile()
      await sleep(25)

      const data = await readFile('custom.log')
      assert.ok(data, 'File does not exist')
    })
  })
})
