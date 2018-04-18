function isReferenceInQuery(query, reference) {
  if (typeof query[reference] !== 'undefined') {
    return true
  }
  return query.$set && query.set[reference]
}

function trackPlugin(schema, options) {
  const props = options.map((option) => ({
    reference: option.reference,
    name: option.name || `${option.reference}UpdatedAt`,
  }))

  props.forEach(({ reference, name }) => {
    if (!schema.path(name)) {
      schema.add({ [name]: { type: Date, index: true } })
    }

    schema.pre('save', function preSave(next) {
      if (this.isModified(reference)) {
        this[name] = new Date()
      }
      next()
    })

    schema.pre('findOneAndUpdate', function preFindOneAndUpdate(next) {
      if (isReferenceInQuery(this._update, reference)) {
        this.update({}, { [name]: new Date() })
      }
      next()
    })

    schema.pre('update', function preUpdate(next) {
      if (isReferenceInQuery(this._update, reference)) {
        this.update({}, { [name]: new Date() })
      }
      next()
    })
  })

  if (!schema.methods.touchProperty) {
    schema.methods.touchProperty = function touchProperty(propery, cb) {
      this[propery] = new Date()
      this.save(cb)
    }
  }
}

module.exports = trackPlugin
