const HCCrawler = require('headless-chrome-crawler')

const linksCrolled = []
const baseUrl = 'https://support.google.com/youtube'
const baseUrlAnswer = baseUrl + '/answer'
const baseUrlTopics = baseUrl + '/topic'

const params = {
  maxDepth: 3
}

function getId(url) {
  const { pathname } = new URL(url)
  const id = pathname.slice(pathname.lastIndexOf('/') + 1)
  return parseInt(id, 10)
}

;(async () => {
  const startDate = new Date().getTime()
  try {
    const crawler = await HCCrawler.launch({
      maxRequest: 50,
      preRequest: options => {
        if (
          options.url.startsWith(baseUrlAnswer) ||
          options.url.startsWith(baseUrlTopics) ||
          options.url === baseUrl
        ) {
          if (options.url.startsWith(baseUrlAnswer)) {
            const id = getId(options.url)
            if (linksCrolled.some(e => e.id === id)) return false
          }
          return options
        }
        return false
      },
      evaluatePage: () => ({
        title: $('h1')
          .text()
          .trim()
      }),
      onSuccess: ({ result, options }) => {
        const id = getId(options.url)
        if (!isNaN(id) && options.url.startsWith(baseUrlAnswer)) {
          linksCrolled.push({
            id,
            title: result.title,
            url: baseUrlAnswer + '/' + id
          })
        }
      }
    })
    await crawler.queue({
      ...params,
      url: baseUrl
    })
    await crawler.onIdle()
    await crawler.close()
  } catch (error) {}
  console.log(
    `Get ${linksCrolled.length} after ${Math.round(
      (new Date().getTime() - startDate) / 1000
    ).toFixed(2)} s`
  )
})()
