const { getDatabase } = require('./helpers')

async function getProducts () {
  const database = await getDatabase()

  const products = await database.Product.findAll({
    raw: true
  })

  console.table(products)

  database.disconnectDatabase()
}

getProducts()
