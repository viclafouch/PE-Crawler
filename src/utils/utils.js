export const debug = (content, type = 'log') => ['test', 'development'].includes(process.env.NODE_ENV) && console[type](content)

export const retryRequest = (request, maxRetry) => (...args) => {
  let retries = 0
  return request(...args).catch(error => {
    if (retries < maxRetry) {
      retries++
      return request(...args)
    } else return Promise.reject(error)
  })
}
