'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'Answers',
      'type',
      {
        type: Sequelize.BOOLEAN,
        validate: {
          isIn: [['troubleshooter', 'answer']]
        }
      }
    )
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
}
