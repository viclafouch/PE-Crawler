export default (sequelize, type) => {
  const Thread = sequelize.define('Thread', {
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
      type: type.STRING(1000),
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

  Thread.associate = models => models.Thread.belongsTo(models.Product)
  return Thread
}
