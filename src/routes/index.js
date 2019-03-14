import express from 'express'
import CardsRouter from './api/cards'
import ProductsRouter from './api/products'
const router = express.Router()

router.use(CardsRouter)
router.use(ProductsRouter)

export default router
