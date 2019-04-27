module.exports = {
  development: {
    dialect: 'sqlite',
    host: 'localhost',
    operatorsAliases: false,
    sync: { force: true },
    storage: './db.development.sqlite',
    logging: false
  },
  test: {
    dialect: 'sqlite',
    operatorsAliases: false,
    storage: ':memory:'
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOSTNAME,
    dialect: 'mysql',
    use_env_variable: 'DATABASE_URL'
  }
}
