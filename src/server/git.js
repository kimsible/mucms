'use strict'

const { resolve, extname } = require('path')
const { promises: fs } = require('fs')
const nodegit = require('nodegit')

const { REPO } = process.env

class Git {
  constructor (repo = REPO, path = resolve(__dirname, './repo')) {
    const [, credentials, url] = repo.match(/^https:\/\/(.+)@([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}\/[a-zA-Z0-9-]{3,}\/[a-zA-Z0-9-]{3,})\/?$/)
    const [, username, password] = credentials.match(/^(.+):(.+)/)

    this.path = path
    this.url = url
    this.username = username
    this.password = password
  }

  async open () {
    try {
      this.repo = await nodegit.Repository.open(this.path)
    } catch {
      this.repo = await nodegit.Clone(`https://${this.url}`, this.path)
    }
  }

  async pull () {
    await this.repo.fetchAll()
    await this.repo.mergeBranches('master', 'origin/master')
  }

  async find (extensions = ['.md']) {
    const commit = await this.repo.getMasterCommit()

    const tree = await commit.getTree()
    const entries = await new Promise((resolve, reject) => {
      const walker = tree.walk()
      walker.on('end', entries => { resolve(entries) })
      walker.on('error', reject)
      walker.start()
    })

    // filter files
    const filteredEntries = entries.filter(entry => extensions.includes(extname(entry.path())))

    // open files
    const promises = filteredEntries.map(entry => entry.getBlob().then(blob => {
      return {
        name: entry.name(),
        path: entry.path(),
        data: blob.toString()
      }
    }))

    return Promise.all(promises)
  }

  async commit (files) {
    const index = await this.repo.refreshIndex()
    // write files
    await Promise.all(files.map(file => fs.writeFile(resolve(this.path, file.path), file.data)))

    // add files
    await Promise.all(files.map(file => index.addByPath(file.path)))
    index.write()
    const oid = await index.writeTree()

    // commit staged
    const parent = await this.repo.getMasterCommit()
    const author = nodegit.Signature.now('Author Name', 'mucms')
    const committer = nodegit.Signature.now('Commiter Name', 'mucms')
    return this.repo.createCommit('HEAD', author, committer, 'mucsm-update(*)', oid, [parent])
  }

  async push () {
    let iteration = 0
    const remote = await this.repo.getRemote('origin')
    return remote.push(['refs/heads/master:refs/heads/master'], {
      callbacks: {
        credentials: () => {
          iteration++
          if (iteration > 3) {
            throw new Error()
          }
          return nodegit.Cred.userpassPlaintextNew(this.username, this.password)
        }
      }
    })
  }
}

module.exports = Git
