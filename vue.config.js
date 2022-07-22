module.exports = {
  publicPath: process.env.NODE_ENV === 'production'
    ? '/csv2gpx/'
//    ? 'https://cdn.jsdelivr.net/gh/cubarco/csv2gpx@gh-pages/'
    : '/'
}
