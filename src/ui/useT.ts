import { useCallback } from 'react'
import { settingsStore } from '../app/settings'
import { translate, type MessageKey, type Params } from '../i18n'
import { useStore } from './useStore'

export function useT() {
  const lang = useStore(settingsStore, (s) => s.lang)
  return useCallback((key: MessageKey, params?: Params) => translate(lang, key, params), [lang])
}
