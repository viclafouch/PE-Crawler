export default (sequelize, type) =>
  sequelize.define(
    'Product',
    {
      id: {
        type: type.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      forumId: {
        type: type.INTEGER,
        allowNull: false
      },
      name: {
        type: type.STRING,
        allowNull: false
      },
      baseUrl: {
        type: type.STRING,
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
