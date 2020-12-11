import { before } from 'mocha'
import database from '../db/models'
import { createFakeAnswers, createLanguage, createProduct, makeSimpleRequest } from './utils'
import { crawl, crawlAnswers, CREATE_HELP_CENTER_URL, deprecatedDate } from '../src/help-center'
import DomParser from 'dom-parser'
const Entities = require('html-entities').Html5Entities
const assert = require('assert').strict

describe('testing crawl help-center', function () {
  before(async function () {
    await database.connectToDatabase()
  })

  beforeEach(async function () {
    await database.sequelize.sync({ force: true })
  })

  it('crawl: answer valid', async function () {
    this.timeout(600000)
    const product = await createProduct()
    const language = await createLanguage()
    const answers = await crawl({
      product,
      language,
      options: {
        maxConcurrency: 5,
        maxDepth: 2
      }
    })
    assert.ok(Array.isArray(answers))
    assert.ok(answers.length > 0)
    const [answer] = answers
    assert.ok(answer.title !== '')
    assert.ok(answer.description !== '')
    assert.ok(Number.isInteger(answer.uuid))
    const helpCenterUrl = CREATE_HELP_CENTER_URL({
      productCode: product.code,
      hl: language.code
    })
    helpCenterUrl.pathname += `/answer/${answer.uuid}`
    const { response, data } = await makeSimpleRequest(helpCenterUrl.toString())
    assert.equal(response.statusCode, 200)
    const document = new DomParser().parseFromString(data, 'text/html')
    const entities = new Entities()
    const title = document.getElementsByTagName('h1')[0].textContent
    assert.equal(entities.decode(title), entities.decode(answer.title))
    assert.equal('answer', answer.type)
  })

  it('crawl: answer added in db', async function () {
    this.timeout(600000)
    const product = await createProduct()
    const language = await createLanguage()
    const promises = await crawlAnswers({
      products: [product],
      languages: [language],
      options: {
        maxConcurrency: 5,
        maxDepth: 2
      }
    })
    const [result] = await Promise.all(promises)
    assert.equal(result.nbUpdated, 0)
    assert.ok(result.nbAdded > 0)
    const count = await database.Answer.count({
      where: {
        LanguageId: language.id,
        ProductId: product.id
      }
    })
    assert.equal(count, result.nbAdded)
  })

  it('crawl: answer updated in db', async function () {
    this.timeout(600000)
    const product = await createProduct()
    const language = await createLanguage()
    const promises = await crawlAnswers({
      products: [product],
      languages: [language],
      options: {
        maxConcurrency: 5,
        maxDepth: 2
      }
    })
    const [result] = await Promise.all(promises)

    const promisesBis = await crawlAnswers({
      products: [product],
      languages: [language],
      options: {
        maxConcurrency: 5,
        maxDepth: 2
      }
    })
    const [resultBis] = await Promise.all(promisesBis)
    assert.equal(resultBis.nbAdded, 0)
    assert.equal(resultBis.nbUpdated, result.nbAdded)
    const count = await database.Answer.count({
      where: {
        LanguageId: language.id,
        ProductId: product.id
      }
    })
    assert.equal(count, result.nbAdded)
  })

  it('crawl: remove deprecated answer from db', async function () {
    this.timeout(600000)
    const numberOfAnswersDeprecated = 5
    const product = await createProduct()
    const language = await createLanguage()

    await createFakeAnswers({
      productId: product.id,
      languageId: language.id,
      number: numberOfAnswersDeprecated
    }).then(answers => {
      return Promise.all(answers.map(answer =>
        database.Answer.update({
          updatedAt: deprecatedDate()
        }, {
          where: {
            id: answer.id
          }
        })
      ))
    })

    const answerDepreacted = await database.Answer.findOne({
      where: {
        LanguageId: language.id,
        ProductId: product.id
      }
    })

    const count = await database.Answer.count({
      where: {
        LanguageId: language.id,
        ProductId: product.id
      }
    })
    assert.equal(count, numberOfAnswersDeprecated)

    const promises = await crawlAnswers({
      products: [product],
      languages: [language],
      options: {
        maxConcurrency: 5,
        maxDepth: 2
      }
    })

    const [result] = await Promise.all(promises)

    assert.equal(result.nbUpdated, 0)
    assert.ok(result.nbAdded > 0)
    const allAnswers = await database.Answer.count({
      where: {
        LanguageId: language.id,
        ProductId: product.id
      }
    })
    assert.equal(allAnswers, result.nbAdded)

    const answerDepreactedRemoved = await database.Answer.findByPk(answerDepreacted.id)
    assert.equal(answerDepreactedRemoved, null)
  })
})
