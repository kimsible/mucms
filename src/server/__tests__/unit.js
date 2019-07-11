'use strict'

import test from 'ava'
import { resolve } from 'path'
import { promises as fs, createReadStream } from 'fs'
import { exec } from 'child_process'

import file from '../file'
import auth from '../auth'
import Git from '../git'

const cwd = resolve(__dirname, '../../../test/fixtures')

test('file/open - /img/image.png', fileTest, { url: '/img/logo.1234.png' }, createReadStream(cwd + '/img/logo.1234.png'))
test('file/open - /', fileTest, { url: '/' }, createReadStream(cwd + '/index.html'))
test('file/open - /index.html - not found', throwsFileTest, { url: '/index.html' })
test('file/open - /js/file.js - not found', throwsFileTest, { url: '/js/file.js' })

async function fileTest (t, input, output) {
  const data = await file.open({ url: input.url }, cwd)
  t.is(data.constructor.name, output.constructor.name)
}

async function throwsFileTest (t, input) {
  await t.throwsAsync(file.open({ url: input.url }, cwd), {
    instanceOf: Error,
    message: 'Not Found'
  })
}

test('auth/encrypt - with salt', authEncryptTest, 'email@provider.com', 'salt')

async function authEncryptTest (t, input, salt) {
  const encrypted = await auth.encrypt(input, salt)
  t.not(encrypted, input)
}

test('auth/credentials - OK - app.domain.com', authCredentialsTest, `Basic ${Buffer.from('app.domain.com:GwJexPcIEeAnPTtH091ynxodjXCo86/j').toString('base64')}`, { user: 'app.domain.com', id: 'GwJexPcIEeAnPTtH091ynxodjXCo86/j' })
test('auth/credentials - OK - user@provider.com', authCredentialsTest, `Basic ${Buffer.from('user@provider.com:GwJexPcIEeAnPTtH091ynxodjXCo86/j').toString('base64')}`, { user: 'user@provider.com', id: 'GwJexPcIEeAnPTtH091ynxodjXCo86/j' })
test('auth/credentials - wrong header', authCredentialsTest, `${Buffer.from('user@provider.com:GwJexPcIEeAnPTtH091ynxodjXCo86/j').toString('base64')}`, { user: undefined, id: undefined })

function authCredentialsTest (t, input, output) {
  const [user, id] = auth.credentials({
    headers: {
      authorization: input
    }
  })
  t.is(user, output.user)
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
