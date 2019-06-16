const models = require('../../build/models').default
const { isValidProductUrl, startCrawlingCards, getUuid } = require('../../build/crawler')

exports.command = 'crawl [url] [product]'
exports.desc = 'Crawl a single link'
exports.builder = {
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
  const attributes = ['uuid', 'ProductId', 'lang', 'title']

  try {
    const oldCards = await models.Card.findAll({
      where: {
        uuid,
        ProductId: product.id,
        manually: true
      },
      attributes,
      raw: true
    })

    await startCrawlingCards(models, {
      singleCrawl: {
        url: argv.url,
        product
      }
    })

    const newCards = await models.Card.findAll({
      raw: true,
      where: {
        uuid: getUuid(argv.url),
        ProductId: product.id,
        manually: true
      },
      attributes
    })

    console.log('BEFORE:')
    console.table(oldCards)
    console.log('AFTER:')
    console.table(newCards)
  } catch (error) {
    console.error(error)
  }
}
