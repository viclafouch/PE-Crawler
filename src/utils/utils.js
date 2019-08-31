export const debug = (content, type = 'log') => console[type](content)

export const wait = (amount = 2000) => new Promise(resolve => setTimeout(resolve, amount))
