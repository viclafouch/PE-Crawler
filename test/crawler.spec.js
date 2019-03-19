import { isValidProductUrl, getUuid } from '../build/crawler'
import { baseUrl, products } from '../build/constants'
import { actionCard } from '../build/crawler'

const assert = require('assert').strict

describe('crawler', function() {
  describe('helpers', () => {
    it('isValidProductUrl', () => {
      const productPathname = '/productName'
      const productUrl = Object.assign(baseUrl, {})
      productUrl.pathname = productPathname
      let url = 'https://support.google.com' + productPathname
      assert.ok(isValidProductUrl(url, productUrl.href))
      url = 'https://support.google.com/otherProduct'
      assert.ok(!isValidProductUrl(url, productUrl.href))
      url = productUrl.href + '/answer'
      assert.ok(isValidProductUrl(url, productUrl.href))
      url = productUrl.href + '/topic'
      assert.ok(isValidProductUrl(url, productUrl.href))
      url = baseUrl.href
      assert.ok(isValidProductUrl(url, productUrl.href))
    })
    it('getUuid', () => {
      let url = 'https://support.google.com/youtube/answer/2801939?hl=en'
      assert.ok(!isNaN(getUuid(url)))
      url = 'https://support.google.com/youtube/answer/ffjijfdsf'
      assert.ok(isNaN(getUuid(url)))
      url = 'https://support.google.com/youtube/2801939/answer'
      assert.ok(isNaN(getUuid(url)))
    })
  })

  describe('crawling', () => {
    before(async () => {
      const { Product, sequelize } = await require('../build/models').default
      await sequelize.sync({ force: true })
      for (const product of products) {
        await Product.create({
          name: product.name,
          baseUrl: product.url
        })
      }
    })

    beforeEach(function() {
      this.models = require('../build/models').default
      this.models.Card.sync({ force: true })
    })
    it('actionCard', async function() {
      const options = { url: 'https://support.google.com/youtube/answer/2801939' }
      const result = { title: 'Test Product' }
      console.log('get product YouTube')
      const product = await this.models.Product.findOne({ where: { name: 'YouTube' } })
      console.log('test actionCard insert valid')
      await actionCard({ options, result, product, models: this.models })
      console.log('get last card created')
      const createdCard = await this.models.Card.findOne({
        order: [['createdAt', 'DESC']],
        where: { ProductId: product.id }
      })
      assert.ok(createdCard)
      console.log('last card has been created')
      assert.equal(createdCard.title, result.title)
      console.log('title inserted is valid')
      result.title = 'Test Product edited'
      console.log('test actionCard update existing card')
      await actionCard({ options, result, product, models: this.models })

      console.log('get last card updated')
      const updatedCard = await this.models.Card.findOne({
        order: [['updatedAt', 'DESC']],
        where: { ProductId: product.id }
      })
      assert.ok(createdCard)
      console.log('last card updated is the same as the previous created')
      assert.equal(createdCard.id, updatedCard.id)
      assert.ok(createdCard.title !== updatedCard.title)
      console.log('title has been updated')
      assert.ok(updatedCard.updatedAt.getTime() > createdCard.updatedAt.getTime())
      console.log('updatedAt has been updated')

      options.url = 'https://support.google.com/youtube/answer/2801936'
      result.title = 'New Card'
      console.log('test actionCard add new card')
      await actionCard({ options, result, product, models: this.models })
      console.log('get all youtube card')
      const cardsNumber = (await this.models.Card.findAll({
        where: { ProductId: product.id }
      })).length
      console.log('there is 2 cards in total')
      assert.equal(cardsNumber, 2)

      options.url = 'https://support.google.com/youtube/topic/myTopic'
      console.log('test actionCard add new card with topic')
      await actionCard({ options, result, product, models: this.models })
      console.log('get all youtube card')
      const cardsNumber2 = (await this.models.Card.findAll({
        where: { ProductId: product.id }
      })).length
      console.log('there is still 2 cards in total')
      assert.equal(cardsNumber, cardsNumber2)
      console.log('test actionCard add new card with baseUrl')
      options.url = product.baseUrl
      await actionCard({ options, result, product, models: this.models })
      console.log('get all youtube card')
      const cardsNumber3 = (await this.models.Card.findAll({
        where: { ProductId: product.id }
      })).length
      console.log('there is still 2 cards in total')
      assert.equal(cardsNumber, cardsNumber3)
    })
  })
})
