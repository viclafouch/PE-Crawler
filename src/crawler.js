import { baseUrl, products, languages } from './constants'
const HCCrawler = require('headless-chrome-crawler')

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
    return pathname.includes('/answer') || pathname.includes('/topic')
  } catch (error) {
    return false
  }
}

export const isRequestValid = ({ options, product, lang }) => {
  if (isValidProductUrl(options.url, product.baseUrl)) {
    const url = new URL(options.url)
    url.hash = ''
    url.search = ''
    url.searchParams.set('hl', lang)
    options.url = url.toString()
    return options
  }
  return false
}

export const actionCard = async ({ options, result, product, models, lang }) => {
  try {
    const { title, description } = result
    const { url } = options
    const uuid = getUuid(url)
    if (isNaN(uuid) || !url.includes('/answer/')) return

    const datas = {
      uuid,
      title,
      description,
      lang,
      url: product.baseUrl + '/answer/' + uuid
    }
    if (!(await models.Card.findOne({ where: { uuid } }))) {
      await models.Card.create({
        ...datas,
        ProductId: product.id
      })
    } else await models.Card.update({ title: datas.title }, { where: { uuid, lang } })
  } catch (error) {
    console.log(error)
    return false
  }
}

const crawl = (models, product, lang, params) =>
  HCCrawler.launch({
    ...params,
    maxDepth: 10,
    maxRequest: 30,
    maxConcurrency: 5,
    retryCount: 0,
    preRequest: options => isRequestValid({ options, product, lang }),
    evaluatePage: () => ({
      title: $('h1')
        .text()
        .trim(),
      description: $('meta[name=description]').attr('content')
    }),
    onSuccess: async ({ result, options }) => actionCard({ result, options, models, product, lang }),
    onError(error) {
      console.log(error)
    }
  })

export async function startCrawling(models, params) {
  const products = await models.Product.findAll()
  for (const lang of languages) {
    for (const product of products) {
      const crawler = await crawl(models, product, lang, params)
      await crawler.queue({
        maxDepth: 3,
        url: product.baseUrl,
        skipDuplicates: true,
        skipRequestedRedirect: true,
        allowedDomains: [baseUrl.hostname]
      })
      await crawler.onIdle()
      await crawler.close()
    }
  }
}

export async function crawloop(models, params, restartAfter = 86400000) {
  for (const product of products) {
    await models.Product.findOrCreate({
      where: { name: product.name, baseUrl: product.url }
    })
  }
  const looping = async () => {
    const start_crawling_at = new Date()
    const { Op } = models.Sequelize
    await startCrawling(models, params)
    await models.Card.destroy({
      where: {
        updatedAt: {
          [Op.lt]: start_crawling_at
        }
      }
    })
    if (process.env.NODE_ENV !== 'test') setTimeout(() => looping(), restartAfter)
  }

  await looping()
}

export default crawloop
