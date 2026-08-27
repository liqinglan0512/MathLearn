import { beforeEach, describe, expect, it } from 'vitest'
import {
  PILOT_EVENT_STORAGE_KEY,
  clearPilotEvents,
  explanationLengthBucket,
  readPilotEvents,
  recordPilotEvent,
  type PilotEventStorage,
} from '../src/lib/pilot-events'

class MemoryStorage implements PilotEventStorage {
  private readonly values = new Map<string, string>()
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}

describe('local anonymous pilot events', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  it('records only the event payload in local storage', () => {
    recordPilotEvent('pilot-session-test', {
      type: 'followed_dependency',
      payload: { fromContentId: 'euclid-1-47', toContentId: 'euclid-1-41' },
    }, storage)

    const [event] = readPilotEvents(storage)
    expect(event.type).toBe('followed_dependency')
    expect(event.sessionId).toBe('pilot-session-test')
    expect(JSON.stringify(event)).not.toContain('user')
    expect(JSON.stringify(event)).not.toContain('email')
  })

  it('ignores malformed stored values rather than treating them as telemetry', () => {
    storage.setItem(PILOT_EVENT_STORAGE_KEY, JSON.stringify([
      { type: 'opened_proposition', payload: { contentId: 'euclid-1-1' } },
      { id: 'ok', sessionId: 's', type: 'opened_proposition', occurredAt: 1, payload: { contentId: 'euclid-1-1' } },
    ]))
    expect(readPilotEvents(storage)).toHaveLength(1)
  })

  it('can be cleared locally', () => {
    recordPilotEvent('s', { type: 'opened_proposition', payload: { contentId: 'euclid-1-1' } }, storage)
    clearPilotEvents(storage)
    expect(readPilotEvents(storage)).toEqual([])
  })

  it('stores only an explanation length bucket, never the explanation text', () => {
    expect(explanationLengthBucket('很短的说明')).toBe('short')
    expect(explanationLengthBucket('数'.repeat(120))).toBe('medium')
    expect(explanationLengthBucket('数'.repeat(500))).toBe('long')
  })
})
