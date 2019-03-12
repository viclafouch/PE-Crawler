const Sequelize = require('sequelize')

export const createDatabase = ({ storage }) => {
  const database = new Sequelize('database', 'viclafouch', '123', {
    host: 'localhost',
    dialect: 'sqlite',
    operatorsAliases: false,
    storage
  })

  const Card = database.define(
    'cards',
    {
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      url: {
        type: Sequelize.STRING,
        allowNull: false
      },
      lang: {
        type: Sequelize.STRING,
        allowNull: false
      },
      productId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false
      }
    },
    {
      timestamps: true
    }
  )

  return { database, Card }
}
