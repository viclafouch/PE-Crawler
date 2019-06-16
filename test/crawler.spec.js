/* global describe, it, before, beforeEach */

import {
  isValidProductUrl,
  getUuid,
  crawloop,
  addOrUpdateCards,
  fetchThread,
  addThreadsByLang,
  startCrawlingCards
} from '../build/crawler'
import { baseUrl, products, languages } from '../build/config'
import fetch from 'node-fetch'

const assert = require('assert').strict

describe('crawler', function() {
  before(async () => {
    const { Product, sequelize } = await require('../build/models').default
    await sequelize.sync({ force: true })
    for (const product of products) {
      await Product.create({
        name: product.name,
        baseUrl: product.url,
        forumId: product.forumId
      })
    }
  })
  describe('helpers', () => {
    it('isValidProductUrl', () => {
      const productPathname = '/productName'
      const productUrl = new URL(baseUrl.toString())
      productUrl.pathname = productPathname
      let url = 'https://support.google.com' + productPathname
      assert.ok(isValidProductUrl(url, productUrl.href))
      url = 'https://support.google.com/otherProduct'
      assert.ok(!isValidProductUrl(url, productUrl.href))
      url = productUrl.href + '/answer'
      assert.ok(isValidProductUrl(url, productUrl.href))
      url = productUrl.href + '/topic'
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

  describe('cards', () => {
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
        maxRequest,
        rssFeed: false
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
        maxRequest,
        rssFeed: false
      })

      for (const lang of languages) {
        const cards = await this.models.Card.findAll({
          where: { lang }
        })
        console.log(`${cards.length} cards founded for ${lang} language`)
      }
    })
  })

  describe('threads (en lang)', () => {
    const lang = 'en'

    beforeEach(async function() {
      this.models = require('../build/models').default
      await this.models.Thread.sync({ force: true })
      await this.models.Card.sync({ force: true })
    })

    it('get threads of YouTube in en (so many posts..)', async function() {
      const product = await this.models.Product.findOne({
        where: {
          forumId: 659278
        }
      })

      const maxThreads = 4
      const threads = await fetchThread({ product, lang, maxThreads })
      assert.equal(maxThreads, threads.length)

      for (const thread of threads) {
        assert.ok(thread.title)
        assert.ok(new URL(thread.consoleUrl))
        assert.ok(new URL(thread.publicUrl))
        const publicFetch = await fetch(thread.publicUrl)
        assert.ok(publicFetch.ok)
        const consoleFetch = await fetch(thread.consoleUrl)
        assert.ok(consoleFetch.ok)
      }
    })

    it('Remove thread if doesnt exist', async function() {
      const product = await this.models.Product.findOne({
        where: {
          forumId: 659278
        }
      })
      const maxThreads = 4
      const threads = await fetchThread({ product, lang, maxThreads })
      await addThreadsByLang({ threads, lang }, this.models)
      assert.equal(maxThreads, threads.length)
      const { count } = await this.models.Thread.findAndCountAll({
        where: { lang }
      })
      assert.equal(count, threads.length)
      threads.shift()
      await addThreadsByLang({ threads, lang }, this.models)
      assert.equal(maxThreads - 1, threads.length)
    })

    it('test singleCrawl', async function() {
      const uuid = 2391819
      const url = 'https://support.google.com/chrome/answer/' + uuid
      const product = await this.models.Product.findOne({
        where: {
          name: 'Chrome'
        }
      })
      await startCrawlingCards(this.models, {
        singleCrawl: {
          url,
          product
        }
      })

      const card = await this.models.Card.findOne({
        where: {
          manually: true,
          uuid
        }
      })

      assert.ok(card)
    })

    it('301 redirection', async function() {
      const url = 'https://support.google.com/chrome/answer/95622' // Is 2391819
      const product = await this.models.Product.findOne({
        where: {
          name: 'Chrome'
        }
      })
      await startCrawlingCards(this.models, {
        singleCrawl: {
          url,
          product
        }
      })
      const cardNotExists = await this.models.Card.findOne({
        where: {
          uuid: 95622
        }
      })
      assert.ok(!cardNotExists)
      const cardExists = await this.models.Card.findOne({
        where: {
          uuid: 2391819
        }
      })
      assert.ok(cardExists)
    })
  })
})
