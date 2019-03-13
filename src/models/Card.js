export default (sequelize, type) =>
  sequelize.define('card', {
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
