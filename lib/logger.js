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
  for (const x of ['debug', 'info', 'warn', 'error', 'log']) {
    const colouredPrefix = chalk[getColour(x)](prefix + ':')
    logger[x] = console[x].bind(console, colouredPrefix)
  }
  if (!options.debug) {
    logger.debug = () => {}
  }
  logger.inline = (text) => {
    const colouredPrefix = chalk.white(prefix + ':')
    readline.cursorTo(process.stdout, 0)
    process.stdout.write(colouredPrefix + ' ' + text)
  }
  return logger
}

module.exports = logger
