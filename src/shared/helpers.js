export const isUrl = string => {
  const regexp = /^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!-/]))?/
  return regexp.test(string)
}

export const relativePath = (hrefAbsolute, currentLink) => {
  try {
    return new URL(hrefAbsolute, currentLink).href
  } catch (error) {
    return null
  }
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
