const sinon = require('sinon')
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
    sinon.assert.calledWith(console.info, '\x1B[34minfo:\x1B[39m', 'this is an info log')
  })

  it('should default log to white', function () {
    logger('log').log('this is a log log')
    sinon.assert.calledWith(console.log, '\x1B[37mlog:\x1B[39m', 'this is a log log')
  })

  describe('debug', function () {
    it('should do nothing in default mode', function () {
      logger('debug').debug('this is a debug log')
      sinon.assert.neverCalledWith(console.debug, '\x1B[34mdebug:\x1B[39m', 'this is a debug log')
    })

    it('should log in debug mode', function () {
      logger('debug', { debug: true }).debug('this is a debug log')
      sinon.assert.calledWith(console.debug, '\x1B[90mdebug:\x1B[39m', 'this is a debug log')
    })
  })
})
