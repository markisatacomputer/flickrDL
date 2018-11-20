'use strict';

const fs = require('fs')
const Progress = require('progress')
const Oauth = require("./oauth1.js")
const request = require('request-compose').stream

require('dotenv').config()

module.exports = class AssetWorker {

  constructor() {
    this.flickr = new Oauth()
    this.storagePath = process.env.OAUTH_STORAGE_PATH
    this.processing = false
    this.assets = []
    this.processed = []
    this.page = 0
    this.pages = 0
    this.per_page = 100
    this.total = 0
  }

  async init() {
    console.log("Getting image data from Flickr API.\n")
    this.callAssetQuery()
  }

  storeAssetData(assets) {
    this.assets = this.assets.concat(assets);
    this.cycleAssetQuery()
  }

  async callAssetQuery() {
    //  Call Flickr API
    var res = await this._sendRequest({
      method: 'flickr.people.getPhotos',
      user_id: 'me',
      page: this.page,
      per_page: this.per_page,
      extras: 'url_o'
    })

    if (typeof(res.photos.photo) !== 'undefined') {
      if (this.pages == 0) this.pages = res.photos.pages
      if (this.total == 0) this.total = Number(res.photos.total)
      this.storeAssetData(res.photos.photo)
    }
  }

  cycleAssetQuery() {
    //  Check if we need to continue querying
    if (this.page < this.pages) {
      this.page++
      this.callAssetQuery()

    //  Otherwise Process results
    } else if (this.assets.length > 0) {
      this.total = this.assets.length
      this.processAssets()
    }
  }

  async processAssets() {
    this.processing = this.assets.pop()
    await this.downloadAsset()
    this.processed.push(this.processing)
    this.processing = false
    if (this.assets.length > 0) {
      this.processAssets()
    } else {
      this.finalChecks()
    }
  }

  finalChecks() {
    console.log("Running a final check that all original files have been downloaded.\n")

    var problems = []
    var flickr = this
    this.processed.forEach((image) => {
      var flickrFilename = image.url_o.split('/').pop()
      var storageFilename = flickr.storagePath+'/'+flickrFilename
      var jsonFilename = storageFilename+'.json'
      if (!fs.existsSync(storageFilename) || !fs.existsSync(jsonFilename)) {
        flickr.push(image)
      }
    })

    if (problems.length > 0) {
      console.log("There are "+problems.length+" out of "+this.total+"that didn't get downloaded.  Here they are:\n")
      console.log(problems)
    }
  }

  async getAssetInfo(pid) {
    var info = await this._sendRequest({
      method: 'flickr.photos.getInfo',
      photo_id: pid,
    })
    var exif = await this._sendRequest({
      method: 'flickr.photos.getExif',
      photo_id: pid,
    })
    return {
      description: info.photo.description._content,
      tags: info.photo.tags,
      notes: info.photo.notes,
      originalformat: info.photo.originalformat,
      dates: info.photo.dates,
      exif: exif.photo.exif
    }
  }

  async downloadAsset() {
    //  Create storage dir if nonexistant
    if (!fs.existsSync(this.storagePath)){
      fs.mkdirSync(this.storagePath)
    }

    //  Get filename and storage path
    var flickrFilename = this.processing.url_o.split('/').pop()
    var storageFilename = this.storagePath+'/'+flickrFilename
    //  Skip files that already exist in storage
    if (fs.existsSync(storageFilename)) return

    //  Get info and write
    var info = await this.getAssetInfo(this.processing.id)
    info = Object.assign(this.processing, info)
    await fs.promises.writeFile(storageFilename+'.json', JSON.stringify(info, null, '\t') )

    //  Get file
    var original = fs.createWriteStream(this.storagePath+'/'+flickrFilename)
    var {res, body} = await request({
      method: 'GET',
      url: this.processing.url_o,
    })
    //    - update progress
    var len = parseInt(res.headers['content-length'], 10)
    var cur = Number(this.processed.length)+1
    this.fileProgress = new Progress('  downloading '+flickrFilename+' ('+cur+' of '+this.total+') [:bar] :rate/bps :percent :etas',
    {
      total: len,
      complete: '=',
      incomplete: ' ',
      width: 20,
      clear: true
    })
    res.on('data', (chunk) => {
      this.fileProgress.tick(chunk.length)
    })
    //    - write
    res.pipe(original)
  }

  async _sendRequest(req) {
    req.api_key = process.env.OAUTH_SERVICE_API_KEY
    req.format = 'json'
    req.nojsoncallback = 1

    return await this.flickr.request('https://api.flickr.com/services/rest/', req)
  }

}
