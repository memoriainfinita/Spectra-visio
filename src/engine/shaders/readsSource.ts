import type { ShaderFormat } from './userVisual'

// Whether a shader reads the layer's visual source: an ISF image input, or Shadertoy's
// iChannel1. Such a shader filters the source; the others draw on their own.
export function readsSource(format: ShaderFormat, source: string): boolean {
  return format === 'isf' ? /"TYPE"\s*:\s*"image"/.test(source) : /\biChannel1\b/.test(source)
}
