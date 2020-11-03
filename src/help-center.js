import jetpack from 'fs-jetpack'
import cheerio from 'cheerio'
import colors from 'colors'
import Crawler from 'simplecrawler'
import { LANGUAGES, PRODUCTS } from './shared/constants'
import { getUuid, isUrl, relativePath } from './shared/helpers'

const CREATE_HELP_CENTER_URL = (productCode) => `https://support.google.com/${productCode}`
const DIR_ANSWERS = jetpack.dir('answers')

const crawlProduct = ({ product, language }) => new Promise(resolve => {
  console.log(colors.debug(`Start crawling ${product.name} in ${language}`))
  const helpCenterUrl = new URL(CREATE_HELP_CENTER_URL(product.code))
  const crawler = Crawler(helpCenterUrl.toString() + `?hl=${language}`)

  const answers = []

  crawler.discoverResources = function (buffer, queueItem) {
    const $ = cheerio.load(buffer.toString('utf8'))
    const resources = $('a')
      .map((i, elem) => relativePath($(elem).attr('href') || '', queueItem.url))
      .filter((i, url) => isUrl(url))
      .map((i, href) => {
        const url = new URL(href)
        url.hash = ''
        url.search = ''
        url.searchParams.set('hl', language)
        return url.toString()
      }).get()
    return resources
  }

  crawler.addFetchCondition(function (queueItem, referrerQueueItem) {
    if (isUrl(queueItem.url)) {
      if (queueItem.url.startsWith(helpCenterUrl)) {
        return queueItem.path.includes('/answer') || queueItem.path.includes('/topic') || queueItem.path.includes('/troubleshooter')
      }
    }
    return false
  })

  crawler.addDownloadCondition(function (queueItem, referrerQueueItem) {
    return !queueItem.url.includes('visit_id')
  })

  crawler.on('fetchcomplete', async (queueItem, buffer) => {
    const $ = cheerio.load(buffer.toString('utf8'))
    if ($('body').find('.butterbar').length === 0) {
      const title = $('h1').text() || ''
      const description = $('meta[name=description]').attr('content') || ''
      const uuid = getUuid(queueItem.url)
      if (isNaN(uuid) || !title) return
      if (!queueItem.url.includes('/answer/') && !queueItem.url.includes('/troubleshooter/')) return

      const topic = {
        title,
        description,
        uuid
      }

      answers.push(topic)
      console.log(colors.info(`[${product.name}/${language}]: ${title}`))
    }
  })

  crawler.on('complete', () => resolve(answers))

  crawler.maxConcurrency = 3
  crawler.maxDepth = 8
  crawler.start()
})

export const crawlAnswers = async () => {
  for (const product of (await PRODUCTS)) {
    for (const language of (await LANGUAGES)) {
      const answers = await crawlProduct({ product, language })
      const data = { 'last-update': new Date(), name: product.name, lang: language, answers }
      const PRODUCT_DIR = DIR_ANSWERS.dir(product.code)
      PRODUCT_DIR.write(`${language}.json`, data, { jsonIndent: 2 })
      console.log(colors.debug(`${answers.length} crawled for ${product.name} in ${language}`))
    }
  }
}
