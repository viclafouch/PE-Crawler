const BASE_URL = new URL('https://support.google.com')

const IS_DEV = process.env.NODE_ENV !== 'production'

export { BASE_URL, IS_DEV }
