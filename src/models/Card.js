export default (sequelize, type) => {
  const Card = sequelize.define('Card', {
    id: {
      type: type.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    uuid: {
      type: type.INTEGER,
      allowNull: false
    },
    title: {
      type: type.STRING,
      allowNull: false
    },
    description: {
      type: type.STRING,
      allowNull: true
    },
    url: {
      type: type.STRING,
      allowNull: false,
      validate: {
        isUrl: true
      }
    },
    lang: {
      type: type.STRING,
      allowNull: false
    }
  })

  Card.associate = models => models.Card.belongsTo(models.Product)
  return Card
}
