'use strict'

const crypto = require('crypto')

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

const throwUnauthorizedError = () => {
  const error = new Error('Unauthorized Error')
  error.statusCode = 401
  throw error
}

const cors = (req, domains = CORS.split(',').map(domain => domain.replace('https://', ''))) => {
  const { host = '', origin = '' } = req.headers
  if (!domains.includes(host) && !domains.includes(origin.replace('https://', ''))) {
    throwUnauthorizedError()
  }
}

const access = async req => {
  const [user, id] = credentials(req)
  const encryptedUser = await encrypt(user)
  if (encryptedUser !== id) {
    throwUnauthorizedError()
  }
}

module.exports = {
  encrypt,
  credentials,
  cors,
  access
}
