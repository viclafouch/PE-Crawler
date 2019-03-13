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
    orm.Card.destroy({
      where: {
        updatedAt: {
          [Op.lt]: start_crawling
        }
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
