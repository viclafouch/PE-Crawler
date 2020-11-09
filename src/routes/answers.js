import express from 'express'
import { query, param } from 'express-validator'
import asyncHandler from 'express-async-handler'
import { validate } from '../shared/helpers'
import { Op } from 'sequelize'
import database from '../../db/models'

const router = express.Router()

export const isValidLocale = async (locale) => {
  const language = await database.Language.findOne({ where: { code: locale } })
  if (language) return Promise.resolve()
  else return Promise.reject(new Error('hl field is not a valid'))
}

const validator = () => validate([
  query('hl').isLocale().custom(isValidLocale),
  query('page').optional().isNumeric().toInt(),
  query('search').optional().isString(),
  param('product_code').isString()
])

router.get('/', asyncHandler(async (req, res) => {
  const nbAnswers = await database.Answer.count()
  const languages = await database.Language.findAll({ attributes: ['code'] })
  const products = await database.Product.findAll({ attributes: ['name'] })
  res.status(200).json({
    nbAnswers: nbAnswers,
    locales: languages.map(l => l.code),
    productNames: products.map(p => p.name)
  })
}))

router.get('/:product_code', validator(), asyncHandler(async (req, res) => {
  const { hl: locale, page = 1, search } = req.query
  const { product_code: productCode } = req.params
  const product = await database.Product.findOne({ where: { code: productCode } })

  if (!product) return res.sendStatus(404)

  const { id: languageId } = await database.Language.findOne({ where: { code: locale } })

  const where = {
    LanguageId: languageId,
    ProductId: product.id,
    ...(search ? { title: { [Op.like]: `%${search}%` } } : null)
  }
  const limit = 10
  const count = await database.Answer.count({ where })
  const offset = limit * (page - 1)

  const answers = await database.Answer.findAll({ limit, where, offset })

  res.status(200).json({
    nbPages: Math.ceil(count / limit),
    page: page,
    locale: locale,
    productName: product.name,
    answers: answers
  })
}))

export default router
