'use strict'

import test from 'ava'
import { request, createServer } from 'http'
import { resolve } from 'path'
import { promises as fs } from 'fs'
import { exec } from 'child_process'

import body from '../body'

import { create as createStatic, open as openStatic } from '../static'

import auth from '../auth'

import Git from '../git'

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

test('static - image.png', staticTest, { url: '/img/logo.1234.png', contentType: 'image/png' })
test('static - index.html', staticTest, { url: '/', contentType: 'text/html' })

async function staticTest (t, input) {
  const cwd = resolve(__dirname, '../../../test/fixtures')
  createStatic(cwd)
  const { contentType, data } = await openStatic({ url: input.url })
  t.regex(contentType, new RegExp(input.contentType))
  t.deepEqual(data, await fs.readFile(cwd + (input.url === '/' ? '/index.html' : input.url)))
}

test('auth/encrypt - with salt', authEncryptTest, 'email@provider.com', 'salt')

async function authEncryptTest (t, input, salt) {
  const encrypted = await auth.encrypt(input, salt)
  t.not(encrypted, input)
}

test('auth/credentials - OK', authCredentialsTest, `Basic ${Buffer.from('user@provider.com:GwJexPcIEeAnPTtH091ynxodjXCo86/j').toString('base64')}`, { email: 'user@provider.com', id: 'GwJexPcIEeAnPTtH091ynxodjXCo86/j' })
test('auth/credentials - wrong header', authCredentialsTest, `${Buffer.from('user@provider.com:GwJexPcIEeAnPTtH091ynxodjXCo86/j').toString('base64')}`, { email: undefined, id: undefined })

function authCredentialsTest (t, input, output) {
  const [email, id] = auth.credentials({
    headers: {
      authorization: input
    }
  })
  t.is(email, output.email)
  t.is(id, output.id)
}

const repoPath = '/tmp/repo'
const repoConnectionUrl = 'https://kimsible:password@github.com/kimsible/mucms'
test('git constructor', gitConstructorTest, 'kimsible', 'password', 'github.com/kimsible/mucms')
test('git constructor - email user and password with @ and :', gitConstructorTest, 'kimsible@domain.com', 'pass@pass@@:', 'github.com/kimsible/mucms')

function gitConstructorTest (t, username, password, url) {
  const repo = new Git(`https://${username}:${password}@${url}`, repoPath)
  t.is(repo.username, username)
  t.is(repo.password, password)
  t.is(repo.url, url)
}

test.before(async t => {
  const repo = new Git(repoConnectionUrl, repoPath)
  await repo.open()
  await repo.pull()
})

test('git open', async t => {
  t.is(await fs.access(repoPath), undefined)
})

test('git find', async t => {
  const repo = new Git(repoConnectionUrl, repoPath)
  await repo.open()
  const files = await repo.find(['.md'])
  t.true(files.length > 0)
  const file = files.find(file => file.name === 'README.md')
  t.is(typeof file, 'object')
  t.is(file.name, 'README.md')
  t.is(file.path, 'README.md')
  t.is(file.data, await fs.readFile(resolve(repoPath, 'README.md'), 'utf8'))
})

test('git commit and push', async t => {
  const file = {
    name: 'testcommit&push',
    path: 'testcommit&push',
    data: 'commit&push test'
  }
  const repo = new Git(repoConnectionUrl, repoPath)
  await repo.open()
  const oid = await repo.commit([file])
  t.is(typeof oid, 'object')
  t.is(oid.constructor.name, 'Oid')
  t.is(await fs.access(resolve(repoPath, 'testcommit&push')), undefined)
  t.is(await fs.readFile(resolve(repoPath, 'testcommit&push'), 'utf8'), file.data)
  await t.throwsAsync(repo.push(), Error)
})

test.after.always(async t => {
  await exec(`rm -Rf ${repoPath}`)
})
