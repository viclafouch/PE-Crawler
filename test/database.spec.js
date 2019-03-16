import { createFakeDatabase } from './utils'
import { products } from '../build/constants'

const assert = require('assert').strict

const database = createFakeDatabase()

describe('Test Database', () => {
  before(async () => {
    await database.db.authenticate()
    await database.db.sync({ force: true })
    console.log('authentication with cleaning')
  })

  after(async () => {
    await database.db.close()
    console.log('close db')
  })

  afterEach(async () => {
    await database.db.sync({ force: true })
    console.log('clean database')
  })

  it('test add Product', async () => {
    for (const product of products) {
      await database.Product.create({
        name: product.name,
        baseUrl: product.url
      })
    }
    const count = await database.Product.count()
    assert.equal(count, products.length)
  })

  it('test add Card', async () => {
    console.log('insert one product')
    await database.Product.create({
      name: 'Test Product',
      baseUrl: 'https://support.google.com'
    })
    console.log('product added')
    const product = await database.Product.findOne()
    console.log('product found')
    const datas = {
      uuid: 7367023,
      title: 'Tests et déploiements des fonctionnalités YouTube',
      lang: 'fr',
      url: product.baseUrl + '/' + 7367023
    }
    console.log('Create Card with productId 1')
    await database.Card.create({
      ...datas,
      productId: product.id
    })
    console.log('Find Card created')
    const card = await database.Card.findOne({
      where: {
        uuid: datas.uuid
      }
    })
    assert.ok(card)
    console.log('Card found')
    assert.equal(card.title, datas.title)
    assert.equal(card.url, datas.url)
    assert.equal(card.productId, product.id)
    console.log('Card is valide')
  })
})
