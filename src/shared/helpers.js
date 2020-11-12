import colors from 'colors'
import { validationResult } from 'express-validator'
import './console'

export const isUrl = string => {
  const regexp = /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!-/]))?/
  return regexp.test(string)
}

export const wait = (amount = 1000) => new Promise(resolve => setTimeout(resolve, amount))

export const relativePath = (hrefAbsolute, currentLink) => {
  try {
    return new URL(hrefAbsolute, currentLink).href
  } catch (error) {
    return null
  }
}

export const log = ({ status = 'info', message = '' }) => {
  console.log(colors[status](message))
}

export const getUuid = url => {
  try {
    const { pathname } = new URL(url)
    const uuid = pathname.slice(pathname.lastIndexOf('/') + 1)
    return parseInt(uuid, 10)
  } catch (error) {
    return null
  }
}

export const validate = validations => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)))
    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }

    res.status(400).json({ errors: errors.array() })
  }
}
