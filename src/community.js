import jetpack from 'fs-jetpack'
import colors from 'colors'
import cheerio from 'cheerio'
import Crawler from 'simplecrawler'

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
      url.searchParams.set('hl', language)
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
    const product = products.find(({ code }) => code === productCode)
    const languageCode = (new URL(queueItem.url)).searchParams.get('hl')
    const PRODUCT_DIR = DIR_THREADS.dir(productCode)
    const data = { 'last-update': new Date(), name: product.name, lang: languageCode, threads }
    console.log(colors.info(`- (THREADS) [${product.name}/${languageCode}]: ${threads.length} threads`))
    PRODUCT_DIR.write(`${languageCode}.json`, data, { jsonIndent: 2 })
  })

  crawler.on('fetchredirect', async (queueItem, buffer) => {
    const productCode = queueItem.uriPath.split('/')[1]
    const product = products.find(({ code }) => code === productCode)
    const languageCode = (new URL(queueItem.url)).searchParams.get('hl')
    console.log(colors.warn(`[Status: ${queueItem.status}] for ${product.name} in ${languageCode}`))
  })

  crawler.on('fetcherror', (queueItem, response) => {
    console.log(colors.error(`An error occured on [${queueItem.url}]: ${response.statusMessage}`))
  })

  crawler.on('fetchclienterror', (queueItem, error) => {
    console.log(colors.error(`A client error occured on [${queueItem.url}]: ${error.message}`))
  })

  crawler.on('fetch404', (queueItem, response) => {
    console.log(colors.warn(`Status 404 on [${queueItem.url}]: ${response.statusMessage}`))
  })

  crawler.on('fetch410', (queueItem, response) => {
    console.log(colors.warn(`Status 410 on [${queueItem.url}]: ${response.statusMessage}`))
  })

  crawler.on('complete', resolve)

  crawler.maxConcurrency = 3
  crawler.maxDepth = 1
  crawler.start()
})
