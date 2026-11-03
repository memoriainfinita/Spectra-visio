import type { ActionId } from '../engine/live/live'
import type { MessageKey } from '../i18n'
import type { useT } from './useT'

// The name of an action in the app's language, for buttons, shortcuts, MIDI and search.
export function actionLabel(id: ActionId, t: ReturnType<typeof useT>): string {
  if (id.startsWith('column')) return t('clips.column', { n: id.slice(6) })
  if (id.startsWith('variation')) return t('knobs.variationAction', { n: id.slice(9) })
  return t(`action.${id}` as MessageKey)
}
