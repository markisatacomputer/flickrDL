'use strict';

var fs = require('fs')
var Client = require('./jsonToken')

var exports = class HMM {
  constructor(config) {
    //  Config Vars - required
    var required = ['username', 'password']
    required.forEach((propName) => {
      if (typeof(config[propName]) == 'undefined') {
        throw(new Error('Configuration property "'+propName+'"" is required.'))
      } else {
        this[propName] = config[propName]
      }
    })

    this.existing = []
    this.assetPath = './storage'
    this.hmm = new Client({
      serviceURL: 'http://api.hmm.com:8666',//'https://api.homemademess.com',
      authPath: '/auth/local',
      username: this.username,
      password: this.password,
      request: {
        headers: {
          'Origin': 'https://homemademess.com'
        }
      }
    })

  }

  async updateFromRecord(record) {
    if ( typeof(record._id) !== 'undefined' ) {
      return await this.hmm.patch('/images', record)
    }
  }

  async createFromRecord(record) {
    if ( typeof(record._id) == 'undefined' ) {
      return await this.hmm.post('/images', record)
    }
  }

  async query(query) {
    var res = await this.hmm.query('/images', query)
  }

  async init() {
    var assets = fs.readdirSync(this.assetPath)
    //flickr.forEach(this.checkForOrig)
    var asset = assets.shift()

    while (assets.length > 0) {
      asset = assets.shift()
      await this.flickrUpdateExisting(asset)
    }
    console.log(this.matches.length)
    //flickr.forEach(this.checkForOrig)
  }


  async flickrUpdateExisting(filePath) {
    var imgData, imgPath, extPos, createDate

    //  if json, get started
    extPos = filePath.search('.json')
    if (extPos > 0) {
      //  Load image data
      imgData = fs.readFileSync(this.assetPath+'/'+filePath)
      imgData = JSON.parse(imgData)
      //  Extract image path
      imgPath = this.assetPath+'/'+filePath.slice(0,extPos)

      //  Use create date to check for image since flickr doesnt store original file names
      createDate = Date.parse(imgData.dates.taken)
      var res = await this.hmm.query('/images', {
        start: createDate-500,
        end: createDate+500,
        per: 1
      })
      //  Store matches
      if (res.filter.pagination.count == 1) {
        this.matches.push({
          id: res.images[0]._id,
          filename: res.images[0].filename,
          derivative: res.images[0].derivative[0],
          localFile: imgPath,
          data: imgData
        })
      }
    }
  }
}
