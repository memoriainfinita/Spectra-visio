// A stand-in for OBS: obs-websocket 5 (hello, auth, identify, CallVendorRequest) on `/`,
// and on `/browser` a feed of the emitted events for a page playing the browser source.
import { createServer } from 'node:http'
import { createHash, randomBytes } from 'node:crypto'

const b64sha = (s) => createHash('sha256').update(s).digest('base64')

function accept(req, socket, protocol) {
  const key = req.headers['sec-websocket-key']
  const accept = createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')
  const lines = ['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${accept}`]
  if (protocol) lines.push(`Sec-WebSocket-Protocol: ${protocol}`)
  socket.write(lines.join('\r\n') + '\r\n\r\n')
}

function frame(opcode, payload) {
  const len = payload.length
  let head
  if (len < 126) head = Buffer.from([0x80 | opcode, len])
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | opcode; head[1] = 126; head.writeUInt16BE(len, 2) }
  else { head = Buffer.alloc(10); head[0] = 0x80 | opcode; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2) }
  return Buffer.concat([head, payload])
}

const sendText = (socket, text) => socket.write(frame(1, Buffer.from(text)))
function sendClose(socket, code) {
  const p = Buffer.alloc(2); p.writeUInt16BE(code)
  socket.write(frame(8, p))
  socket.end()
}

// Calls onText for each text message from a client (masked frames).
function reader(socket, onText) {
  let buf = Buffer.alloc(0)
  let parts = []
  socket.on('data', (d) => {
    buf = Buffer.concat([buf, d])
    for (;;) {
      if (buf.length < 2) return
      const fin = buf[0] & 0x80, op = buf[0] & 0x0f
      let len = buf[1] & 0x7f, off = 2
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4 }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10 }
      const masked = buf[1] & 0x80
      const need = off + (masked ? 4 : 0) + len
      if (buf.length < need) return
      const mask = masked ? buf.subarray(off, off + 4) : null
      const data = Buffer.from(buf.subarray(off + (masked ? 4 : 0), need))
      if (mask) for (let i = 0; i < data.length; i++) data[i] ^= mask[i & 3]
      buf = buf.subarray(need)
      if (op === 8) { socket.end(); return }
      if (op === 9) { socket.write(frame(10, data)); continue }
      if (op === 1 || op === 0) {
        parts.push(data)
        if (fin) { onText(Buffer.concat(parts).toString()); parts = [] }
      }
    }
  })
}

export function startFakeObs(port, password) {
  const stats = { requests: 0, bytes: 0, events: {}, identified: 0, rejected: 0, protocol: null }
  const browsers = new Set()
  const server = createServer((req, res) => { res.writeHead(404); res.end() })
  server.on('upgrade', (req, socket) => {
    socket.on('error', () => {})
    if (req.url === '/browser') {
      accept(req, socket, null)
      browsers.add(socket)
      socket.on('close', () => browsers.delete(socket))
      reader(socket, () => {})
      return
    }
    const asked = (req.headers['sec-websocket-protocol'] ?? '').split(',').map((s) => s.trim())
    stats.protocol = asked.join(',')
    accept(req, socket, asked.includes('obswebsocket.json') ? 'obswebsocket.json' : null)
    const salt = randomBytes(32).toString('base64')
    const challenge = randomBytes(32).toString('base64')
    const hello = { obsStudioVersion: '31.0.0', obsWebSocketVersion: '5.5.0', rpcVersion: 1 }
    if (password) hello.authentication = { challenge, salt }
    sendText(socket, JSON.stringify({ op: 0, d: hello }))
    let identified = false
    reader(socket, (text) => {
      const msg = JSON.parse(text)
      if (msg.op === 1) {
        if (password && msg.d.authentication !== b64sha(b64sha(password + salt) + challenge)) {
          stats.rejected++
          sendClose(socket, 4009)
          return
        }
        identified = true
        stats.identified++
        sendText(socket, JSON.stringify({ op: 2, d: { negotiatedRpcVersion: 1 } }))
      } else if (msg.op === 6) {
        if (!identified) { sendClose(socket, 4007); return }
        stats.requests++
        stats.bytes += text.length
        const r = msg.d
        const ok = r.requestType === 'CallVendorRequest' && r.requestData?.vendorName === 'obs-browser' && r.requestData?.requestType === 'emit_event'
        sendText(socket, JSON.stringify({ op: 7, d: { requestType: r.requestType, requestId: r.requestId, requestStatus: ok ? { result: true, code: 100 } : { result: false, code: 600, comment: 'unknown' } } }))
        if (ok) {
          const { event_name, event_data } = r.requestData.requestData
          stats.events[event_name] = (stats.events[event_name] ?? 0) + 1
          const out = JSON.stringify({ name: event_name, data: event_data ?? {} })
          for (const b of browsers) sendText(b, out)
        }
      }
    })
  })
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ stats, close: () => new Promise((r) => { for (const b of browsers) b.destroy(); server.closeAllConnections?.(); server.close(r) }) })))
}

// For the page that plays the browser source: what obs-browser does with an emitted event.
export const browserShim = (port) => `(() => {
  const connect = () => {
    const ws = new WebSocket('ws://127.0.0.1:${port}/browser')
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data)
      window.dispatchEvent(new CustomEvent(m.name, { detail: m.data }))
    }
    ws.onclose = () => setTimeout(connect, 300)
  }
  connect()
})()`
