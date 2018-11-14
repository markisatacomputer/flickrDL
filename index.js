require('dotenv').config()

const Flickr = require("flickrapi")
const FlickrAPIKey = process.env.FLICKR_API_KEY
const FlickrSecret = process.env.FLICKR_SECRET
const FlickUserId = process.env.FLICKR_USER_ID
const FlickrAccessToken = process.env.FLICKR_ACCESS_TOKEN
const FlickrAccessTokenSecret = process.env.FLICKR_ACCESS_TOKEN_SECRET
const flickrOptions = {
  api_key: FlickrAPIKey,
  secret: FlickrSecret,
  user_id: FlickUserId,
  access_token: FlickrAccessToken,
  access_token_secret: FlickrAccessTokenSecret
}

const worker = require("./woker.js")

//  Authenticate and GO
if (FlickrAPIKey && FlickrSecret) {
  Flickr.authenticate(flickrOptions, (error, flickr) => {
    worker.init(flickr)
  })
}
