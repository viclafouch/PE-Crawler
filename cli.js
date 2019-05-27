#!/usr/bin/env node
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
