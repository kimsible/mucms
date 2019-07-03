'use strict'

module.exports = req => new Promise((resolve, reject) => {
  let string = ''
  req.setEncoding('utf8')
  req.on('data', chunk => { string += chunk })
  req.on('error', reject)
  req.on('end', () => { resolve(string.trim()) })
})
