export default (sequelize, type) =>
  sequelize.define(
    'product',
    {
      id: {
        type: type.INTEGER,
        autoIncrement: true,
        primaryKey: true
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
