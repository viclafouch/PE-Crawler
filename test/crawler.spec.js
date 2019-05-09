/* global describe, it, before, beforeEach */

import { isValidProductUrl, getUuid, crawloop, addOrUpdateCards } from '../build/crawler'
import { baseUrl, products, languages } from '../build/config'

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

    beforeEach(async function() {
      this.models = require('../build/models').default
      await this.models.Card.sync({ force: true })
    })

    it('addOrUpdateCards', async function() {
      const lang = 'en'
      let url = 'https://support.google.com/youtube/answer/2801939'
      const result = { title: 'Test Product', description: 'Test description' }
      console.log('get product YouTube')
      const product = await this.models.Product.findOne({ where: { name: 'YouTube' } })
      console.log('test addOrUpdateCards insert valid')
      await addOrUpdateCards({ url, result, product, models: this.models, lang })
      console.log('get last card created')
      const createdCard = await this.models.Card.findOne({
        order: [['createdAt', 'DESC']],
        where: { ProductId: product.id, lang }
      })
      assert.ok(createdCard)
      console.log('last card has been created')
      assert.equal(createdCard.title, result.title)
      console.log('title inserted is valid')
      assert.equal(createdCard.description, result.description)
      console.log('description inserted is valid')
      result.title = 'Test Product edited'
      console.log('test addOrUpdateCards update existing card')
      await addOrUpdateCards({ url, result, product, models: this.models, lang })
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

      url = 'https://support.google.com/youtube/answer/2801936'
      result.title = 'New Card'
      console.log('test addOrUpdateCards add new card')
      await addOrUpdateCards({ url, result, product, models: this.models, lang })
      console.log('get all youtube card')
      const cardsNumber = (await this.models.Card.findAll({
        where: { ProductId: product.id, lang }
      })).length
      console.log('there is 2 cards in total')
      assert.equal(cardsNumber, 2)

      url = 'https://support.google.com/youtube/topic/myTopic'
      console.log('test addOrUpdateCards add new card with topic')
      await addOrUpdateCards({ url, result, product, models: this.models, lang })
      console.log('get all youtube card')
      const cardsNumber2 = (await this.models.Card.findAll({
        where: { ProductId: product.id, lang }
      })).length
      console.log('there is still 2 cards in total')
      assert.equal(cardsNumber, cardsNumber2)
      console.log('test addOrUpdateCards add new card with baseUrl')
      url = product.baseUrl
      await addOrUpdateCards({ url, result, product, models: this.models, lang })
      console.log('get all youtube card')
      const cardsNumber3 = (await this.models.Card.findAll({
        where: { ProductId: product.id, lang }
      })).length
      console.log('there is still 2 cards in total')
      assert.equal(cardsNumber, cardsNumber3)
    })

    it('crawler', async function() {
      const maxRequest = 10
      console.log('start crawler')
      await crawloop(this.models, {
        maxRequest
      })
      console.log('end crawler')
      const cardCrawled = await this.models.Card.findAll()
      console.log(cardCrawled.length + ' cards inserted')
      for (const card of cardCrawled) {
        assert.ok(card.title)
        assert.ok(card.ProductId)
        assert.ok(card.url)
        const product = await this.models.Product.findOne({
          where: { id: card.ProductId }
        })
        assert.ok(isValidProductUrl(card.url, product.baseUrl))
      }
    })

    it('crawler languages nb founded', async function() {
      const maxRequest = 10
      console.log('start crawler')
      await crawloop(this.models, {
        maxRequest
      })

      for (const lang of languages) {
        const cards = await this.models.Card.findAll({
          where: { lang }
        })
        console.log(`${cards.length} cards founded for ${lang} language`)
      }
    })
  })
})
