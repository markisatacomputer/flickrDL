/**
 *
 *
 *
 *
 */

module.exports = class importRecord {

  constructor(config) {

    //  Required
    var required = ['id', 'userid', 'service']
    required.forEach((propName) => {
      if (typeof(config[propName]) == 'undefined') {
        throw(new Error('Configuration property "'+propName+'"" is required.'))
      } else {
        this[propName] = config[propName]
      }
    })

    // Optional
    Object.getOwnPropertyNames(config).forEach( (name) => {
      if (!required.find(name) && typeof(config[name]) !== 'undefined') {
        this[name] = config[name]
      }
    })

  }

  get createDate() {
    return this._createDate.valueOf()
  }

  set createDate(newDate) {
    if (typeof(newDate) == 'date') {
      this._createDate = newDate
    } else {
      this._createDate = new Date(newDate)
    }
  }

  get tags() {
    return this._tags
  }

  set tags(newTags) {
    if (typeof(newTags) == 'array' && newTags.length>0) {
      this._tags = newTags
    } else if (typeof(newTags) == 'string' && newTags.length>0) {
      this._tags = [newTags]
    }
  }

}
