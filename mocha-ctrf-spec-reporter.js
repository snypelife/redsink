const mocha = require('mocha')
const Ctrf = require('mocha-ctrf-json-reporter')
const Spec = mocha.reporters.Spec
const Base = mocha.reporters.Base

function CtrfSpecReporter (runner, options) {
  Base.call(this, runner, options)
  this._CtrfReporter = new Ctrf(runner, options)
  this._specReporter = new Spec(runner, options)
  return this
}
CtrfSpecReporter.prototype = Base.prototype

module.exports = CtrfSpecReporter
