'use strict';

const Oauth = require("./oauth1.js")

require('dotenv').config()

module.exports = class AssetWorker {

  constructor() {
    this.flickr = new Oauth()
    this.processing = false
    this.assets = []
    this.processed = []
    this.page = 0
    this.pages = 0
    this.total = 0
  }

  addAssets(assets) {
    this.assets = this.assets.concat(assets);
    this.cycleAssetQuery()
  }

  async getAssets() {
    //  Call Flickr API
    var res = await this.flickr.request('https://api.flickr.com/services/rest/',
    {
      api_key: process.env.SERVICE_API_KEY,
      method: 'flickr.people.getPhotos',
      format: 'json',
      nojsoncallback: 1,
      user_id: 'me',
      page: this.page,
      per_page: 100,
      extras: 'url_o'
    })

    if (typeof(res.photos.photo) !== 'undefined') {
      if (this.pages == 0) this.pages = res.photos.pages
      if (this.total == 0) this.total = Number(res.photos.total)
      this.addAssets(res.photos.photo)
    //  Retry - TODO limit this
    } else {
      this.getAssets()
    }
  }

  cycleAssetQuery() {
    //  Check if we need to continue querying
    if (this.page < this.pages) {
      this.page++
      this.getAssets()
    //  Otherwise Process results
    } else if (this.assets.length > 0) {
      if (this.total == this.assets.length) {
        console.log('Something is off.  We got '+this.assets.length+' results from Flickr but there should be '+this.total+' results. \n\nProcessing anyway...')
      }
      this.processAssets()
    }
  }

  processAssets() {
    this.processing = this.assets.pop()
    this.downloadAsset()
    this.processed.push(this.processing)
    this.processing = false
    if (this.assets.length > 0) {
      this.processAssets()
    }
  }

  downloadAsset() {
    console.log(this.processing.url_o)
  }

  init() {
    this.page = 1
    this.getAssets()
  }
}

//module.exports = new AssetWorker()