'use strict';

var fs = require('fs')
var compose = require('request-compose')
var request = compose.client

module.exports = class JsonTokenClient {
  /**
   *
   * @param  {object} config
   *
   * @return {JsonTokenClient}
   *
   */
  constructor(config) {
    //  Config Vars - required
    var required = ['serviceURL', 'authPath', 'username', 'password']
    required.forEach((propName) => {
      if (typeof(config[propName]) == 'undefined') {
        throw(new Error('Configuration property "'+propName+'"" is required.'))
      } else {
        this[propName] = config[propName]
      }
    })

    //  Config vars - optional
    this.accessTokenPath = (config.accessTokenPath) ? config.accessTokenPath : '.token'
    this.req = (Object.getOwnPropertyNames(config.request).length) ? config.request : undefined

    //  Derived Vars
    this.authURL = this.serviceURL + this.authPath

    //  Saved configuration variables
    if (fs.existsSync(this.accessTokenPath)) {
      this.accessToken = fs.readFileSync(this.accessTokenPath)
    }
  }

  async query(path, query) {
    try {
      //  Request
      return await this._sendRequest({
        url: this.serviceURL + path,
        qs: query
      })
    } catch(err) {
      console.error(err)
    }
  }

  async patch(path, query) {
    try {
      //  Request
      return await this._sendRequest({
        url: this.serviceURL + path,
        method: 'PATCH'
      })
    } catch(err) {
      console.error(err)
    }
  }

  async post(path, query) {
    try {
      //  Request
      return await this._sendRequest({
        url: this.serviceURL + path,
        method: 'POST'
      })
    } catch(err) {
      console.error(err)
    }
  }

  async authenticate() {
    try {
      //  Authenticate
      var res = await this._sendRequest({
        url: this.authURL,
        method: 'POST',
        form: {
          email: this.username,
          password: this.password
        }
      })

      this.AccessToken = res.token
      fs.writeFileSync(this.accessTokenPath, this.AccessToken)

    } catch (err) {
      console.error(err)
    }
  }

  async _sendRequest(req, n=0) {
    //  Authenticate
    if (!this.accessToken) {
      var auth = await this.authenticate()
    }

    try {
      //  Add default request vars
      if (this.req) {
        Object.getOwnPropertyNames(this.req).forEach( (propName) => {
          switch (typeof(this.req[propName])) {
            case 'object':
              if (typeof(req[propName]) == 'object') {
                req[propName] = Object.assign(req[propName], this.req[propName])
              } else if (typeof(req[propName]) == 'undefined') {
                req[propName] = this.req[propName]
              }
              break;

            case 'array':
              if (typeof(req[propName]) == 'array') {
                req[propName] = Array.merge(req[propName], this.req[propName])
              } else if (typeof(req[propName]) == 'undefined') {
                req[propName] = this.req[propName]
              }
              break;

            case 'string':
              if (typeof(req[propName]) == 'undefined') {
                req[propName] = this.req[propName]
              }
              break;
          }
        })
      }

      //  Add Authorization
      if (this.token) {
        if (typeof(req.headers) == 'object') {
          req.headers['Authorization'] = 'Bearer ' + this.token
        } else {
          req.headers = {
            'Authorization': 'Bearer ' + this.token
          }
        }
      }

      //  Send request
      var {res, body} = await request(req)

      //  Return parsed response
      return body

    } catch (err) {
      //  Retry
      /*if (n < 4) {
        this._sendRequest(req, n+1)
      }*/
      console.error(err.message)
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
