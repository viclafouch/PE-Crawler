const models = require('../../build/models').default

exports.command = 'get'
exports.desc = 'Get all products'
exports.builder = {}
exports.handler = async function(argv) {
  try {
    const { rows: products, count } = await models.Product.findAndCountAll({
      order: [['id', 'ASC']],
      raw: true
    })
    console.log(`${count} products(s) found.`)
    if (count) console.table(products)
  } catch (error) {
    console.error(error)
  }
}
