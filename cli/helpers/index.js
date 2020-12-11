const path = require('path')
const yargs = require('yargs')
const fs = require('fs')

const args = yargs
  .help(false)
  .version(false)
  .config(loadRCFile(yargs.argv.optionsPath))
  .option('env', {
    describe: 'The environment to run the command in',
    default: 'development',
    choices: ['production', 'test', 'development'],
    type: 'string'
  })

process.env.NODE_ENV = args.argv.env

function loadRCFile (optionsPath) {
  const rcFile = optionsPath || path.resolve(process.cwd(), '.sequelizerc')
  const rcFileResolved = path.resolve(rcFile)
  return fs.existsSync(rcFileResolved)
    ? JSON.parse(JSON.stringify(require(rcFileResolved)))
    : {}
}

const getDatabase = async () => {
  const database = require(args.argv.modelsPath)
  await database.connectToDatabase()
  await database.sequelize.sync()
  return database
}

const getYArgs = () => {
  return args
}

const makeSimpleRequest = (url) => new Promise((resolve, reject) => {
  const https = require('https')
  https.get(url, (response) => {
    let data = ''
    response.on('data', d => {
      data += d
    })
    response.on('end', () => resolve({ data, response }))
  }).on('error', reject)
})

module.exports = {
  getYArgs,
  getDatabase,
  makeSimpleRequest
}
