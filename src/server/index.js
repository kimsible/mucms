'use strict'

// const { Server } = require('http')
const micro = require('micro')
const auth = require('./auth')
const file = require('./file')
const Git = require('./git')
const mailer = require('./mailer')

// const { PORT, HOST, NODE_ENV } = process.env

const methods = { GET: () => {}, POST: {} }

const router = {
  get: event => { methods.GET = event },
  post: (url, event) => { methods.POST[url] = event },
  listener: async req => {
    auth.cors(req)
    if (!methods[req.method]) throw micro.createError(405, 'Method Not Allowed')
    if (req.method === 'GET') return methods.GET(req)
    await auth.access(req)
    if (!methods.POST[req.url]) throw micro.createError(404, 'Not Found')
    return methods.POST[req.url](req)
  }
}

router.get(req => file.open(req))

router.post('/open', async () => {
  const repo = new Git()
  await repo.open()
  await repo.pull()
  return repo.find()
})

router.post('/encrypt', async req => {
  const user = await micro.text(req)
  return auth.encrypt(user)
})

router.post('/save', async req => {
  const files = await micro.json(req)
  const repo = new Git()
  await repo.open()
  await repo.pull()
  await repo.commit(files)
  await repo.push()
})

router.post('/mail', async req => {
  const message = await micro.json(req)
  mailer(message).catch(err => process.stderr.write(err))
})

module.exports = router.listener

/* const server = new Server(micro(router.listener))

server.listen(PORT, HOST, () => {
  NODE_ENV !== 'test' && process.stdout.write(`Server listening on port ${server.address().port}\n`)
})

module.exports = server */
