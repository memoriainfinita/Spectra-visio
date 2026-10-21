import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnalysisPanel } from '../Analysis'
import { Auto } from '../Auto'
import { Browser } from '../Browser'
import { Clips } from '../Clips'
import { Inspector } from '../Inspector'
import { Knobs } from '../Knobs'
import { Live } from '../Live'
import { Midi } from '../Midi'
import { Modulators } from '../Modulators'
import { MyPanel } from '../MyPanel'
import { Output } from '../Output'
import { Overlays } from '../Overlays'
import { PerformBar } from '../PerformBar'
import { Presets } from '../Presets'
import { Queue } from '../Queue'
import { Settings } from '../Settings'
import { Shaders } from '../Shaders'
import { Sources } from '../Sources'
import { NowPlaying, Transport } from '../Transport'
import { VisualInput } from '../VisualInput'
import { Visuals } from '../Visuals'

// Every panel is mounted once, into a node of its own, and the layouts only move that node
// around: changing layout, moving a dock or crossing a width keeps what is half typed,
// scrolled or playing in it.

const PANELS = {
  player: (
    <section className="panel player">
      <NowPlaying />
      <Transport />
    </section>
  ),
  queue: <Queue />,
  sources: <Sources />,
  analysis: <AnalysisPanel />,
  visuals: <Visuals />,
  inspector: <Inspector />,
  browser: <Browser />,
  presets: <Presets />,
  shaders: <Shaders />,
  vinput: <VisualInput />,
  overlays: <Overlays />,
  live: <Live />,
  clips: <Clips />,
  auto: <Auto />,
  midi: <Midi />,
  output: <Output />,
  settings: <Settings />,
  perform: <PerformBar />,
  knobs: <Knobs />,
  modulators: <Modulators />,
  mypanel: <MyPanel />,
} satisfies Record<string, ReactNode>

export type PanelId = keyof typeof PANELS
const IDS = Object.keys(PANELS) as PanelId[]

const nodes = new Map<PanelId, HTMLElement>()

function panelNode(id: PanelId): HTMLElement {
  let node = nodes.get(id)
  if (!node) {
    node = document.createElement('div')
    node.className = 'panel-host'
    node.dataset.panel = id
    nodes.set(id, node)
  }
  return node
}

// Renders every panel into its node, wherever that node is at the moment.
export function PanelPortals() {
  return <>{IDS.map((id) => createPortal(PANELS[id], panelNode(id), id))}</>
}

// The place a panel shows in. Only one slot per panel is mounted at a time; when another
// takes over in the same commit, the old one lets go first.
export function PanelSlot({ id }: { id: PanelId }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const host = ref.current
    if (!host) return
    const node = panelNode(id)
    host.appendChild(node)
    return () => {
      if (node.parentNode === host) host.removeChild(node)
    }
  }, [id])
  return <div ref={ref} className="panel-slot" />
}
