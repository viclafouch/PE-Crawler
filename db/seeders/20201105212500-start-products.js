'use strict'

const products = [
  {
    communityId: 659278,
    name: 'YouTube',
    code: 'youtube'
  },
  {
    communityId: 697265,
    name: 'Chrome',
    code: 'chrome'
  },
  {
    communityId: 678735,
    name: 'Gmail',
    code: 'mail'
  },
  {
    communityId: 1452138,
    name: 'Adsense',
    code: 'adsense'
  },
  {
    communityId: 1749766,
    name: 'Google Search',
    code: 'websearch'
  },
  {
    communityId: 24053,
    name: 'Google Photos',
    code: 'photos'
  },
  {
    communityId: 593221,
    name: 'Google Maps',
    code: 'maps'
  },
  {
    communityId: 202587,
    name: 'Google Calendar',
    code: 'calendar'
  },
  {
    communityId: 553472,
    name: 'Google Account',
    code: 'accounts'
  },
  {
    communityId: 412208,
    name: 'Google Play',
    code: 'googleplay'
  },
  {
    communityId: 1081366,
    name: 'Google My Business',
    code: 'business'
  },
  {
    communityId: 1631170,
    name: 'Google Translate',
    code: 'translate'
  },
  {
    communityId: 202537,
    name: 'Google Fi',
    code: 'fi'
  },
  {
    communityId: 593739,
    name: 'G Suite Admin',
    code: 'a'
  },
  {
    communityId: 654222,
    name: 'Files by Google',
    code: 'files'
  },
  {
    communityId: 570924,
    name: 'Google Drive',
    code: 'drive'
  },
  {
    communityId: 1386689,
    name: 'Docs Editor',
    code: 'docs'
  },
  {
    communityId: 224051,
    name: 'Course Kit',
    code: 'educoursekit'
  },
  {
    communityId: 1663244,
    name: 'Search Console',
    code: 'webmasters'
  },
  {
    communityId: 344043,
    name: 'Pixel Phone',
    code: 'pixelphone'
  },
  {
    communityId: 1631239,
    name: 'Blogger',
    code: 'blogger'
  },
  {
    communityId: 589387,
    name: 'Google Voice',
    code: 'voice'
  },
  {
    communityId: 804218,
    name: 'Google Classroom',
    code: 'educlassroom'
  },
  {
    communityId: 213251,
    name: 'Expeditions',
    code: 'eduexpeditions'
  },
  {
    communityId: 641710,
    name: 'Jamboard',
    code: 'jamboard'
  },
  {
    communityId: 2369244,
    name: 'Android',
    code: 'android'
  }
]

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Products', products.map(product => ({
      name: product.name,
      communityId: product.communityId,
      code: product.code
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
