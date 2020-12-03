'use strict'
const {
  Model
} = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Thread extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate (models) {
      models.Thread.belongsTo(models.Product)
      models.Thread.belongsTo(models.Language)
    }
  };
  Thread.init({
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    uuid: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(1000),
      allowNull: true
    },
    hasRecommendedAnswer: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    hasReply: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isNonIssue: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    sequelize,
    modelName: 'Thread'
  })
  return Thread
}
