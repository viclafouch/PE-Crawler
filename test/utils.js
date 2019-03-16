import Sequelize from 'sequelize'
import path from 'path'
import ProductModel from '../build/models/Product'
import CardModel from '../build/models/Card'

export const createFakeDatabase = () => {
  const db = new Sequelize('database_test', 'root', 'root', {
    host: 'localhost',
    dialect: 'sqlite',
    operatorsAliases: false,
    storage: path.join(__dirname, '..', 'database_test.sqlite'),
    sync: { force: true }
  })

  const Card = CardModel(db, Sequelize)
  const Product = ProductModel(db, Sequelize)
  Card.belongsTo(Product)
  return { db, Card, Product }
}
