'use strict';

const Progress = require('progress')
const Oauth = require("./oauth1.js")
const importRecord = require('./record.js')
const EventEmitter = require('events')
const request = require('request-compose').stream

module.exports = class Flickr extends EventEmitter {

  constructor(config) {
    super(config)

    this.flickr = new Oauth({
      APIURL: 'https://api.flickr.com/services/rest/',
      APIKey: config.apiKey,//process.env.FLICKR_API_KEY,
      Secret: config.secret,//process.env.FLICKR_SECRET,
      AccessToken: (config.accessToken) ? config.accessToken : undefined,
      AccessTokenSecret: (config.accessTokenSecret) ? config.accessTokenSecret : undefined,
      callbackURL: config.callbackURL,
      requestTokenURL: 'https://www.flickr.com/services/oauth/request_token',
      accessTokenURL: 'https://www.flickr.com/services/oauth/access_token',
      defaultReq: {
        qs: {
          api_key: config.apiKey,
          format: 'json',
          nojsoncallback: 1
        }
      }
    })
    this.page = 0
    this.pages = 0
    this.per_page = 100
    this.total = 0
  }

  async requestAccess() {
    var res = await this.flickr._getRequestToken()
    return 'https://www.flickr.com/services/oauth/authorize?perms=read&oauth_token='+res.oauth_token
  }

  async getAccessToken(oauth_verifier) {
    return await this.flickr._getAccessToken(oauth_verifier)
  }

  async getAllRecords() {
    var flickr = this
    //  Call Flickr API
    var res = await this.flickr.request({
      method: 'flickr.people.getPhotos',
      user_id: 'me',
      page: this.page,
      per_page: this.per_page,
      extras: 'url_o'
    })

    //  Emit each record imported
    if (typeof(res.photos.photo) !== 'undefined') {
      if (this.pages == 0) this.pages = res.photos.pages
      if (this.total == 0) this.total = Number(res.photos.total)
      this.res.photos.photo.forEach((photo) => {
        var record = new importRecord({
          id: photo.id,
          service: 'Flickr',
          title: photo.title,
          description: photo.description,
          url: photo.url_o
        })
        flickr.emit('recordCreate', record)
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

    var info = await this.flickr.query({
      method: 'flickr.photos.getInfo',
      photo_id: record.id,
    })
    var exif = await this.flickr.query({
      method: 'flickr.photos.getExif',
      photo_id: record.id,
    })
    var context = await this.flickr.query({
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

    return record
  }

  /**
   *   Return pipe of asset original file
   * @param  {[type]} record [description]
   * @return {[type]}        [description]
   */
  async getRecordFile(record, destination) {
    var flickrFilename = record.url.split('/').pop()

    //  Get file
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
    res.on('close', (ar) => {
      return ar
    })
    //    - write
    res.pipe(destination)
  }

}
