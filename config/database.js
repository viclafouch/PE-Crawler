require('dotenv').config()
module.exports = {
  development: {
    dialect: 'sqlite',
    host: 'localhost',
    storage: './db.development.sqlite',
    database: 'database_development'
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:'
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
}
