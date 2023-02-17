import test from 'brittle'

import Map from '../lib/map.js'

test('map - iterate and wrap to start', (t) => {
  const map = new Map()

  map.set('foo0', 0)
  map.set('boo0', 1)
  map.set('aoo0', 2)

  t.alike(
    [map.next(), map.next(), map.next(), map.next()],
    [0, 1, 2, 0]
  )
})

test('map - handle addition and deletion', (t) => {
  const map = new Map()

  map.set('foo0', 0)
  map.set('foo1', 1) // [0, 1]
  // ^       (_offset = -1)
  t.is(map.next(), 0) // _^
  t.is(map.next(), 1) //   __^

  // Add item at the end
  map.set('foo2', 2) // [0, 1, 2]
  t.is(map.next(), 2) //      __^

  // should not wrap when the pointer is at the end, if you set more values.
  map.set('foo3', 3) // [0, 1, 2, 3]
  t.is(map.next(), 3) //         __^

  // Delete item _after_ the pointer
  map.set('foo4', 4) // [0, 1, 2, 3, 4]
  map.set('foo5', 5) // [0, 1, 2, 3, 4, 5]
  map.delete('foo2') // [0, 1, 3, 4, 5]
  t.is(map.next(), 4) //           ^

  // Delete item _at_ the pointer
  // [0, 1, 3, 4, 5]
  map.delete('foo4') // [0, 1, 3, 5]
  t.is(map.next(), 5) //         __^

  // Deleting item _before_ the pointer
  map.delete('foo3') // [0, 1, 5]
  t.is(map.next(), 0) // __^          __/wrap/
})
