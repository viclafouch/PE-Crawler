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

router.get('/:product_code', validator(), asyncHandler(async (req, res) => {
  const { hl: locale, page = 1, search } = req.query
  const { product_code: productCode } = req.params
  const product = await database.Product.findOne({ where: { code: productCode } })

  if (!product) return res.sendStatus(404)

  const { id: languageId } = await database.Language.findOne({ where: { code: locale } })

  const where = {
    LanguageId: languageId,
    ProductId: product.id,
    ...search ? { title: { [Op.like]: `%${search}%` } } : null
  }
  const limit = 10
  const count = await database.Answer.count({ where })
  const offset = limit * (page - 1)

  const answers = await database.Answer.findAll({ limit, where, offset })

  res.status(200).json({
    nb_pages: Math.ceil(count / limit),
    locale: locale,
    product_name: product.name,
    answers: answers
  })
}))

export default router
