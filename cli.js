#!/usr/bin/env node

const { program } = require('commander')
const chalk = require('chalk')
const redsink = require('./lib/redsink.js')
const pkg = require('./package.json')

program.name(pkg.name)
  .version(pkg.version)
  .arguments('[source_host] [dest_host]')
  .option('-d, --debug', 'Enable debug mode')
  .option('-o, --output [filename]', 'Output log messages to file (default: redsink.log)')
  .option('--hot-sync', 'Enable hot syncing')
  .option('--from <source_host>', 'Source host')
  .option('--from-token <token>', 'Source host AUTH token')
  .option('--from-user <user>', 'Source host user name')
  .option('--from-password <password>', 'Source host user password')
  .option('--to <dest_host>', 'Dest host')
  .option('--to-token <token>', 'Dest host AUTH token')
  .option('--to-user <user>', 'Dest host user name')
  .option('--to-password <password>', 'Dest host user password')
  .parse(process.argv)

const [sourceHost, destHost] = program.args
const options = program.opts()
const config = {
  source: sourceHost || options.from,
  source_auth_token: options.fromToken,
  source_auth_user: options.fromUser,
  source_auth_password: options.fromPassword,
  dest: destHost || options.to,
  dest_auth_token: options.toToken,
  dest_auth_user: options.toUser,
  dest_auth_password: options.toPassword,
  debug: options.debug,
  hotSync: options.hotSync,
  output: options.output
}

if (config.debug) {
  console.debug(chalk.green('main:'), JSON.stringify(config))
}

if (config.output === true) {
  config.output = 'redsink.log'
}

redsink(config)
