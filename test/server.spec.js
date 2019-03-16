import app from '../build/server'
import request from 'supertest'
import { createFakeDatabase, pathFakeDatabase } from './utils'
import { unlinkSync } from 'fs'

const database_test = createFakeDatabase()

describe('Test server', () => {
  let server = null

  before(async () => {
    await database_test.db.authenticate()
    await database_test.db.sync({ force: true })
    server = await app.listen()
  })

  after(async () => {
    await server.close()
    unlinkSync(pathFakeDatabase)
    console.log('close db and file removed')
  })

  it('root', done => {
    request(server)
      .get('/')
      .expect(404, done)
  })

  it('get products', async () => {
    const t = await database_test.Product.findAll()

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
