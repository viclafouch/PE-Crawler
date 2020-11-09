import express from 'express'
import { query, param } from 'express-validator'
import asyncHandler from 'express-async-handler'
import { validate } from '../shared/helpers'
import database from '../../db/models'

const router = express.Router()

export const isValidLocale = async (locale) => {
  const language = await database.Language.findOne({ where: { code: locale } })
  if (language) return Promise.resolve()
  else return Promise.reject(new Error('hl field is not a valid'))
}

const validator = () => validate([
  query('hl').isLocale().custom(isValidLocale),
  param('product_code').isString()
])

router.get('/', asyncHandler(async (req, res) => {
  const nbThreads = await database.Thread.count()
  const languages = await database.Language.findAll({ attributes: ['code'] })
  const products = await database.Product.findAll({ attributes: ['name'] })
  res.status(200).json({
    nbThreads: nbThreads,
    locales: languages.map(l => l.code),
    productNames: products.map(p => p.name)
  })
}))

router.get('/:product_code', validator(), asyncHandler(async (req, res) => {
  const { hl: locale } = req.query
  const { product_code: productCode } = req.params
  const product = await database.Product.findOne({ where: { code: productCode } })

  if (!product) return res.sendStatus(404)

  const { id: languageId } = await database.Language.findOne({ where: { code: locale } })

  const threads = await database.Thread.findAll({
    where: {
      LanguageId: languageId,
      ProductId: product.id
    }
  })
  const firstThread = threads.length > 0 ? threads[0] : null

  res.status(200).json({
    last_update: firstThread ? firstThread.createdAt : new Date(),
    locale: locale,
    product_name: product.name,
    threads: threads
  })
}))

export default router
