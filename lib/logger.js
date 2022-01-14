const readline = require('readline')
const chalk = require('chalk')

function getColour (level) {
  switch (level) {
    case 'error':
      return 'red'
    case 'warn':
      return 'yellow'
    case 'info':
      return 'blue'
    case 'debug':
      return 'grey'
    default:
      return 'white'
  }
}

function logger (prefix, options = {}) {
  const logger = {}
  for (const x of ['debug', 'info', 'warn', 'error', 'log', 'time', 'timeEnd']) {
    const colouredPrefix = chalk[getColour(x)](prefix + ':')
    logger[x] = (...passedArgs) => {
      const args = [...passedArgs]
      args[0] = colouredPrefix + ' ' + args[0]
      if (logger._inlining) {
        console.log('')
        logger._inlining = false
      }
      console[x].apply(null, args)
    }
  }
  if (!options.debug) {
    logger.debug = () => {}
  }
  logger.inline = (text) => {
    logger._inlining = true
    const colouredPrefix = chalk.white(prefix + ':')
    readline.cursorTo(process.stdout, 0)
    process.stdout.write(colouredPrefix + ' ' + text)
  }
  return logger
}

module.exports = logger

module.exports.main = logger('main')
