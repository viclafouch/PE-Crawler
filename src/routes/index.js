import express from 'express'
import CardsRouter from './api/cards'
import ProductsRouter from './api/products'
import ThreadsRouter from './api/threads'
const router = express.Router()

router.use(CardsRouter)
router.use(ProductsRouter)
router.use(ThreadsRouter)

export default router
