import { products, languages, baseUrl } from './config'
import Crawler from './crawlsite'
import fetch from 'node-fetch'
import cheerio from 'cheerio'
import { debug } from './utils/utils'

/**
 * Extract the UUID from an url
 * @param {!String} url - Url of the page cralwed
 * @return {!Number || Null} UUID
 */
export const getUuid = url => {
  try {
    const { pathname } = new URL(url)
    const uuid = pathname.slice(pathname.lastIndexOf('/') + 1)
    return parseInt(uuid, 10)
  } catch (error) {
    return null
  }
}

/**
 * Check if the link is part of the product center.
 * @param {!String} url - The url collected from the crawler
 * @param {!String} productUrl - The product URL used to crawl
 * @return {!Boolean}
 */
export const isValidProductUrl = (url, productUrl) => {
  try {
    const productUrlObject = new URL(productUrl)
    const { href, pathname } = new URL(url)
    if (!href.startsWith(productUrlObject.href)) return false
    if (href === productUrlObject.href) return true
    return pathname.includes('/answer') || pathname.includes('/topic') || pathname.includes('/troubleshooter')
  } catch (error) {
    return false
  }
}

/**
 * Check if the link can be crawled.
 * @param {{!String}} args.url - The url collected from the crawler
 * @param {{!Product}} args.product - The product which is being crawled
 * @param {{!String}} args.lang - The code lang
 * @return {!String || false} If the link is valid, return a cleaned link, if not, return false
 */
export const isRequestValid = ({ url, product, lang }) => {
  if (isValidProductUrl(url, product.baseUrl)) {
    url = new URL(url)
    url.hash = ''
    url.search = ''
    url.searchParams.set('hl', lang)
    url = url.toString()
    return url
  }
  return false
}

/**
 * Extract data (title / description) of the page crawled
 * @param {!Function} $ - The HTML document loaded by Cheerio
 * @return {!Object<String: title, String: description>} Return datas
 */
const collectContentCards = $ => {
  if ($('body').find('.butterbar').length > 0) {
    return {}
  } else {
    const title = $('h1').text() || ''
    const description = $('meta[name=description]').attr('content') || ''
    return {
      title,
      description,
      isError: $('body').find('section.error').length > 0
    }
  }
}

/**
 * Extract data (title / description, uuid, publicUrl) the forum fetched
 * @param {!Function} $ - The HTML document loaded by Cheerio
 * @param {!String} lang - The code lang
 * @return {!Array <Object>} Return datas
 */
const collectContentThreads = ($, lang) => {
  if ($('body').find('.butterbar').length > 0) {
    return []
  } else {
    return $('a.thread-list-thread')
      .map((i, e) => {
        const publicHref = $(e).attr('href') || ''
        const publicUrl = new URL(baseUrl.toString().substring(0, baseUrl.toString().length - 1) + publicHref)
        publicUrl.search = ''
        publicUrl.searchParams.set('hl', lang)
        return {
          uuid: parseInt(publicUrl.pathname.split('/').pop()),
          publicUrl: publicUrl.toString(),
          title: $(e)
            .find('.thread-list-thread__title')
            .text()
            .trim(),
          description: $(e)
            .find('.thread-list-thread__snippet')
            .text()
            .trim()
        }
      })
      .get()
  }
}

/**
 * If url changes, check if the new one is valid
 * @param {!Object} param0.response - New response from the fetch
 * @param {!Object} param0.previousUrl - URL that has been fetched
 * @param {*} product - The product which is being crawled
 * @param {*} lang - The code lang
 */
const onRedirection = ({ response }, product, lang) => {
  return isRequestValid({ url: response.url, product, lang })
}

/**
 * The main function used to add Card to the database. If the card already exists, update it.
 * @param {{!String}} args.url - The cleaned link which has been crawled
 * @param {{!Object}} args.result - The datas collected on the crawled page
 * @param {{!Product}} args.product - Product which is being crawled
 * @param {{!Object}} args.models - Instances of the ORM
 * @param {{!String}} args.lang - The code lang
 * @param {!Number} retry - Number of remaining attempts
 * @return {!Promise <Boolean>}
 */
export const addOrUpdateCards = async ({ url, result, product, models, lang, manually = false }, retry = 3) => {
  try {
    const { title, description, isError } = result
    const uuid = getUuid(url)
    if (isNaN(uuid) || !title || isError) return
    if (!url.includes('/answer/') && !url.includes('/troubleshooter/')) return

    const link = new URL(product.baseUrl)
    if (url.includes('/answer/')) link.pathname = link.pathname + 'answer/'
    else if (url.includes('/troubleshooter/')) link.pathname = link.pathname + 'troubleshooter/'
    link.pathname = link.pathname + uuid

    const datas = {
      uuid,
      title,
      description,
      lang,
      manually,
      url: link.toString()
    }

    if (!(await models.Card.findOne({ where: { uuid, lang, ProductId: product.id } }))) {
      await models.Card.create({
        ...datas,
        ProductId: product.id
      })
    } else {
      await models.Card.update(
        {
          title: datas.title,
          description: datas.description,
          manually
        },
        {
          where: {
            uuid,
            lang,
            ProductId: product.id
          }
        }
      )
    }
    return true
  } catch (error) {
    console.error(error)
    if (retry >= 0) {
      retry--
      await addOrUpdateCards({ url, result, product, models, lang }, retry)
    } else {
      return false
    }
  }
}

/**
 * Remove all threads by the lang, and add the newests
 * @param {{!Array <Thread>}} args[0].threads - Threads collected
 * @param {{!String}} models - The code lang
 * @return {!Promise <>}
 */
export const addThreadsByLang = async ({ threads, lang }, models) => {
  await models.Thread.destroy({ where: { lang } })
  for (const thread of threads) {
    await models.Thread.create({
      ...thread,
      lang
    })
  }
}

/**
 * Fetch a forum of a Google product and get the last 24h threads
 * @param {{!Product}} args.product - Product used to fetch the forum
 * @param {{!String}} args.lang - The code lang
 * @param {{!Number}} args.maxThreads - The number of threads max to extract
 * @return {!Promise <Array>} All threads collected
 */
export const fetchThread = async ({ product, lang, maxThreads }) => {
  try {
    const response = await fetch(
      `${product.baseUrl}threads?hl=${lang}&thread_filter=(-has%3Areply)%20(created%3A24h)&max_results=${maxThreads}`
    )
    const textResponse = await response.text()
    const $ = cheerio.load(textResponse)
    const threads = collectContentThreads($, lang)
    return threads.map(thread => {
      thread.ProductId = product.id
      const consoleUrl = new URL(
        baseUrl.toString().substring(0, baseUrl.toString().length - 1) +
          `/s/community/forum/${product.forumId}/thread/${thread.uuid}`
      )
      thread.consoleUrl = consoleUrl.toString()
      return thread
    })
  } catch (error) {
    console.log(error)
    return []
  }
}

/**
 * Crawl every products listed by every langs listed
 * @param {!Object} models - Instances of the ORM
 * @param {!Object} options - Options passed to the crawler instance
 * @return {!Promise <>}
 */
export async function startCrawlingCards(models, options) {
  const prods = await models.Product.findAll()
  for (const lang of languages) {
    if (options.singleCrawl) {
      try {
        await Crawler.launch({
          url: options.singleCrawl.url,
          showProgress: false,
          preRequest: url => isRequestValid({ url, product: options.singleCrawl.product, lang }),
          evaluatePage: $ => collectContentCards($),
          onSuccess: ({ result, url }) =>
            addOrUpdateCards({ result, url, lang, models, product: options.singleCrawl.product, manually: true }),
          onRedirection: params => onRedirection(params, options.singleCrawl.product, lang),
          maxRequest: 1
        })
      } catch (error) {
        console.error(error)
      }
    } else {
      for (const product of prods) {
        try {
          await Crawler.launch({
            url: product.baseUrl,
            titleProgress: `Crawling ${product.name} product in ${lang}`,
            preRequest: url => isRequestValid({ url, product, lang }),
            evaluatePage: $ => collectContentCards($),
            onRedirection: params => onRedirection(params, product, lang),
            onSuccess: ({ result, url }) => addOrUpdateCards({ result, url, lang, models, product }),
            ...options
          })
          console.info(`Cards for ${product.name} in '${lang}' have been crawled.`)
        } catch (error) {
          console.warn(`Error with the crawler of the product ${product.name} in lang '${lang}'`)
          continue
        }

        try {
          const manualCards = await models.Card.findAll({
            where: {
              productId: product.id,
              manually: true
            }
          })
          for (const card of manualCards) {
            await Crawler.launch({
              url: card.url,
              showProgress: false,
              preRequest: url => isRequestValid({ url, product, lang }),
              evaluatePage: $ => collectContentCards($),
              onSuccess: ({ result, url }) => addOrUpdateCards({ result, url, lang, models, product, manually: true }),
              onRedirection: params => onRedirection(params, product, lang),
              maxRequest: 1
            })
          }
          console.info(`${manualCards.length} manual Cards for ${product.name} in ${lang} have been crawled.`)
        } catch (error) {
          console.error(error)
        }
      }
    }
  }
}

/**
 *
 * @param {!Object} models - Instances of the ORM
 * @param {!Object} args[1].maxThreads - The number of threads max to extract
 * @return {!Promise <>}
 */
export async function startCrawlingThreads(models, { maxThreads }) {
  let prods = await models.Product.findAll()
  for (const lang of languages) {
    const threadPromises = []
    try {
      for (const product of prods) {
        threadPromises.push(fetchThread({ product, lang, maxThreads }))
      }
      const threads = await Promise.all(threadPromises)
      await addThreadsByLang({ lang, threads: threads.flat() }, models)
      console.info(`Threads in ${lang} have been fetched.`)
    } catch (error) {
      console.warn(`Error with the fetcher of threads in lang ${lang}`)
      continue
    }
  }
}

/**
 * Main function to start crawler and fetcher in the same time
 * Reload fetcher after every 3 minutes
 * Reload crawler after every 24 hours
 * @param {!Object} models - Instances of the ORM
 * @param {!Object} options - Options passed to the crawler & fetcher
 * @return {!Promise <>}
 */
export async function crawloop(models, options) {
  let hasSynced = false
  while (!hasSynced) {
    try {
      await models.sequelize.sync()
      hasSynced = true
    } catch (error) {}
  }

  for (const product of products) {
    await models.Product.findOrCreate({
      where: { name: product.name, baseUrl: product.url, forumId: product.forumId }
    })
  }

  const loopingThreads = async () => {
    try {
      const startCrawlingAt = new Date()
      debug(`Start fetching threads at ${startCrawlingAt}`)
      await startCrawlingThreads(models, options)
      const finishedCrawlingAt = new Date()
      debug(`Finish fetching threads at ${finishedCrawlingAt}`)
    } catch (error) {
      console.log(error)
    }

    if (process.env.NODE_ENV !== 'test') {
      setTimeout(() => loopingThreads(), 5 * 60 * 1000)
      debug(`Waiting 5min for a new fetch threads`)
    }
  }

  const loopingCards = async () => {
    try {
      const startCrawlingAt = new Date()
      debug(`Start crawling cards at ${startCrawlingAt}`)
      const { Op } = models.Sequelize
      await startCrawlingCards(models, options)
      const finishedCrawlingAt = new Date()
      debug(`Finish crawling cards at ${startCrawlingAt}`)
      debug(`Crawling cards finished after ${(finishedCrawlingAt - startCrawlingAt) / 1000} seconds`)
      await models.Card.destroy({
        where: {
          updatedAt: {
            [Op.lt]: startCrawlingAt
          }
        }
      })
    } catch (error) {
      console.error(error)
    }

    if (process.env.NODE_ENV !== 'test') {
      setTimeout(() => loopingCards(), 86400000)
      debug(`Waiting 86400000ms for a new crawl`)
    }
  }

  if (options.rssFeed) loopingThreads()
  if (options.crawlCards) loopingCards()
}

export default crawloop
