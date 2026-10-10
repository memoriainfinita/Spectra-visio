import { useSyncExternalStore } from 'react'
import type { Store } from '../core/store'

// `select` must return a stable value (a primitive or a part of the state), not a new object
// on every call: useSyncExternalStore compares snapshots by identity.
export function useStore<T, S = T>(store: Store<T>, select: (state: T) => S = (s) => s as unknown as S): S {
  return useSyncExternalStore(store.subscribe, () => select(store.get()))
}
