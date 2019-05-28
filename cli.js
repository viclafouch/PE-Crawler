#!/usr/bin/env node
process.env.NODE_ENV = 'production'
const models = require('./build/models').default

const sync = async () => {
  await models.sequelize.sync()
}

// eslint-disable-next-line no-unused-expressions
require('yargs')
  .commandDir('cmds')
  .demandCommand()
  .wrap(null)
  .help()
  .middleware([sync]).argv
