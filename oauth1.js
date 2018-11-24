'use strict';

var compose = require('request-compose')
compose.Request.oauth = require('request-oauth')
var request = compose.client

var ClientFactory = require('./client')

module.exports = class Oauth1Client extends ClientFactory {

  constructor(config) {
    super(config)

    //  Replace default client with oauth extended
    this.request = request

    //  Required
    this._checkRequired(config, ['APIURL', 'APIKey', 'Secret', 'callbackURL', 'requestTokenURL', 'accessTokenURL'])

    //  Optional
    this.AccessToken = (config.AccessToken) ? config.AccessToken : undefined
    this.AccessTokenSecret = (config.AccessTokenSecret) ? config.AccessTokenSecret : undefined
  }

  async query(query) {
    //  Request
    return await this._sendRequest({
      url: this.APIURL,
      qs: query,
      oauth: {
        consumer_key: this.APIKey,
        consumer_secret: this.Secret,
        token: this.AccessToken,
        token_secret: this.AccessTokenSecret,
      }
    })
  }

  /*
  async authenticate() {
    try {
      //  Get request token
      var res = await this._getRequestToken()
      this.AccessToken = res.oauth_token
      this.AccessTokenSecret = res.oauth_token_secret
      this.emit('RequestToken', res)
      //  Request access
      res = await this._requestAccess()
      this.oauth_verifier = res.oauth_verifier
      //  Get Access Token
      res = await this._getAccessToken()
      this.AccessToken = res.oauth_token
      this.AccessTokenSecret = res.oauth_token_secret
      this.UserName = res.username
      this.UserId = res.userid

      //  Save important values to file
      if (typeof(this.accessResponseMap) == 'object') {
        Object.getOwnPropertyNames(this.accessResponseMap).forEach( name => this[this.accessResponseMap[name]] = res[name] )
      }
      return await this._saveAccessVars()

    } catch (err) {
      console.error(err)
    }
  }
  */

  async getRequestToken() {
    //  request
    var res = await this._sendRequest({
      url: this.requestTokenURL,
      qs: { oauth_callback: this.callbackURL },
      oauth: {
        consumer_key: this.APIKey,
        consumer_secret:  this.Secret
      }
    }, this.requestTokenVars)
    //  save
    this.AccessToken = res.oauth_token
    this.AccessTokenSecret = res.oauth_token_secret

    return res
  }

  /*
  _requestAccessURL() {
    //  Prepare server to  recieve access callback
    var oauthClient = this
    return new Promise( (resolve, reject) => {
      oauthClient.server = http.createServer( (request, response) => {
        var urlObj = nodeUrl.parse(request.url, true)
        if (urlObj.pathname = '/'+oauthClient.callbackPath) {
          response.writeHeader(200, {"Content-Type": "text/html"})
          response.write("<h1> Almost there! </h1><p>Monitor progress with console...</p>")
          response.end()

          resolve( urlObj.query )
        }
      }).listen(3333, oauthClient.callbackHost)

      //  Build access request query vars
      var query = { oauth_token: oauthClient.AccessToken }
      if (typeof(oauthClient.requestAuthVars) == 'object') query = Object.assign(query, oauthClient.requestAuthVars)
      query = oauthClient._objToQueryString(query)

      //  Request access in browser
      opn(oauthClient.requestAuthURL+query)
    })
  }
  */

  async getAccessToken(oauth_verifier) {
    //  Request access token
    var res = await this._sendRequest({
      url: this.accessTokenURL,
      qs: { oauth_verifier: oauth_verifier },
      oauth: {
        consumer_key: this.APIKey,
        consumer_secret:  this.Secret,
        token: this.AccessToken,
        token_secret: this.AccessTokenSecret
      }
    }, this.accessTokenVars)
    //  Save
    this.AccessToken = res.oauth_token
    this.AccessTokenSecret = res.oauth_token_secret

    return res
  }

}
