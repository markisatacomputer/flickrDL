'use strict';

const fs = require('fs')
const Progress = require('progress')
const Oauth = require("./oauth1.js")
const request = require('request-compose').stream

require('dotenv').config()

module.exports = class Flickr {

  constructor() {
    this.flickr = new Oauth()
    this.storagePath = process.env.OAUTH_STORAGE_PATH
    this.logPath = this.storagePath+'/flickr.log'
    this.records = []
    this.page = 0
    this.pages = 0
    this.per_page = 100
    this.total = 0

    //  Create storage dir if nonexistant
    if (!fs.existsSync(this.storagePath)){
      fs.mkdirSync(this.storagePath)
    }
  }

  async getAllRecords() {
    var flickr = this
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
      this.res.photos.photo.forEach((photo) => {
        flickr._saveRecord(photo)
      })
    }

    //  Continue
    if (this.page < this.pages) {
      this.page++
      this.getAllRecords()
    }
  }

  async getRecordMeta(record) {
    //  Skip records that already have meta
    if (fs.existsSync(this.storagePath+'/'+record.id+'.meta.json')) return

    var info = await this._sendRequest({
      method: 'flickr.photos.getInfo',
      photo_id: record.id,
    })
    var exif = await this._sendRequest({
      method: 'flickr.photos.getExif',
      photo_id: record.id,
    })
    var context = await this._sendRequest({
      method: 'flickr.photos.getAllContexts',
      photo_id: record.id,
    })
    var meta = {
      description: info.photo.description._content,
      tags: info.photo.tags,
      notes: info.photo.notes,
      originalformat: info.photo.originalformat,
      dates: info.photo.dates,
      exif: exif.photo.exif,
      context: context
    }

    //  Get info and write
    record = Object.assign(record, info)
    this._saveRecord(record, 'meta')

    return record
  }

  async getRecordImagefile(record) {
    var flickrFilename = record.url_o.split('/').pop()
    var storageFilename = this.storagePath+'/'+flickrFilename
    //  Skip files that already exist in storage
    if (fs.existsSync(storageFilename)) return

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

    //  return path to image file
    return storageFilename
  }

  _loadRecords(ext='') {
    var filepaths = fs.readdirSync(this.assetPath)
    return filepaths.filter((filePath) => {
      var match = filepath.search('.'+ext+'.')
      if (ext.length>0) { return match } else { return !match }
    })
  }

  _loadRecord(id, ext='') {
    var storage = this._getRecordPath(id, ext)
    var record = JSON.parse( fs.readFileSync(storage) )
  }

  _saveRecord(record, ext='') {
    var storage = this._getRecordPath(id, ext)
    fs.writeFileSync(storage, JSON.stringify(record, null, '\t'))
  }

  _getRecordPath(id, ext='') {
    var storage = this.storagePath+'/'+record.id
    if (ext.length > 0) storage += '.'+ext
    storage += '.json'

    return storage
  }

  _log(op) {
    fs.writeFileSync(
      this.logPath,
      JSON.stringify({
        operation: op,
        date: Date.now(),
        total: this.assets.length
      })
    )
  }

  async _sendRequest(req) {
    req.api_key = process.env.OAUTH_SERVICE_API_KEY
    req.format = 'json'
    req.nojsoncallback = 1

    return await this.flickr.request('https://api.flickr.com/services/rest/', req)
  }

}
