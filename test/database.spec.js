import { products } from '../build/constants'
const assert = require('assert').strict

describe('models', () => {
  describe('models/index', () => {
    it('returns the card model', () => {
      const models = require('../build/models').default
      assert.ok(models.Card)
    })

    it('returns the product model', function() {
      var models = require('../build/models').default
      assert.ok(models.Product)
    })
  })

  describe('insert/remove', () => {
    const models = require('../build/models').default
    beforeEach(async () => {
      await models.sequelize.sync({ force: true })
    })

    it('test add Product', async () => {
      for (const product of products) {
        await models.Product.create({
          name: product.name,
          baseUrl: product.url
        })
      }
      const count = await models.Product.count()
      assert.equal(count, products.length)
    })

    it('test add Card', async () => {
      console.log('insert one product')
      await models.Product.create({
        name: 'Test Product',
        baseUrl: 'https://support.google.com'
      })
      console.log('product added')
      const product = await models.Product.findOne()
      console.log('product found')
      const datas = {
        uuid: 7367023,
        title: 'Tests et déploiements des fonctionnalités YouTube',
        lang: 'fr',
        url: product.baseUrl + '/' + 7367023
      }
      console.log('Create Card with productId 1')
      await models.Card.create({
        ...datas,
        ProductId: product.id
      })
      console.log('Find Card created')
      const card = await models.Card.findOne({
        where: {
          uuid: datas.uuid
        }
      })
      assert.ok(card)
      console.log('Card found')
      assert.equal(card.title, datas.title)
      assert.equal(card.url, datas.url)
      assert.equal(card.ProductId, product.id)
      console.log('Card is valide')
    })
  })
})
