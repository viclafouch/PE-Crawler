import express from 'express'
import { query, param, body } from 'express-validator'
import asyncHandler from 'express-async-handler'
import { validate } from '../shared/helpers'
import { Op } from 'sequelize'
import database from '../../db/models'
import { ANSWERS_PER_PAGE, IS_DEV } from '../shared/constants'

const router = express.Router()

const isValidLocale = async (locale) => {
  const language = await database.Language.findOne({ where: { code: locale } })
  if (language) return Promise.resolve()
  else return Promise.reject(new Error('hl field is not a valid'))
}

const isValidProductsId = async (productsId) => {
  if (!Array.isArray(productsId)) return Promise.reject(new Error('products_id field must be an array'))
  if (productsId.length === 0) return Promise.reject(new Error('products_id field must be not empty'))

  for (const productId of productsId) {
    const product = await database.Product.findByPk(productId)
    if (!product) return Promise.reject(new Error(`Product #${productId} does not exist`))
  }

  return Promise.resolve()
}

const paginateAnswers = async ({ where, page }) => {
  const limit = ANSWERS_PER_PAGE
  const count = await database.Answer.count({ where })
  const offset = limit * (page - 1)
  const answers = await database.Answer.findAll({ limit, where, offset })
  const nbPages = Math.ceil(count / limit)
  return { nbPages, answers }
}

router.get('/', asyncHandler(async (req, res) => {
  const nbAnswers = await database.Answer.count()
  const languages = await database.Language.findAll({ attributes: ['code'] })
  const products = await database.Product.findAll({ attributes: ['name'] })
  res.status(200).json({
    nb_answers: nbAnswers,
    locales: languages.map(l => l.code),
    product_names: products.map(p => p.name)
  })
}))

router.post('/', validate([
  body('hl').isLocale().custom(isValidLocale),
  body('page').optional().toInt().isInt({ min: 1 }),
  body('search').optional().isString(),
  body('products_id').custom(isValidProductsId)
]), asyncHandler(async (req, res) => {
  const { hl: locale, page = 1, search, products_id: productsId } = req.body

  const { id: languageId } = await database.Language.findOne({ where: { code: locale } })

  const where = {
    LanguageId: languageId,
    ProductId: {
      [Op.in]: productsId
    },
    ...(search ? { title: { [Op.like]: `%${search}%` } } : null)
  }

  const { nbPages, answers } = await paginateAnswers({ where, page })

  res.status(200).json({
    nb_pages: nbPages,
    page: page,
    answers: answers
  })
}))

router.get('/:product_code', validate([
  query('hl').isLocale().custom(isValidLocale),
  query('page').optional().toInt().isInt({ min: 1 }),
  query('search').optional().isString(),
  param('product_code').isString()
]), asyncHandler(async (req, res) => {
  const { hl: locale, page = 1, search } = req.query
  const { product_code: productCode } = req.params
  const product = await database.Product.findOne({ where: { code: productCode } })

  if (!product) return res.sendStatus(404)

  const { id: languageId } = await database.Language.findOne({ where: { code: locale } })

  const where = {
    LanguageId: languageId,
    ProductId: product.id
  }

  if (search) {
    if (IS_DEV) {
      where.title = {
        [Op.like]: `%${search}%`
      }
    } else {
      where.title = {
        [Op.iLike]: `%${search}%`
      }
    }
  }

  const { nbPages, answers } = await paginateAnswers({ where, page })

  res.status(200).json({
    nb_pages: nbPages,
    page: page,
    locale: locale,
    product_name: product.name,
    answers: answers
  })
}))

export default router
