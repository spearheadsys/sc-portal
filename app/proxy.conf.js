module.exports = {
  '/api': {
    target: 'https://localhost:8443',
    secure: false,
    pathRewrite: {'^/api': ''},
    logLevel: 'debug'
  }
}