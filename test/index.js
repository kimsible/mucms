'use strict'

import test from 'ava'
import http from 'http'
import path from 'path'
import { promises as fs } from 'fs'
import mockfs from 'mock-fs'
import {} from 'dotenv/config'
import micro from 'micro'
import server from '../src/server'

const httpServer = new http.Server(micro(server))
httpServer.listen()

const request = options => (new Promise((resolve, reject) => {
  const req = http.request({
    port: httpServer.address().port,
    ...options
  }, resolve)
  req.on('error', reject)
  if (options.body) req.write(options.body)
  req.end()
}))

test.before(async t => {
  const fixtures = path.resolve(__dirname, 'fixtures')
  mockfs({
    [process.cwd() + '/index.html']: await fs.readFile(fixtures + '/index.html')
  })
})

test('server - CORS - origin header', cors, 'origin', `https://${process.env.CORS.split(',')[0]}`, 200)
test('server - CORS - host header', cors, 'host', process.env.CORS.split(',')[1], 200)
test('server - CORS - wrong origin header', cors, 'origin', `https://wrongdomain.com`, 401)
test('server - CORS - wrong host header', cors, 'host', `wrongdomain.com`, 401)

async function cors (t, type, input, output) {
  const res = await request({
    method: 'GET',
    headers: { [type]: input }
  })
  t.is(res.statusCode, output)
}
