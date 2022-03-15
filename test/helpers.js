const { promisify } = require('util')
const fs = require('fs/promises')
const { setTimeout: sleep } = require('timers/promises')

exports.async = function async (object, methodName) {
  return promisify(object[methodName]).bind(object)
}

exports.sleep = sleep

exports.rm = async function rm (filepath) {
  await fs.rm(filepath)
}

exports.readFile = async function readFile (file) {
  const data = await fs.readFile(file, 'utf8')
  return data
}
