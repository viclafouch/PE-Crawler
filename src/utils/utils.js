export const debug = (content, type = 'log') => ['test', 'development'].includes(process.env.NODE_ENV) && console[type](content)
