const models = require('../../build/models').default

exports.command = 'remove [id]'
exports.desc = 'Remove a single product.'
exports.builder = {
  id: {
    describe: "Product's ID",
    demand: true,
    type: 'number'
  }
}
exports.handler = async function(argv) {
  const where = {}
  where.id = argv.id
  try {
    await models.Product.destroy({ where })
    console.log(`Product removed.`)
  } catch (error) {
    console.error(error)
  }
}
