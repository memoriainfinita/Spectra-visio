import { expect, test, vi } from 'vitest'
import { createStore } from './store'

test('set with a value or an updater notifies subscribers', () => {
  const store = createStore(1)
  const listener = vi.fn()
  store.subscribe(listener)
  store.set(2)
  store.set((n) => n * 10)
  expect(store.get()).toBe(20)
  expect(listener).toHaveBeenCalledTimes(2)
})

test('setting the same value does not notify', () => {
  const store = createStore('a')
  const listener = vi.fn()
  store.subscribe(listener)
  store.set('a')
  expect(listener).not.toHaveBeenCalled()
})

test('unsubscribe stops notifications', () => {
  const store = createStore(0)
  const listener = vi.fn()
  const unsubscribe = store.subscribe(listener)
  unsubscribe()
  store.set(1)
  expect(listener).not.toHaveBeenCalled()
})
