import database from '../db/models'
import { createFakeAnswers, createLanguage, createProduct, isValidDate } from './utils'
import server, { port } from '../src/server'
import request from 'supertest'
import { ANSWERS_PER_PAGE } from '../src/shared/constants'
const assert = require('assert').strict

describe('testing express server', function () {
  let listener

  beforeEach(async function () {
    listener = server.listen(port)
    await database.connectToDatabase()
    await database.sequelize.sync({ force: true })
  })

  afterEach(function () {
    listener.close()
  })

  it('route: /', function () {
    return request(server)
      .get('/')
      .expect(404)
  })

  it('route: /languages', function () {
    return request(server)
      .get('/languages')
      .expect('Content-Type', /json/)
      .expect(200)
      .then(({ body }) => {
        assert.ok(typeof body === 'object')
        assert.ok(Object.keys(body).length === 1)
        assert.ok('languages' in body)
        assert.ok(Array.isArray(body.languages))
      })
  })

  it('route: /products', function () {
    return request(server)
      .get('/products')
      .expect('Content-Type', /json/)
      .expect(200)
      .then(({ body }) => {
        assert.ok(typeof body === 'object')
        assert.ok(Object.keys(body).length === 1)
        assert.ok('products' in body)
        assert.ok(Array.isArray(body.products))
      })
  })

  describe('testing params of /answers', function () {
    it('route: /answers', function () {
      return request(server)
        .get('/answers')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          assert.ok(typeof body === 'object')
          const keys = ['nb_answers', 'locales', 'product_names']
          assert.ok(Object.keys(body).every(key => keys.includes(key)))
          assert.ok(Number.isInteger(body.nb_answers))
          assert.ok(Array.isArray(body.locales))
          assert.ok(Array.isArray(body.product_names))
        })
    })

    it('route: /answers with unknown product with unknown lang', function () {
      return request(server)
        .get('/answers/unknown')
        .expect('Content-Type', /json/)
        .expect(400)
    })

    it('route: /answers with valid product with unknown lang', async function () {
      const product = await createProduct()
      return request(server)
        .get(`/answers/${product.code}?hl=fr`)
        .expect('Content-Type', /json/)
        .expect(400)
    })

    it('route: /answers with unknown product with valid lang', async function () {
      const language = await createLanguage()
      return request(server)
        .get(`/threads/unknown?hl=${language.code}`)
        .expect(404)
    })

    it('route: /answers with valid product with valid lang', async function () {
      const product = await createProduct()
      const language = await createLanguage()
      return request(server)
        .get(`/answers/${product.code}?hl=${language.code}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          assert.ok(typeof body === 'object')
          const keys = ['nb_pages', 'locale', 'page', 'product_name', 'answers']
          assert.ok(Object.keys(body).every(key => keys.includes(key)))
          assert.ok(body.locale === language.code)
          assert.ok(body.product_name === product.name)
          assert.ok(Array.isArray(body.answers))
        })
    })

    it('route: /answers paginations', async function () {
      const numberOfAnswers = ANSWERS_PER_PAGE + 3
      const product = await createProduct()
      const language = await createLanguage()
      await createFakeAnswers({
        number: numberOfAnswers,
        languageId: language.id,
        productId: product.id
      })
      await request(server)
        .get(`/answers/${product.code}?hl=${language.code}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          assert.equal(body.page, 1)
          assert.equal(body.nb_pages, 2)
        })
      await request(server)
        .get(`/answers/${product.code}?hl=${language.code}&page=0`)
        .expect('Content-Type', /json/)
        .expect(400)
      await request(server)
        .get(`/answers/${product.code}?hl=${language.code}&page=1`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          assert.equal(body.answers.length, ANSWERS_PER_PAGE)
        })
      await request(server)
        .get(`/answers/${product.code}?hl=${language.code}&page=2`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          assert.equal(body.answers.length, 3)
        })
      return request(server)
        .get(`/answers/${product.code}?hl=${language.code}&page=3`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          assert.equal(body.answers.length, 0)
        })
    })

    it('route: /answers search', async function () {
      const product = await createProduct()
      const language = await createLanguage()
      const [fakeAnswer] = await createFakeAnswers({
        number: 20,
        languageId: language.id,
        productId: product.id
      })
      const searchValue = fakeAnswer.title
      return request(server)
        .get(`/answers/${product.code}?hl=${language.code}&search=${searchValue}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          assert.equal(body.answers.length, 1)
          assert.equal(body.nb_pages, 1)
          assert.equal(body.answers[0].id, fakeAnswer.id)
        })
    })
  })

  describe('testing params of /threads', function () {
    it('route: /threads', function () {
      return request(server)
        .get('/threads')
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          assert.ok(typeof body === 'object')
          const keys = ['locales', 'nb_threads', 'product_names']
          assert.ok(Object.keys(body).every(key => keys.includes(key)))
          assert.ok(Number.isInteger(body.nb_threads))
          assert.ok(Array.isArray(body.locales))
          assert.ok(Array.isArray(body.product_names))
        })
    })

    it('route: /threads with unknown product with unknown lang', function () {
      return request(server)
        .get('/threads/unknown')
        .expect('Content-Type', /json/)
        .expect(400)
    })

    it('route: /threads with valid product with unknown lang', async function () {
      const product = await createProduct()
      return request(server)
        .get(`/threads/${product.code}?hl=fr`)
        .expect('Content-Type', /json/)
        .expect(400)
    })

    it('route: /threads with unknown product with valid lang', async function () {
      const language = await createLanguage()
      return request(server)
        .get(`/threads/unknown?hl=${language.code}`)
        .expect(404)
    })

    it('route: /threads with valid product with valid lang', async function () {
      const product = await createProduct()
      const language = await createLanguage()
      return request(server)
        .get(`/threads/${product.code}?hl=${language.code}`)
        .expect('Content-Type', /json/)
        .expect(200)
        .then(({ body }) => {
          assert.ok(typeof body === 'object')
          const keys = ['locale', 'last_update', 'product_name', 'threads']
          assert.ok(Object.keys(body).every(key => keys.includes(key)))
          assert.ok(body.locale === language.code)
          assert.ok(isValidDate(new Date(body.last_update)))
          assert.ok(body.product_name === product.name)
          assert.ok(Array.isArray(body.threads))
        })
    })
  })
})
