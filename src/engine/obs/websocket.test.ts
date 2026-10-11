import { describe, expect, it } from 'vitest'
import { authString } from './websocket'

describe('authString', () => {
  it('follows the protocol: base64 sha256 of the secret and the challenge', async () => {
    // Salt and challenge from the protocol document's example; the result computed apart
    // with Python's hashlib.
    const salt = 'lM1GncleQOaCu9lT1yeUZhFYnqhsLLP1G5lAGo3ixaI='
    const challenge = '+IxH4CnCiqpX1rM9scsNynZzbOe4KhDeYcTNS3PDaeY='
    expect(await authString('supersecretpassword', salt, challenge)).toBe('1Ct943GAT+6YQUUX47Ia/ncufilbe6+oD6lY+5kaCu4=')
  })
})
