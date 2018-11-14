class AssetWorker {

  constructor() {
    this.flickr
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

  getAssets() {
    //  Call Flickr API
    this.flickr.people.getPhotos({
      api_key: process.env.FLICKR_API_KEY,
      user_id: 'me',
      authenticated: true,
      page: this.page,
      per_page: 100,
      extras: 'url_o'
    }, (err, result) => {
      //  Store results
      if (err) console.log(err)
      if (result.photos.photo) {
        if (this.pages == 0) this.pages = result.photos.pages
        if (this.total == 0) this.total = Number(result.photos.total)
        this.addAssets(result.photos.photo)
      //  Retry - TODO limit this
      } else {
        this.getAssets()
      }
    })
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

  init(flickr) {
    this.flickr = flickr
    this.page = 1
    this.getAssets()
  }
}

module.exports = new AssetWorker()