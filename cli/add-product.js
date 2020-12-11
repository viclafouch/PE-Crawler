const { getYArgs, getDatabase, makeSimpleRequest } = require('./helpers')

const yargs = getYArgs()

const { argv } = yargs
  .option('name', {
    description: 'The name of the product',
    demandOption: true,
    type: 'string'
  })
  .option('code', {
    description: 'The code of the product',
    demandOption: true,
    type: 'string'
  })
  .option('communityId', {
    description: 'The ID of the forum',
    demandOption: true,
    type: 'number'
  })

async function addProduct () {
  const database = await getDatabase()

  const productOptions = {
    name: argv.name,
    code: argv.code,
    communityId: argv.communityId
  }

  const { response } = await makeSimpleRequest(
    `https://support.google.com/${productOptions.code}/`
  )

  if (response.statusCode !== 200) {
    throw new Error(`Product code is not valid [StatusCode: ${response.statusCode}]`)
  }

  const [product, created] = await database.Product.findOrCreate({
    where: {
      name: productOptions.name,
      communityId: productOptions.communityId,
      code: productOptions.code
    },
    defaults: productOptions
  })

  console.table(product.get())
  console.log({ created })

  database.disconnectDatabase()
}

addProduct()
