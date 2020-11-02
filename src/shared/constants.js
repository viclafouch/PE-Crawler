import jetpack from 'fs-jetpack'

const BASE_URL = new URL('https://support.google.com')
const LANGUAGES = jetpack.readAsync('src/shared/data/languages.json', 'json').then(({ languages }) => languages)
const PRODUCTS = jetpack.readAsync('src/shared/data/products.json', 'json').then(({ products }) => products)

export { BASE_URL, LANGUAGES, PRODUCTS }
