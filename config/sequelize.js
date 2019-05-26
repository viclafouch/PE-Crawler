module.exports = {
  development: {
    dialect: 'sqlite',
    host: 'localhost',
    operatorsAliases: false,
    sync: { force: false },
    storage: './db.development.sqlite',
    logging: false
  },
  test: {
    dialect: 'sqlite',
    operatorsAliases: false,
    storage: ':memory:'
  },
  production: {
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    host: 'database',
    dialect: 'postgres',
    logging: false
  }
}
