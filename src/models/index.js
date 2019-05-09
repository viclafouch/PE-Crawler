import fs from 'fs'
import path from 'path'
import Sequelize from 'sequelize'
import config from '../../config/sequelize'

const basename = path.basename(__filename)
const env = process.env.NODE_ENV || 'development'
const configEnv = config[env]
const db = {}

const sequelize = new Sequelize(configEnv.database, configEnv.username, configEnv.password, configEnv)

const modelsFile = fs.readdirSync(__dirname).filter(file => file !== basename && file.slice(-3) === '.js')
modelsFile.forEach(mFile => {
  const model = sequelize.import(path.join(__dirname, mFile))
  db[model.name] = model
})

Object.keys(db).forEach(modelName => {
  db[modelName].associate && db[modelName].associate(db)
})

db.sequelize = sequelize
db.Sequelize = Sequelize

export default db
