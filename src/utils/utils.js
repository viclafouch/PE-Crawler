export const debug = (content, type = 'log') => process.env.NODE_ENV === 'production' && console[type](content)

export const wait = (amount = 2000) => new Promise(resolve => setTimeout(resolve, amount))
