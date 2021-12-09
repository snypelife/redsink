#!/usr/bin/env node

const { program } = require('commander')
const chalk = require('chalk')
const redsink = require('./lib/redsink.js')

program.version(require('./package.json').version)
program.arguments('[source_host] [dest_host]')
program.option('-d, --debug', 'Enable debug mode')
program.option('--hot-sync', 'Enable hot syncing')
program.option('--from <source_host>', 'Source host')
program.option('--from-token <token>', 'Source host AUTH token')
program.option('--from-user <user>', 'Source host user name')
program.option('--from-password <password>', 'Source host user password')
program.option('--to <dest_host>', 'Dest host')
program.option('--to-token <token>', 'Dest host AUTH token')
program.option('--to-user <user>', 'Dest host user name')
program.option('--to-password <password>', 'Dest host user password')
program.parse(process.argv)

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
  hotSync: options.hotSync
}

if (options.debug) {
  console.debug(chalk.green('main:'), JSON.stringify(config))
}

redsink(config)
