import { products, languages, baseUrl } from './config'
import Crawler from './crawlsite'
import fetch from 'node-fetch'
import cheerio from 'cheerio'
import { debug } from './utils/utils'

export const getUuid = url => {
  try {
    const { pathname } = new URL(url)
    const uuid = pathname.slice(pathname.lastIndexOf('/') + 1)
    return parseInt(uuid, 10)
  } catch (error) {
    return null
  }
}

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

export const addOrUpdateCards = async ({ url, result, product, models, lang }, retry = 3) => {
  try {
    const { title, description } = result
    const uuid = getUuid(url)
    if (isNaN(uuid) || !title.trim()) return
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
          description: datas.description
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

const collectContentCards = $ => {
  const title = $('h1').text() || ''
  const description = $('meta[name=description]').attr('content') || ''
  return {
    title,
    description
  }
}

const collectContentThreads = $ => {
  return $('a.thread-list-thread')
    .map((i, e) => {
      const publicHref = $(e).attr('href') || ''
      const publicUrl = new URL(baseUrl.toString().substring(0, baseUrl.toString().length - 1) + publicHref)
      publicUrl.search = ''
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

const fetchThread = async ({ product, lang, maxThreads }) => {
  try {
    const response = await fetch(
      `${product.baseUrl}threads?hl=${lang}&thread_filter=(-has%3Areply)%20(created%3A24h)&max_results=${maxThreads}`
    )
    const textResponse = await response.text()
    const $ = cheerio.load(textResponse)
    const threads = collectContentThreads($)
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

export async function startCrawlingCards(models, options) {
  const prods = await models.Product.findAll()
  for (const lang of languages) {
    for (const product of prods) {
      try {
        await Crawler.launch({
          url: product.baseUrl,
          titleProgress: `Crawling ${product.name} product in ${lang}`,
          preRequest: url => isRequestValid({ url, product, lang }),
          evaluatePage: $ => collectContentCards($),
          onSuccess: ({ result, url }) => addOrUpdateCards({ result, url, lang, models, product }),
          ...options
        })
        console.info(`Cards for ${product.name} in ${lang} have been crawled.`)
      } catch (error) {
        console.warn(`Error with the crawler of the product ${product.name} in lang ${lang}`)
        continue
      }
    }
  }
}

export async function startCrawlingThreads(models, options) {
  let prods = await models.Product.findAll()
  for (const lang of languages) {
    const threadPromises = []
    for (const product of prods) {
      threadPromises.push(fetchThread({ product, lang, maxThreads: options.maxThreads }))
    }
    const threads = await Promise.all(threadPromises)
    await models.Thread.destroy({ where: { lang } })
    for (const thread of threads.flat()) {
      await models.Thread.create({
        ...thread,
        lang
      })
    }
    console.info(`Threads in ${lang} have been fetched.`)
  }
}

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
      setTimeout(() => loopingThreads(), 180000)
      debug(`Waiting 180000ms for a new fetch threads`)
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
