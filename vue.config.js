module.exports = {
  publicPath: process.env.NODE_ENV === 'production'
    ? 'https://cdn.jsdelivr.net/gh/cubarco/csv2gpx@gh-pages/'
    : '/'
}
