'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('Threads', 'title', {
        type: Sequelize.DataTypes.STRING(500),
        allowNull: false
      })
    ])
  },

  down: (queryInterface) => {
    return Promise.all([queryInterface.changeColumn('Threads', 'title')])
  }
}
