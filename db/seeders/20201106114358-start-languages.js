'use strict'

const languages = ['fr', 'en', 'es', 'de', 'pt-BR', 'ru', 'uk', 'id', 'tr', 'pl', 'ja']

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Languages', languages.map(language => ({
      code: language
    })))
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
  }
}
