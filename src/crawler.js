import { products, languages } from './constants'
import Crawler from './crawlsite'
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
    return pathname.includes('/answer') || pathname.includes('/topic')
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

export const addOrUpdateCards = async ({ url, result, product, models, lang }) => {
  try {
    const { title, description } = result
    const uuid = getUuid(url)
    if (isNaN(uuid) || !url.includes('/answer/')) return

    const datas = {
      uuid,
      title,
      description,
      lang,
      url: product.baseUrl + '/answer/' + uuid
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
    return false
  }
}

const collectContent = $ => {
  const title = $('h1').text() || ''
  const description = $('meta[name=description]').attr('content') || ''
  return {
    title,
    description
  }
}

export async function startCrawling(models, options) {
  const products = await models.Product.findAll()
  for (const lang of languages) {
    for (const product of products) {
      await Crawler.launch({
        url: product.baseUrl,
        titleProgress: `Crawling ${product.name} product in ${lang}`,
        sameOrigin: true,
        maxRequest: 4,
        skipStrictDuplicates: true,
        preRequest: url => isRequestValid({ url, product, lang }),
        evaluatePage: $ => collectContent($),
        onSuccess: ({ result, url }) => addOrUpdateCards({ result, url, lang, models, product }),
        ...options
      })
    }
  }
}

export async function crawloop(models, options, restartAfter = 86400000) {
  for (const product of products) {
    await models.Product.findOrCreate({
      where: { name: product.name, baseUrl: product.url }
    })
  }
  const looping = async () => {
    const startCrawlingAt = new Date()
    debug(`Start crawling at ${startCrawlingAt}`)
    const { Op } = models.Sequelize
    await startCrawling(models, options)
    const finishedCrawlingAt = new Date()
    debug(`Finish crawling at ${startCrawlingAt}`)
    debug(`Crawling finished after ${(finishedCrawlingAt - startCrawlingAt) / 1000} seconds`)
    await models.Card.destroy({
      where: {
        updatedAt: {
          [Op.lt]: startCrawlingAt
        }
      }
    })
    if (process.env.NODE_ENV !== 'test') setTimeout(() => looping(), restartAfter)
  }

  await looping()
}

export default crawloop
