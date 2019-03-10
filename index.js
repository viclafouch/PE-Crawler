const HCCrawler = require('headless-chrome-crawler')

const linksCrolled = []

const params = {
  maxDepth: 0
}

function getInfosByUrl(url) {
  const { pathname } = new URL(url)
  const id = pathname.slice(pathname.lastIndexOf('/') + 1)
  return {
    id: !isNaN(id) ? id : null,
    url
  }
}

;(async () => {
  const crawler = await HCCrawler.launch({
    preRequest: options => {
      return linksCrolled.some(e => options.url === e.url) ? false : options
    },
    evaluatePage: () => ({
      title: $('h1').text()
    }),
    onSuccess: async result => {
      const { title } = result.result
      try {
        linksCrolled.push({
          ...getInfosByUrl(result.options.url),
          title
        })
        const links = result.links.filter(
          link =>
            link.startsWith('https://support.google.com/youtube/topic/') ||
            link.startsWith('https://support.google.com/youtube/answer/')
        )
        for (const link of links) {
          await crawler.queue({ url: link })
        }
      } catch (error) {
        console.error(error)
      }
    },
    onError: error => {
      console.log(error)
    }
  })
  await crawler.queue({
    ...params,
    url: 'https://support.google.com/youtube/'
  })
  await crawler.onIdle()
  await crawler.close()
})()
