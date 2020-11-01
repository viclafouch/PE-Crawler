const cheerio = require('cheerio')
const Crawler = require('simplecrawler')
const jetpack = require('fs-jetpack')

const languages = [
  {
    code: 'fr',
    name: 'French'
  },
  {
    code: 'en',
    name: 'English'
  }
]

const ALL_THREADS_URL = 'https://support.google.com/youtube/threads'
const DIR_THREADS = jetpack.dir('threads')

for (const language of languages) {
  const url = new URL(ALL_THREADS_URL)
  url.searchParams.set('hl', language.code)
  url.searchParams.set('max_results', 60)
  const crawler = Crawler(url.toString())
    .on('fetchcomplete', (queueItem, buffer) => {
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

      const json = JSON.stringify({ 'last-update': new Date(), threads }, null, 4)
      DIR_THREADS.write(`${language.code}.json`, json, { jsonIndent: 2 })
    })

  crawler.maxDepth = 1
  crawler.start()
}
