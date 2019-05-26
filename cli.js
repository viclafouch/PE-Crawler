#!/usr/bin/env node

const models = require('./build/models').default
const { languages } = require('./build/config')
const { startCrawlingCards, getUuid, isValidProductUrl } = require('./build/crawler')

const argv = require('yargs')
  .command('products', 'View every products')
  .command('cards', 'List cards', {
    lang: {
      describe: 'Language to filter',
      demand: false,
      alias: 'l',
      choices: languages,
      type: 'string'
    }
  })
  .command('crawl-card', 'Crawl a single card', {
    url: {
      describe: 'URL of the card',
      demand: true,
      alias: 'u'
    },
    product: {
      describe: 'product ID of the card',
      demand: true,
      alias: 'p'
    }
  })
  .command('remove-card', 'Remove a card', {
    uuid: {
      describe: 'uuid of the card',
      demand: true,
      alias: 'u'
    },
    product: {
      describe: 'product ID of the card',
      demand: true,
      alias: 'p'
    }
  })
  .help('h').argv

async function authentificate() {
  await models.sequelize.sync()
}

if (argv._[0] === 'products') {
  authentificate().then(async () => {
    const products = await models.Product.findAll({ raw: true })
    console.table(products)
  })
} else if (argv._[0] === 'all') {
  authentificate().then(async () => {
    const result = languages
    console.table(result)
  })
} else if (argv._[0] === 'cards') {
  authentificate().then(async () => {
    const products = await models.Product.findAll({ raw: true })
    const result = []
    for (const product of products) {
      const count = await models.Card.count({
        where: {
          lang: argv.lang,
          ProductId: product.id
        }
      })
      result.push({
        Product: product.name,
        Count: count
      })
    }
    const total = result.reduce((accumulateur, valeurCourante) => accumulateur + valeurCourante.Count, 0)
    result['Total'] = {
      Count: total
    }
    console.log(`${total} cards have been found for '${argv.lang}' language and ${products.length} products.`)
    console.table(result)
  })
} else if (argv._[0] === 'crawl-card') {
  authentificate().then(async () => {
    const product = await models.Product.findOne({
      where: {
        id: argv.product
      }
    })
    if (!product) return console.log('Product does not exist.')
    if (!isValidProductUrl(argv.url, product.baseUrl)) return console.log('Please provide a valid url.')

    const uuid = getUuid(argv.url)
    const attributes = ['uuid', 'ProductId', 'lang', 'title']

    const oldCards = await models.Card.findAll({
      where: {
        uuid,
        ProductId: product.id
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
        ProductId: product.id
      },
      attributes
    })
    console.log('BEFORE:')
    console.table(oldCards)
    console.log('AFTER:')
    console.table(newCards)
  })
} else if (argv._[0] === 'remove-card') {
  authentificate().then(async () => {
    const product = await models.Product.findOne({
      where: {
        id: argv.product
      }
    })
    if (!product) return console.log('Product does not exist.')
    if (isNaN(argv.u)) return console.log('Please provide a valid uuid')

    const attributes = ['uuid', 'ProductId', 'lang', 'title']

    const oldCards = await models.Card.findAll({
      raw: true,
      where: {
        uuid: argv.u,
        ProductId: product.id
      },
      attributes
    })
    await models.Card.destroy({
      where: {
        uuid: argv.u,
        ProductId: product.id
      }
    })
    const newCards = await models.Card.findAll({
      raw: true,
      where: {
        uuid: argv.u,
        ProductId: product.id
      },
      attributes
    })
    console.log('BEFORE:')
    console.table(oldCards)
    console.log('AFTER:')
    console.table(newCards)
  })
}
