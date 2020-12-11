const { getYArgs, getDatabase } = require('./helpers')

const yargs = getYArgs()

const { argv } = yargs
  .option('id', {
    description: 'The ID of the product',
    demandOption: true,
    type: 'number'
  })
  .option('name', {
    description: 'The name of the product',
    demandOption: false,
    type: 'string'
  })
  .option('code', {
    description: 'The code of the product',
    demandOption: false,
    type: 'string'
  })
  .option('communityId', {
    description: 'The ID of the forum',
    demandOption: false,
    type: 'number'
  })

async function updateProduct () {
  const database = await getDatabase()

  const product = await database.Product.findByPk(argv.id, { raw: true })

  if (product === null) {
    throw new Error('Product not found')
  }

  for (const key in product) {
    if (Object.prototype.hasOwnProperty.call(argv, key)) {
      product[key] = argv[key]
    }
  }

  await database.Product.update(product, {
    where: {
      id: product.id
    }
  })

  const result = await database.Product.findByPk(argv.id)

  console.table(result.get())
  console.log({ updated: true })

  database.disconnectDatabase()
}

updateProduct()
