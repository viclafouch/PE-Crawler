import './shared/console'
import colors from 'colors'
import server from './server'
import { crawlCommunities } from './community'
import { crawlAnswers } from './help-center'

const wait = timeout => new Promise(resolve => setTimeout(resolve, timeout))

server.listen(3000, async () => {
  console.log(colors.debug('Server opened'))

  while (true) {
    console.log(colors.debug('Crawl communities begin'))
    await Promise.race([
      new Promise(resolve => crawlCommunities(resolve))
        .then(() => console.log(colors.debug('Crawl communities finished'))),
      wait(10 * 10 * 6 * 1000) // 10 minutes
        .then(() => console.log(colors.error('Crawl communities is too long')))
    ])
  }
})
