const { languages } = require('../../build/config')
const models = require('../../build/models').default

exports.command = 'get [lang] [uuid] [product]'
exports.desc = 'Get a single or multiples cards'
exports.builder = {
  langs: {
    describe: 'Languages',
    demand: false,
    alias: 'l',
    choices: languages,
    type: 'array',
    default: []
  },
  products: {
    describe: 'ID of the products',
    demand: false,
    alias: 'p',
    type: 'array',
    default: []
  },
  uuids: {
    describe: 'uudis',
    demand: false,
    alias: 'u',
    type: 'array',
    default: []
  }
}
exports.handler = async function(argv) {
  const where = {}
  if (argv.products.length > 0) {
    where.ProductId = {
      [models.sequelize.Op.in]: argv.products
    }
  }
  if (argv.langs.length > 0) {
    where.lang = {
      [models.sequelize.Op.in]: argv.langs
    }
  }
  if (argv.uuids.length > 0) {
    where.uuid = {
      [models.sequelize.Op.in]: argv.uuids
    }
  }
  try {
    let { rows: cards, count } = await models.Card.findAndCountAll({
      attributes: ['title', 'url', 'uuid', 'lang'],
      limit: 10,
      where,
      order: [['id', 'ASC']],
      include: [
        {
          model: models.Product,
          required: true,
          as: 'Product',
          attributes: ['name']
        }
      ],
      raw: true
    })
    cards = cards.map(c => {
      c.product = c['Product.name']
      delete c['Product.name']
      return c
    })
    console.log(`${count} card(s) found.`)
    if (count) console.table(cards)
  } catch (error) {
    console.error(error)
  }
}
