import express from 'express'
import asyncHandler from 'express-async-handler'
import database from '../../db/models'

const router = express.Router()

router.get('/', asyncHandler(async (req, res) => {
  const languages = await database.Language.findAll()
  return res.status(200).json({ languages: languages })
}))

export default router
