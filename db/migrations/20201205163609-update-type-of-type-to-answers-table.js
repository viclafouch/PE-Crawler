'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('Answers', 'type', {
        type: Sequelize.STRING,
        validate: {
          isIn: [['troubleshooter', 'answer']]
        }
      })
    ])
  },

  down: (queryInterface) => {
    return Promise.all([queryInterface.changeColumn('Answers', 'type')])
  }
}
