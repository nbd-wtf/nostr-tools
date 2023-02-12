const { addMatchers } = require('add-matchers')

globalThis.test = globalThis.it

addMatchers({
  toHaveLength: function(value, expectArg) {
    return expectArg.length === value
  },
  toHaveProperty: function(key, value, expectArg) {
    return key in expectArg && expectArg[key] === value
  },
})
