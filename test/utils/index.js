import database from '../../db/models'
import randomstring from 'randomstring'

const getRandomInt = (min, max) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min
}

export const createFakeAnswers = async ({ productId, languageId, number = 1 }) => {
  const answers = []
  for (let index = 0; index < number; index++) {
    answers.push(database.Answer.create({
      title: randomstring.generate(50),
      description: randomstring.generate(200),
      uuid: getRandomInt(1, 1000),
      ProductId: productId,
      LanguageId: languageId
    }))
  }
  return Promise.all(answers)
}

export const createFakeThreads = async ({ productId, languageId, number = 1 }) => {
  const threads = []
  for (let index = 0; index < number; index++) {
    threads.push(database.Thread.create({
      title: randomstring.generate(50),
      description: randomstring.generate(200),
      uuid: getRandomInt(1, 1000),
      ProductId: productId,
      LanguageId: languageId
    }))
  }
  return Promise.all(threads)
}

export const createProduct = (code = 'youtube') =>
  database.Product.create({ name: randomstring.generate(10), code, communityId: getRandomInt(1, 1000) })

export const createLanguage = (code = 'fr') =>
  database.Language.create({ code })

export const isValidDate = (d) => d instanceof Date && !isNaN(d)

export const makeSimpleRequest = (url) => new Promise((resolve, reject) => {
  const https = require('https')
  https.get(url, (response) => {
    let data = ''
    response.on('data', d => {
      data += d
    })
    response.on('end', () => resolve({ data, response }))
  }).on('error', reject)
})
