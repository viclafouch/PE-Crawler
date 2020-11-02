// Set options as a parameter, environment variable, or rc file.
// eslint-disable-next-line no-global-assign
require = require('esm')(module, {
  await: true
}/*, options */)
module.exports = require('./src/main.js')
