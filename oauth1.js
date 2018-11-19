'use strict';

var http = require('http')
var nodeUrl = require('url')
var fs = require('fs').promises
var opn = require('opn')
var compose = require('request-compose')
compose.Request.oauth = require('request-oauth')
var request = compose.client

require('dotenv').config()

module.exports = class Oauth1Client {

  constructor() {
    //  Local variables
    this.server = {}
    this.oauth_verifier
    //  Imported configuration variables
    this.callbackProtocol = process.env.CALLBACK_PROTOCOL ? process.env.CALLBACK_PROTOCOL : 'http://'
    this.callbackHost = process.env.CALLBACK_HOST ? process.env.CALLBACK_HOST : 'localhost'
    this.callbackPort = process.env.CALLBACK_PORT ? process.env.CALLBACK_PORT : 3333
    this.callbackPath = process.env.CALLBACK_PATH ? process.env.CALLBACK_PATH : 'oauth_callback'
    this.callbackURL = this.callbackProtocol + this.callbackHost + ':' + this.callbackPort + '/' + this.callbackPath
    this.requestTokenURL = process.env.REQUEST_TOKEN_URL
    this.requestAuthURL = process.env.REQUEST_AUTH_URL
    this.accessTokenURL = process.env.ACCESS_TOKEN_URL
    this.requestTokenVars = (typeof(process.env.REQUEST_TOKEN_VARS) == 'string') ? JSON.parse(process.env.REQUEST_TOKEN_VARS) : undefined
    this.requestAuthVars = (typeof(process.env.REQUEST_AUTH_VARS) == 'string') ? JSON.parse(process.env.REQUEST_AUTH_VARS) : undefined
    this.accessTokenVars = (typeof(process.env.ACCESS_TOKEN_VARS) == 'string') ? JSON.parse(process.env.ACCESS_TOKEN_VARS) : undefined
    this.accessResponseMap = (typeof(process.env.ACCESS_RESPONSE_MAP) == 'string') ? JSON.parse(process.env.ACCESS_RESPONSE_MAP) : undefined
    //  Saved configuration variables
    this.APIKey = process.env.SERVICE_API_KEY
    this.Secret = process.env.SERVICE_SECRET
    this.UserId = process.env.SERVICE_USER_ID
    this.UserName = process.env.SERVICE_USER_NAME
    this.AccessToken = process.env.SERVICE_ACCESS_TOKEN
    this.AccessTokenSecret = process.env.SERVICE_ACCESS_TOKEN_SECRET
  }

  async request(url, query) {
    //  Authenticate
    if (!this.AccessToken || !this.AccessTokenSecret) {
      var auth = await this.authenticate()
    }

    //  Request
    return await this._sendRequest({
      url: url,
      qs: query,
      oauth: {
        consumer_key: this.APIKey,
        consumer_secret: this.Secret,
        token: this.AccessToken,
        token_secret: this.AccessTokenSecret,
      }
    })
  }

  async authenticate() {
    try {
      //  Get request token
      var res = await this._getRequestToken()
      this.AccessToken = res.oauth_token
      this.AccessTokenSecret = res.oauth_token_secret
      //  Request access
      res = await this._requestAccess()
      this.oauth_verifier = res.oauth_verifier
      //  Get Access Token
      res = await this._getAccessToken()
      this.AccessToken = res.oauth_token
      this.AccessTokenSecret = res.oauth_token_secret
      this.server.close()

      //  Save important values to file
      if (typeof(this.accessResponseMap) == 'object') {
        Object.getOwnPropertyNames(this.accessResponseMap).forEach( name => this[this.accessResponseMap[name]] = res[name] )
      }
      return await this._saveAccessVars()

    } catch (err) {
      console.error(err)
    }
  }

  async _getRequestToken() {
    return await this._sendRequest({
      url: this.requestTokenURL,
      qs: { oauth_callback: this.callbackURL },
      oauth: {
        consumer_key: this.APIKey,
        consumer_secret:  this.Secret
      }
    }, this.requestTokenVars)
  }

  _requestAccess() {
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

  async _getAccessToken() {
    //  Request access token
    return await this._sendRequest({
      url: this.accessTokenURL,
      qs: { oauth_verifier: this.oauth_verifier },
      oauth: {
        consumer_key: this.APIKey,
        consumer_secret:  this.Secret,
        token: this.AccessToken,
        token_secret: this.AccessTokenSecret
      }
    }, this.accessTokenVars)
  }

  async _saveAccessVars() {
    await fs.appendFile('.env', "SERVICE_ACCESS_TOKEN='"+this.AccessToken+"'\n")
    await fs.appendFile('.env', "SERVICE_ACCESS_TOKEN_SECRET='"+this.AccessTokenSecret+"'\n")
    if (this.UserId) await fs.appendFile('.env', "SERVICE_USER_ID='"+this.UserId+"'\n")
    if (this.UserName) await fs.appendFile('.env', "SERVICE_USER_NAME='"+this.UserName+"'\n")
  }

  async _sendRequest(req, qVars) {
    try {
      //  Add extra vars
      if (typeof(qVars) == 'object') {
        req.qs = Object.assign(req.qs, qVars)
      }

      //  Send request
      var {res, body} = await request(req)

      //  Return parsed response
      if (typeof(body) == 'string') {
        body = this._parseBody(body)
      }
      return body

    } catch (err) {
      console.error(err)
    }
  }

  _parseBody(body) {
    var vars = {}
    var oauthRes = body.split('&')
    oauthRes.forEach((str) => {
      var v = str.split('=')
      vars[v[0]] = v[1]
    })

    return vars
  }

  _objToQueryString(obj) {
    //  get query var names/values and map to strings
    var queryVars = Object.getOwnPropertyNames(obj).map( name => name+'='+obj[name] )

    return '?'+queryVars.join('&')
  }

}
