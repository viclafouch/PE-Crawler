import app from '../build/server'
import request from 'supertest'
import { createFakeDatabase } from './utils'

const database_test = createFakeDatabase()

describe('Test server', () => {
  let server = null

  before(async () => {
    await database_test.db.authenticate()
    await database_test.db.sync({ force: true })
    server = await app.listen()
  })

  after(done => {
    server.close(done)
  })

  it('root', done => {
    request(server)
      .get('/')
      .expect(404, done)
  })

  it('get products', async () => {
    const t = await database_test.Product.findAll()
    console.log(t)

    // request(server)
    //   .get('/products')
    //   .set('Accept', 'application/json')
    //   .expect('Content-Type', /json/)
    //   .expect(200)
    //   .then(function(res) {
    //     console.log(res.body)
    //   })
  })
})
