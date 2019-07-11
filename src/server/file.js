'use strict'

const { promises: fs, createReadStream } = require('fs')

const throwNotFoundError = () => {
  const error = new Error('Not Found')
  error.statusCode = 404
  throw error
}

module.exports.open = async ({ url }, path = process.cwd()) => {
  if (url === '/') {
    return createReadStream(path + '/index.html')
  }
  if (/^\/css|js|img|favicon/.test(url)) {
    const filepath = path + url
    try {
      await fs.access(filepath)
      return createReadStream(filepath)
    } catch {
      throwNotFoundError()
    }
  }
  throwNotFoundError()
}
