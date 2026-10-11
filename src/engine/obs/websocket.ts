// A minimal obs-websocket 5 client: connects, authenticates, and sends custom events to the
// browser sources through obs-browser's `emit_event` vendor request.
// Protocol: https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md

export const DEFAULT_OBS_URL = 'ws://127.0.0.1:4455'
const RPC_VERSION = 1
const AUTH_FAILED = 4009

const enum Op {
  Hello = 0,
  Identify = 1,
  Identified = 2,
  Request = 6,
  RequestResponse = 7,
}

async function sha256Base64(text: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
  return btoa(String.fromCharCode(...digest))
}

// base64(sha256(base64(sha256(password + salt)) + challenge))
export async function authString(password: string, salt: string, challenge: string): Promise<string> {
  return sha256Base64((await sha256Base64(password + salt)) + challenge)
}

export type ObsSocketError = 'auth' | 'password' | 'closed'

export interface ObsSocketEvents {
  onOpen(): void
  // The connection ended; `error` says why when it was not asked for.
  onClose(error: ObsSocketError | null): void
  // A request failed: obs-browser missing or too old.
  onRequestError(message: string): void
}

export class ObsSocket {
  private readonly ws: WebSocket
  private identified = false
  private closing = false
  private nextId = 0
  private error: ObsSocketError | null = null

  constructor(url: string, password: string, private readonly events: ObsSocketEvents) {
    this.ws = new WebSocket(url, 'obswebsocket.json')
    this.ws.onmessage = (e) => void this.receive(String(e.data), password)
    this.ws.onclose = (e) => {
      if (e.code === AUTH_FAILED) this.error = 'auth'
      else if (!this.closing && !this.error) this.error = 'closed'
      this.events.onClose(this.closing ? null : this.error)
    }
  }

  get ready(): boolean {
    return this.identified && this.ws.readyState === WebSocket.OPEN
  }

  // Bytes queued and not yet sent; a slow link shows here first.
  get backlog(): number {
    return this.ws.bufferedAmount
  }

  close(): void {
    this.closing = true
    this.ws.close()
  }

  // Dispatched in every browser source as a CustomEvent named `name`, with `data` as detail.
  emit(name: string, data: Record<string, unknown>): void {
    if (!this.ready) return
    this.send(Op.Request, {
      requestType: 'CallVendorRequest',
      requestId: String(++this.nextId),
      requestData: { vendorName: 'obs-browser', requestType: 'emit_event', requestData: { event_name: name, event_data: data } },
    })
  }

  private send(op: Op, d: unknown): void {
    this.ws.send(JSON.stringify({ op, d }))
  }

  private async receive(text: string, password: string): Promise<void> {
    let msg: { op: number; d: Record<string, unknown> }
    try {
      msg = JSON.parse(text)
    } catch {
      return
    }
    if (msg.op === Op.Hello) {
      const auth = msg.d.authentication as { salt: string; challenge: string } | undefined
      if (auth && !password) {
        this.error = 'password'
        this.ws.close()
        return
      }
      const d: Record<string, unknown> = { rpcVersion: RPC_VERSION, eventSubscriptions: 0 }
      if (auth) d.authentication = await authString(password, auth.salt, auth.challenge)
      this.send(Op.Identify, d)
    } else if (msg.op === Op.Identified) {
      this.identified = true
      this.events.onOpen()
    } else if (msg.op === Op.RequestResponse) {
      const status = msg.d.requestStatus as { result: boolean; comment?: string } | undefined
      if (status && !status.result) this.events.onRequestError(status.comment ?? 'request failed')
    }
  }
}
