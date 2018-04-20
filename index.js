const dotProp = require('dot-prop')

function isReferenceInQuery(query, reference) {
  if (dotProp.has(query, reference)) {
    return true
  }
  if (typeof query[reference] !== 'undefined') {
    return true
  }
  return query.$set && query.$set[reference] !== 'undefined'
}

function trackProperties(schema, properties) {
  properties.forEach(({ reference, name }) => {
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
      if (isReferenceInQuery(this.getUpdate(), reference)) {
        this.update({}, { [name]: new Date() })
      }
      next()
    })

    schema.pre('update', function preUpdate(next) {
      if (isReferenceInQuery(this.getUpdate(), reference)) {
        this.update({}, { [name]: new Date() })
      }
      next()
    })
  })
}

function trackPlugin(schema, options) {
  const updatedAt =
    options.updatedAt === 'undefined' ? 'updatedAt' : options.updatedAt
  const createdAt =
    options.createdAt === 'undefined' ? 'createdAt' : options.createdAt
  const properties = options.properties || []

  const props = properties.map((option) => ({
    reference: option.reference,
    name: option.name || `${option.reference}UpdatedAt`,
  }))

  trackProperties(schema, props)

  if (!updatedAt && !createdAt) {
    return
  }

  if (updatedAt && !schema.path(updatedAt)) {
    schema.add({ [updatedAt]: { type: Date, index: true } })
  }
  if (createdAt && !schema.path(createdAt)) {
    schema.add({ [createdAt]: { type: Date, index: true } })
  }

  schema.pre('save', function preSave(next) {
    const now = new Date()
    if (this.isNew) {
      if (createdAt) {
        this[createdAt] = now
      }
      if (updatedAt) {
        this[updatedAt] = now
      }
    } else if (updatedAt && this.isModified()) {
      this[updatedAt] = now
    }
    next()
  })

  if (updatedAt) {
    schema.pre('update', function preUpdate(next) {
      this.update({}, { [updatedAt]: new Date() })
      next()
    })

    schema.pre('findOneAndUpdate', function preFindOneAndUpdate(next) {
      this.findOneAndUpdate({}, { [updatedAt]: new Date() })
      next()
    })
  }
}

module.exports = trackPlugin
