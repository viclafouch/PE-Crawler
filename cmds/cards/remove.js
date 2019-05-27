const models = require('../../build/models').default

exports.command = 'remove [id] [uuid] [product]'
exports.desc = 'Remove a single card by id or uuid and product. '
exports.builder = {
  id: {
    describe: "Card's ID",
    demand: false,
    type: 'number'
  },
  uuid: {
    describe: "Card's UUID",
    demand: false,
    type: 'number'
  },
  product: {
    describe: "Product's ID",
    demand: false,
    type: 'number',
    alias: 'p'
  }
}
exports.handler = async function(argv) {
  const where = {}
  if (argv.id) {
    where.id = argv.id
  } else if (argv.uuid && argv.product) {
    where.uuid = argv.uuid
    where.ProductId = argv.product
  }

  if (where.id || where.uuid) {
    try {
      let { rows: cards, count } = await models.Card.findAndCountAll({
        attributes: ['title', 'url', 'uuid', 'description', 'lang'],
        where,
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
      await models.Card.destroy({ where })
      console.log(`${count} card(s) removed.`)
      if (count) console.table(cards)
    } catch (error) {
      console.error(error)
    }
  }
}
