import app from '../build/server'
import request from 'supertest'
import { products, limit } from '../build/constants'
const assert = require('assert').strict

const newFakeCard = product => ({
  uuid: 7367023,
  title: 'Tests et déploiements des fonctionnalités ' + product.name,
  lang: 'fr',
  url: product.baseUrl + '/' + 7367023
})

describe('server', function() {
  let server = null
  const cardByProduct = 21

  before(async () => {
    await require('../build/models').default.sequelize.sync({ force: true })
    const { Product, Card } = require('../build/models').default
    for (let product of products) {
      product = await Product.create({
        name: product.name,
        baseUrl: product.url
      })
      for (const i of new Array(cardByProduct)) {
        await Card.create({
          ...newFakeCard(product),
          ProductId: product.id
        })
      }
    }
    server = await app.listen()
  })

  beforeEach(function() {
    this.Card = require('../build/models').default.Card
    this.Product = require('../build/models').default.Product
  })

  after(async () => {
    await server.close()
  })

  it('route = /', done => {
    request(server)
      .get('/')
      .expect(404, done)
  })

  describe('products route', function() {
    it('route = /products', () => {
      return request(server)
        .get('/products')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          assert.equal(body.count, products.length)
          assert.ok(body.result instanceof Array)
          assert.equal(body.result.length, products.length)
        })
    })
  })

  describe('card route', function() {
    it('route = /card', () => {
      return request(server)
        .post('/cards')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          const totalCards = products.length * cardByProduct
          assert.equal(body.count, totalCards)
          assert.ok(body.result instanceof Array)
          if (body.count > limit) assert.equal(body.result.length, limit)
        })
    })

    it('route = /card - { productsId: [1], page: 1 }', () => {
      return request(server)
        .post('/cards')
        .send({ productsId: [1], page: 1 })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          assert.equal(body.count, cardByProduct)
          if (body.count > limit) assert.equal(body.result.length, limit)
        })
    })

    it('route = /card - { productsId: "1", page: 3 }', () => {
      return request(server)
        .post('/cards')
        .send({ productsId: '1', page: 3 })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          assert.equal(body.result.length, 1)
        })
    })

    it('pagination not [0-9]', async () => {
      const pages = ['a', '', 'é7', '° ', '%20']
      for (const page of pages) {
        await request(server)
          .post(`/cards`)
          .send({ page })
          .set('Accept', 'application/json')
          .expect(200)
      }
    })

    it('route = /card - Good searches', async function() {
      const title = 'Good Card Title'
      const product = await this.Product.findOne()
      const card = await this.Card.create({
        uuid: 1,
        title,
        lang: 'fr',
        url: product.baseUrl + '/' + 7367023,
        ProductId: product.id
      })
      const searches = [title, title.substring(0, title.length - 3), title.substring(3), title.toUpperCase(), title.toLowerCase()]

      for (const search of searches) {
        await request(server)
          .post(`/cards`)
          .send({ search })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(200)
          .then(({ body }) => {
            assert.equal(body.count, [card].length)
          })
      }

      await this.Card.destroy({
        where: {
          id: card.id
        }
      })
    })

    it('route = /card - { search: "dksffdslflsdf" }', () => {
      return request(server)
        .post('/cards')
        .send({ search: 'dksffdslflsdf' })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          assert.equal(body.count, 0)
        })
    })
  })
})
