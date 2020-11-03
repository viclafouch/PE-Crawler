import jetpack from 'fs-jetpack'
import cheerio from 'cheerio'
import colors from 'colors'
import Crawler from 'simplecrawler'
import { getUuid, isUrl, relativePath } from './shared/helpers'

const CREATE_HELP_CENTER_URL = (productCode) => `https://support.google.com/${productCode}`
const DIR_ANSWERS = jetpack.dir('answers')

const crawlProduct = ({ product, language }) => new Promise(resolve => {
  const helpCenterUrl = new URL(CREATE_HELP_CENTER_URL(product.code))
  const crawler = Crawler(helpCenterUrl.toString() + `?hl=${language}`)

  const answers = []

  crawler.on('crawlstart', () => {
    console.log(colors.debug(`Start crawling answers for ${product.name} in ${language}`))
  })

  crawler.discoverResources = (buffer, queueItem) => {
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

  crawler.addFetchCondition((queueItem, referrerQueueItem) => {
    if (isUrl(queueItem.url)) {
      if (queueItem.url.startsWith(helpCenterUrl)) {
        return queueItem.path.includes('/answer') || queueItem.path.includes('/topic') || queueItem.path.includes('/troubleshooter')
      }
    }
    return false
  })

  crawler.addDownloadCondition((queueItem, referrerQueueItem) => {
    return !queueItem.url.includes('visit_id')
  })

  crawler.on('fetchcomplete', async (queueItem, buffer) => {
    const $ = cheerio.load(buffer.toString('utf8'))
    const title = $('h1').text() || ''
    const description = $('meta[name=description]').attr('content') || ''
    const uuid = getUuid(queueItem.url)
    if (isNaN(uuid) || !title) return
    else if ($('body').find('.guide-button').length > 0) return // avoid https://support.google.com/chrome/a/answer/9270224
    else if (!queueItem.url.includes('/answer/') && !queueItem.url.includes('/troubleshooter/')) return

    const topic = {
      title,
      description,
      uuid
    }

    answers.push(topic)
    console.log(colors.info(`- (ANSWERS) [${product.name}/${language}][${answers.length}]: ${title}`))
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

  crawler.on('complete', () => resolve(answers))

  crawler.maxConcurrency = 3
  crawler.maxDepth = 8
  crawler.start()
})

export const crawlAnswers = async ({ products, languages }) => {
  for (const product of products) {
    for (const language of languages) {
      const answers = await crawlProduct({ product, language })
      const data = { 'last-update': new Date(), name: product.name, lang: language, answers }
      const PRODUCT_DIR = DIR_ANSWERS.dir(product.code)
      PRODUCT_DIR.write(`${language}.json`, data, { jsonIndent: 2 })
      console.log(colors.debug(
        `${answers.length} crawled for ${product.name} in ${language}`))
    }
  }
}
