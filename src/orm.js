import Sequelize from 'sequelize'
import path from 'path'
import CardModel from './models/Card'
import ProductModel from './models/Product'

const orm = new Sequelize('database', 'viclafouch', '123', {
  host: 'localhost',
  dialect: 'sqlite',
  operatorsAliases: false,
  storage: path.join(__dirname, '..', 'database_test.sqlite')
})

const Card = CardModel(orm, Sequelize)
const Product = ProductModel(orm, Sequelize)
Card.belongsTo(Product)

export { Product, Card, orm }
