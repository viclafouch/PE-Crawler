import jetpack from 'fs-jetpack'
import cheerio from 'cheerio'
import Crawler from 'simplecrawler'
import { log } from './shared/helpers'
import database from '../db/models'

const debug = (args) => log({ ...args, message: `[THREADS]: ${args.message}` })

const CREATE_THREADS_URL = (productCode) => `https://support.google.com/${productCode}/threads`
const DIR_THREADS = jetpack.dir('threads')
let crawler

export const crawlCommunities = ({ products, languages }) => new Promise(resolve => {
  if (crawler instanceof Crawler) {
    crawler.stop(true)
    crawler = null
  }

  for (const product of products) {
    for (const language of languages) {
      const url = new URL(CREATE_THREADS_URL(product.code))
      url.searchParams.set('hl', language.code)
      url.searchParams.set('max_results', 60)
      if (!crawler) crawler = Crawler(url.toString())
      else crawler.queueURL(url.toString())
    }
  }

  crawler.on('fetchcomplete', async (queueItem, buffer) => {
    const $ = cheerio.load(buffer.toString('utf8'))
    const listThreadsItems = $('a.thread-list-thread')
    const threads = listThreadsItems.map((i, e) => {
      const id = $(e).attr('data-stats-id')
      const title = $(e).find('.thread-list-thread__title')
      const description = $(e).find('.thread-list-thread__snippet')
      return {
        id,
        title: title.text().trim(),
        description: description.text().trim()
      }
    }).get()
    const productCode = queueItem.uriPath.split('/')[1]
    const product = await database.Product.findOne({ where: { code: productCode } })
    const languageCode = (new URL(queueItem.url)).searchParams.get('hl')
    const PRODUCT_DIR = DIR_THREADS.dir(productCode)
    const data = { 'last-update': new Date(), name: product.name, lang: languageCode, threads }
    debug({
      status: 'success',
      message: `[${product.name}/${languageCode}]: ${threads.length} threads`
    })
    PRODUCT_DIR.write(`${languageCode}.json`, data, { jsonIndent: 2 })
  })

  crawler.on('fetchredirect', async (queueItem, buffer) => {
    const productCode = queueItem.uriPath.split('/')[1]
    const product = await database.Product.findOne({ where: { code: productCode } })
    const languageCode = (new URL(queueItem.url)).searchParams.get('hl')
    debug({
      status: 'warn',
      message: `[Status: ${queueItem.status}] for ${product.name} in ${languageCode}`
    })
  })

  crawler.addFetchCondition((queueItem, referrerQueueItem) => {
    return !queueItem.url.startsWith('https://support.google.com/threads') // Avoid fetch redirection 404
  })

  crawler.on('fetcherror', (queueItem, response) => {
    debug({
      status: 'error',
      message: `An error occured on [${queueItem.url}]: ${response.statusMessage}`
    })
  })

  crawler.on('fetchclienterror', (queueItem, error) => {
    debug({
      status: 'error',
      message: `A client error occured on [${queueItem.url}]: ${error.message}`
    })
  })

  crawler.on('fetch404', (queueItem, response) => {
    debug({
      status: 'error',
      message: `Status 404 on [${queueItem.url}]: ${response.statusMessage}`
    })
  })

  crawler.on('fetch410', (queueItem, response) => {
    debug({
      status: 'warn',
      message: `Status 410 on [${queueItem.url}]: ${response.statusMessage}`
    })
  })

  crawler.on('complete', resolve)

  crawler.maxConcurrency = 3
  crawler.maxDepth = 1
  crawler.start()
})
