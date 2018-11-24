'use strict';

var compose = require('request-compose')
var request = compose.client

module.exports = class ClientFactory {

  constructor(config) {
    //  client library
    this.request = request
    //  default request
    if (typeof(config.defaultReq) !== 'undefined') {
      this.req = (Object.getOwnPropertyNames(config.defaultReq).length) ? config.defaultReq : undefined
    }
  }

  async _sendRequest(req, n=0) {
    try {
      //  Add default request vars
      req = this._getDefaultRequest(req)

      //  Send request
      var {res, body} = await this.request(req)

      //  Return parsed response
      return body

    } catch (err) {
      //  Unauthorized

      //  Retry
      if (n < 4) {
        this._sendRequest(req, n+1)
      }
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

  _checkRequired(config, required=[]) {
    //  Config Vars - required
    required.forEach((propName) => {
      if (typeof(config[propName]) == 'undefined') {
        throw(new Error('Configuration property "'+propName+'"" is required.'))
      } else {
        this[propName] = config[propName]
      }
    })
  }

  _getDefaultRequest(req={}) {
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

    return req
  }

}