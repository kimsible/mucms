'use strict'

const crypto = require('crypto')
const { createError } = require('micro')
const { SALT, CORS = '' } = process.env

const encrypt = (string, salt = SALT) => (new Promise((resolve, reject) => {
  crypto.pbkdf2(string, salt, 100000, 32, 'sha512', (error, data) => {
    if (error) {
      return reject(error)
    }
    return resolve(data.toString('base64'))
  })
}))

const credentials = req => {
  const { authorization = '' } = req.headers
  try {
    const [, base64Credentials] = authorization.match(/^Basic (.+)$/)
    return Buffer.from(base64Credentials, 'base64').toString('utf-8').split(':')
  } catch {
    return []
  }
}

const cors = (req, domains = CORS.split(',').map(domain => domain.replace('https://', ''))) => {
  const { host = '', origin = '' } = req.headers
  if (!domains.includes(host) && !domains.includes(origin.replace('https://', ''))) {
    throw createError(401, 'Unauthorized Error')
  }
}

const access = async req => {
  const [user, id] = credentials(req)
  const encryptedUser = await encrypt(user)
  if (encryptedUser !== id) {
    throw createError(401, 'Unauthorized Error')
  }
}

module.exports = {
  encrypt,
  credentials,
  cors,
  access
}
