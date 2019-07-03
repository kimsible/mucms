'use strict'

import test from 'ava'
import { request, createServer } from 'http'

import body from '../body'

test('body', bodyTest, 'my-body', 'my-body')

async function bodyTest (t, input, expected) {
  const server = createServer(async (req, res) => {
    try {
      res.end(await body(req))
    } catch (err) {
      res.end(err.contructor.name)
    }
  }).listen()

  const res = await new Promise((resolve, reject) => {
    const req = request({ port: server.address().port, method: 'POST' }, resolve)
    req.on('error', reject)
    req.write(input)
    req.end()
  })

  t.deepEqual(await body(res), expected)
}
