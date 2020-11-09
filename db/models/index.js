'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')
const basename = path.basename(__filename)
const env = process.env.NODE_ENV || 'development'
const config = require(path.join(__dirname, '/../../config/database.js'))[env]

const db = {}

let sequelize

const advancedConfig = {
  retry: {
    match: [
      /SQLITE_BUSY/
    ],
    name: 'query',
    max: 5
  },
  logging: false,
  transactionType: 'IMMEDIATE'
}

console.log({
  database_config: { ...config, ...advancedConfig },
  env: env
})

if (config.url) {
  sequelize = new Sequelize(config.url, { ...config, ...advancedConfig })
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, { ...config, ...advancedConfig })
}

fs
  .readdirSync(__dirname)
  .filter(file => file !== basename && file.slice(-3) === '.js')
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes)
    db[model.name] = model
  })

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db)
  }
})

db.sequelize = sequelize
db.Sequelize = Sequelize

db.connectToDatabase = () => sequelize.authenticate()

module.exports = db
