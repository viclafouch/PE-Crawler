const Sequelize = require('sequelize')

export const createDatabase = ({ storage }) => {
  const database = new Sequelize('database', 'viclafouch', '123', {
    host: 'localhost',
    dialect: 'sqlite',
    operatorsAliases: false,
    storage,
    logging: false
  })

  const Product = database.define(
    'products',
    {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      baseUrl: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          isUrl: true
        }
      }
    },
    {
      timestamps: false
    }
  )

  const Card = database.define('cards', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    uuid: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false
    },
    url: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        isUrl: true
      }
    },
    lang: {
      type: Sequelize.STRING,
      allowNull: false
    }
  })

  Card.belongsTo(Product)
  return { database, Card, Product }
}
