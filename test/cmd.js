const { spawn } = require('child_process')
const concat = require('concat-stream')

const processes = []

function createProcess (processPath, args = [], env = null) {
  args = [processPath].concat(args)

  return spawn('/usr/local/bin/node', args, {
    env: Object.assign({ NODE_ENV: 'test' }, env)
  })
}

function execute (processPath, args = [], opts = {}) {
  const { env = null, name = null } = opts
  const childProcess = createProcess(processPath, args, env)
  childProcess.stdin.setEncoding('utf-8')
  const promise = new Promise((resolve, reject) => {
    childProcess.stderr.once('data', err => {
      reject(err.toString())
    })
    childProcess.on('error', reject)
    childProcess.stdout.pipe(
      concat(result => resolve(result.toString()))
    )
  })

  processes.push({ name: name || Date.now(), proc: childProcess })

  return promise
}

function kill () {
  processes.forEach(({ proc }) => {
    proc.kill()
  })
}

function getProcess (name) {
  return processes.find((proc) => proc.name === name)
}

module.exports = { execute, kill, getProcess }
