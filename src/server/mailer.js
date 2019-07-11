'use strict'

const nodemailer = require('nodemailer')

const { SMTP } = process.env

module.exports = async data => {
  const transport = nodemailer.createTransport(SMTP)
  await transport.verify()
  return transport.sendMail(data)
}
