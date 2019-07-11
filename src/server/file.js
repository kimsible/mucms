'use strict'

const { promises: fs, createReadStream } = require('fs')
const { createError } = require('micro')

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
      throw createError(404, 'Not Found')
    }
  }
  throw createError(404, 'Not Found')
}
