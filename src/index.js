import path from 'path'
import crawler from './crawler'
import { createDatabase } from './orm'

const orm = createDatabase({
  storage: path.join(__dirname, '..', 'database_test.sqlite')
})

async function init() {
  try {
    await crawler(orm)
    setTimeout(() => init(), 1000 * 60 * 60 * 24)
  } catch (error) {
    console.error(error)
  }
}

orm.database
  .authenticate()
  .then(() => init())
  .catch(err => console.error('Unable to connect to the database:', err))
