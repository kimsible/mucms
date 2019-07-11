const EndWebpackPlugin = require('end-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  configureWebpack: {
    plugins: [
      new CopyWebpackPlugin([{
        from: '*.js',
        to: 'server/',
        context: 'src/server'
      }]),
      new EndWebpackPlugin(() => {
        const { engines, dependencies } = require('./package.json')
        require('fs').writeFileSync('./dist/package.json', JSON.stringify({ engines, dependencies, main: 'server', scripts: { start: 'micro -l tcp://${HOST-0.0.0.0}:${PORT-3000}' } }))
      })
    ]
  }
}
