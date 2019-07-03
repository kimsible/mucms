'use strict'

import test from 'ava'

import { request, createServer } from 'http'
import body from '../body'

import { resolve } from 'path'
import { promises as fs } from 'fs'
import { create as createStatic, open as openStatic } from '../static'

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

test('static', staticTest, { url: '/img/logo.1234.png', contentType: 'image/png' })

async function staticTest (t, input) {
  const cwd = resolve(__dirname, '../../../test/fixtures')
  createStatic(cwd)
  const { contentType, data } = await openStatic({ url: input.url })
  t.regex(contentType, new RegExp(input.contentType))
  t.deepEqual(data, await fs.readFile(cwd + input.url))
}
