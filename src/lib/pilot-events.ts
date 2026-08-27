export const PILOT_EVENT_STORAGE_KEY = 'mf_pilot_events_v1'

export type PilotEvent =
  | PilotEventBase<'opened_proposition', { contentId: string }>
  | PilotEventBase<'followed_dependency', { fromContentId: string; toContentId: string }>
  | PilotEventBase<'returned_from_dependency', { fromContentId: string; toContentId: string }>
  | PilotEventBase<'created_annotation', { contentId: string; blockId: string }>
  | PilotEventBase<'resolved_annotation', { contentId: string; annotationId: string }>
  | PilotEventBase<'self_explanation_submitted', { contentId: string; lengthBucket: 'short' | 'medium' | 'long' }>

interface PilotEventBase<TType extends string, TPayload> {
  id: string
  sessionId: string
  type: TType
  occurredAt: number
  payload: TPayload
}

export type PilotEventInput = {
  [TEvent in PilotEvent as TEvent['type']]: Pick<TEvent, 'type' | 'payload'>
}[PilotEvent['type']]

export interface PilotEventStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const MAX_LOCAL_EVENTS = 1_000

function localStorageIfAvailable(): PilotEventStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function randomId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  return `${prefix}-${uuid ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPilotEvent(value: unknown): value is PilotEvent {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.sessionId !== 'string') return false
  if (typeof value.occurredAt !== 'number' || !isRecord(value.payload)) return false

  const payload = value.payload
  switch (value.type) {
    case 'opened_proposition':
      return typeof payload.contentId === 'string'
    case 'followed_dependency':
    case 'returned_from_dependency':
      return typeof payload.fromContentId === 'string' && typeof payload.toContentId === 'string'
    case 'created_annotation':
      return typeof payload.contentId === 'string' && typeof payload.blockId === 'string'
    case 'resolved_annotation':
      return typeof payload.contentId === 'string' && typeof payload.annotationId === 'string'
    case 'self_explanation_submitted':
      return typeof payload.contentId === 'string'
        && ['short', 'medium', 'long'].includes(String(payload.lengthBucket))
    default:
      return false
  }
}

export function readPilotEvents(storage: PilotEventStorage | null = localStorageIfAvailable()): PilotEvent[] {
  if (!storage) return []
  try {
    const parsed: unknown = JSON.parse(storage.getItem(PILOT_EVENT_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter(isPilotEvent) : []
  } catch {
    return []
  }
}

export function recordPilotEvent(
  sessionId: string,
  input: PilotEventInput,
  storage: PilotEventStorage | null = localStorageIfAvailable(),
): PilotEvent | null {
  if (!storage) return null
  const event = {
    id: randomId('pilot-event'),
    sessionId,
    type: input.type,
    occurredAt: Date.now(),
    payload: input.payload,
  } as PilotEvent
  const next = [...readPilotEvents(storage), event].slice(-MAX_LOCAL_EVENTS)
  storage.setItem(PILOT_EVENT_STORAGE_KEY, JSON.stringify(next))
  return event
}

export function createPilotSessionId(): string {
  return randomId('pilot-session')
}

export function clearPilotEvents(storage: PilotEventStorage | null = localStorageIfAvailable()): void {
  storage?.removeItem(PILOT_EVENT_STORAGE_KEY)
}

export function explanationLengthBucket(text: string): 'short' | 'medium' | 'long' {
  const length = text.trim().length
  if (length < 80) return 'short'
  if (length < 300) return 'medium'
  return 'long'
}
