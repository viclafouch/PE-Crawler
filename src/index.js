import path from 'path'
import crawler from './crawler'
import { createDatabase } from './orm'

const debug = true

const orm = createDatabase({
  storage: path.join(__dirname, '..', 'database_test.sqlite')
})

async function init() {
  try {
    const start_crawling = new Date()
    await orm.Card.sync({ force: debug })
    await crawler(orm)
    orm.Card.findAll().then(cards => {
      const deprecated = cards.filter(e => e.updateAt.getTime() < start_crawling.getTime())
      for (const card of deprecated) {
        card.destroy()
      }
    })
    setTimeout(() => init(), 1000 * 60 * 60 * 24)
  } catch (error) {
    console.error(error)
  }
}

orm.database
  .authenticate()
  .then(() => init())
  .catch(err => console.error('Unable to connect to the database:', err))
