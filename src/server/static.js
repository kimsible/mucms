'use strict'

const { promises: fs } = require('fs')
const { contentType, lookup } = require('mime-types')

let path
const create = cwd => { path = cwd }

const open = async ({ url }) => {
  const match = url.match(new RegExp(`^/[css|js|img|favicon]?`))
  if (match) {
    const filepath = path + (url === '/' ? '/index.html' : url)
    const data = await fs.readFile(filepath)
    return { data, contentType: contentType(lookup(filepath)) }
  }
}

module.exports = {
  create,
  open
}
