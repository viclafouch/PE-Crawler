import { before } from 'mocha'
import database from '../db/models'
import { createLanguage, createProduct, makeSimpleRequest } from './utils'
import { crawl, crawlThreads } from '../src/community'
const assert = require('assert').strict

describe('testing crawl crawler', function () {
  before(async function () {
    await database.connectToDatabase()
  })

  beforeEach(async function () {
    await database.sequelize.sync({ force: true })
  })

  it('crawl: thread valid', async function () {
    this.timeout(600000)
    const product = await createProduct()
    const language = await createLanguage()
    const threads = await crawl({ product, language })
    assert.ok(Array.isArray(threads))
    assert.ok(threads.length > 0)
    const [thread] = threads
    assert.ok(thread.title !== '')
    assert.ok(thread.description !== '')
    assert.ok(Number.isInteger(thread.uuid))
    const threadUrl = `https://support.google.com/youtube/thread/${thread.uuid}`
    const { response } = await makeSimpleRequest(threadUrl)
    assert.equal(response.statusCode, 200)
  })

  it('crawl: thread added in db', async function () {
    this.timeout(600000)
    const product = await createProduct()
    const language = await createLanguage()
    const promises = await crawlThreads({
      products: [product],
      languages: [language]
    })
    const [result] = await Promise.all(promises)
    const nbAdded = result.nbAdded
    const promisesBis = await crawlThreads({
      products: [product],
      languages: [language]
    })
    const [resultBis] = await Promise.all(promisesBis)
    assert.equal(nbAdded, resultBis.nbAdded)
    const count = await database.Thread.count({
      where: {
        LanguageId: language.id,
        ProductId: product.id
      }
    })
    assert.equal(count, nbAdded)
  })
})
