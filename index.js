const express = require('express')
const languagesData = require('./languages.json')
const answersData = require('./answers.json')
const productsData = require('./products.json')

const { languages } = languagesData
const { products } = productsData
const { answers } = answersData

const app = express()

app.use(express.json())

app.get('/languages', (req, res) => {
  return res.status(200).json({ languages })
})

app.get('/products', (req, res) => {
  return res.status(200).json({ products })
})

app.post(
  '/answers',
  (req, res) => {
    const { hl: locale, search, products_id: productsId } = req.body

    const { id: languageId } = languages.find(
      language => language.code === locale
    )

    const answerResult = answers.filter(answer => {
      return (
        answer.LanguageId === languageId &&
        productsId.includes(answer.ProductId) &&
        (!search || answer.title.indexOf(search) !== -1)
      )
    })

    res.status(200).json({
      answers: answerResult
    })
  }
)

// Initialize server
app.listen(5000, () => {
  console.log('Running on port 5000.')
})

module.exports = app
