import { describe, expect, it } from 'vitest'

import { ALLOWED_VOICE_IDS, findVoice, VOICES } from './voices'

describe('VOICES catalogue', () => {
  it('has at least one voice', () => {
    expect(VOICES.length).toBeGreaterThan(0)
  })

  it('every voice has the required fields', () => {
    for (const v of VOICES) {
      expect(v.id).toBeTruthy()
      expect(v.name).toBeTruthy()
      expect(['British', 'American', 'Indian']).toContain(v.accent)
      expect(['Female', 'Male']).toContain(v.gender)
      expect(v.description).toBeTruthy()
      expect(v.sampleUrl).toMatch(/^\/voices\/[A-Za-z0-9]+\.mp3$/)
    }
  })

  it('has unique voice IDs', () => {
    const ids = VOICES.map(v => v.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('sampleUrl matches the voice id', () => {
    for (const v of VOICES) {
      expect(v.sampleUrl).toBe(`/voices/${v.id}.mp3`)
    }
  })
})

describe('ALLOWED_VOICE_IDS', () => {
  it('contains every VOICE id', () => {
    for (const v of VOICES) expect(ALLOWED_VOICE_IDS.has(v.id)).toBe(true)
  })

  it('rejects unknown ids', () => {
    expect(ALLOWED_VOICE_IDS.has('not-a-voice')).toBe(false)
  })
})

describe('findVoice', () => {
  it('returns the matching voice', () => {
    const v = VOICES[0]
    expect(findVoice(v.id)).toEqual(v)
  })

  it('returns undefined for unknown id', () => {
    expect(findVoice('not-a-voice')).toBeUndefined()
  })

  it.each([null, undefined, ''])('returns undefined for %s', (id) => {
    expect(findVoice(id as string | null | undefined)).toBeUndefined()
  })
})
