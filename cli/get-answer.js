const { getDatabase, getYArgs } = require('./helpers')

const yargs = getYArgs()

const { argv } = yargs
  .option('uuid', {
    description: 'The UuiD of the answer',
    demandOption: true,
    type: 'number'
  })
  .option('product_id', {
    description: 'The product id of the answer',
    demandOption: false,
    type: 'number'
  })
  .option('lang', {
    description: 'The lang of the answer',
    demandOption: false,
    type: 'string'
  })

async function getAnswer () {
  const database = await getDatabase()

  const product = await database.Product.findByPk(argv.product_id)

  if (product === null) {
    throw new Error('Product not found')
  }

  const language = await database.Language.findOne({
    where: {
      code: argv.lang
    }
  })

  if (language === null) {
    throw new Error('Language not found')
  }

  const answer = await database.Answer.findOne({
    where: {
      ProductId: product.id,
      uuid: argv.uuid,
      LanguageId: language.id
    }
  })

  if (answer === null) {
    throw new Error('Answer not found')
  }

  console.info({ answer: answer.get() })

  database.disconnectDatabase()
}

getAnswer()
