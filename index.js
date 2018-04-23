const dotProp = require('dot-prop')

function isReferenceInQuery(query, reference) {
  if (dotProp.has(query, reference)) {
    return true
  }
  if (typeof query[reference] !== 'undefined') {
    return true
  }
  return query.$set && typeof query.$set[reference] !== 'undefined'
}

function trackProperties(schema, properties) {
  properties.forEach(({ ref, definition, onUpdate }) => {
    const [property] = Object.keys(definition)

    if (!schema.path(property)) {
      schema.add(definition)
    }

    schema.pre('save', function preSave(next) {
      if (this.isModified(ref)) {
        this[property] = onUpdate()
      }
      next()
    })

    schema.pre('findOneAndUpdate', function preFindOneAndUpdate(next) {
      if (isReferenceInQuery(this.getUpdate(), ref)) {
        this.findOneAndUpdate({}, { [property]: onUpdate() })
      }
      next()
    })

    schema.pre('update', function preUpdate(next) {
      if (isReferenceInQuery(this.getUpdate(), ref)) {
        this.update({}, { [property]: onUpdate(this) })
      }
      next()
    })
  })
}

function trackPlugin(schema, options) {
  const o = options
  const updatedAt = typeof o.updatedAt === 'undefined' ? 'updatedAt' : o.updatedAt
  const createdAt = typeof o.createdAt === 'undefined' ? 'createdAt' : o.createdAt
  const properties = options.properties || []

  trackProperties(schema, properties)

  if (!updatedAt && !createdAt) {
    return
  }

  if (updatedAt && !schema.path(updatedAt)) {
    schema.add({ [updatedAt]: { type: Date } })
  }
  if (createdAt && !schema.path(createdAt)) {
    schema.add({ [createdAt]: { type: Date } })
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
