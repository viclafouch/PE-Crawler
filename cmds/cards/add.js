const { languages } = require('../../build/config')
const models = require('../../build/models').default
const { isValidProductUrl, getUuid } = require('../../build/crawler')

exports.command = 'add [lang] [title] [description] [url] [product]'
exports.desc = 'Add a single card'
exports.builder = {
  lang: {
    describe: 'Language',
    demand: true,
    alias: 'l',
    choices: languages,
    type: 'string'
  },
  title: {
    describe: 'Title',
    demand: true,
    alias: 't',
    type: 'string'
  },
  description: {
    describe: 'Description',
    demand: true,
    alias: 'd',
    type: 'string'
  },
  url: {
    describe: 'URL',
    demand: true,
    alias: 'u',
    type: 'string'
  },
  product: {
    describe: 'ID of the product',
    demand: true,
    alias: 'p',
    type: 'number'
  }
}
exports.handler = async function(argv) {
  const product = await models.Product.findOne({
    where: {
      id: argv.product
    }
  })
  if (!product) return console.log('Product does not exist.')
  if (!isValidProductUrl(argv.url, product.baseUrl)) {
    if (!argv.url.startsWith(product.baseUrl)) console.log(`URL need to begin with ${product.baseUrl}`)
    return console.log('Please provide a valid url.')
  }
  const uuid = getUuid(argv.url)
  try {
    const { card, created } = await models.Card.findOrCreate({
      where: {
        uuid,
        ProductId: product.id,
        lang: argv.lang
      },
      defaults: {
        url: argv.url,
        uuid: uuid,
        lang: argv.lang,
        ProductId: product.id,
        title: argv.title,
        description: argv.description
      }
    }).spread((card, created) => ({ card: card.get({ plain: true }), created }))
    if (!created) return console.log(`Card ${card.uuid} already exists.`)
    console.log(`Card ${card.uuid} created !`)
    console.table(card)
  } catch (error) {
    console.error(error)
  }
}
