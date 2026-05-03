// Mirror of core/voices.py — kept in sync by hand. The frontend renders
// the picker straight from this constant rather than fetching from the
// backend on every dashboard render; the trade-off is that adding a
// voice means editing both this file and core/voices.py (and
// regenerating the MP3 sample). That's deliberate — the catalogue
// changes maybe twice a year, the latency saved on every page load is
// permanent.

export type Voice = {
  id: string
  name: string
  accent: 'British' | 'American' | 'Indian'
  gender: 'Female' | 'Male'
  description: string
  sampleUrl: string
}

export const VOICES: Voice[] = [
  // British female
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily',    accent: 'British',  gender: 'Female', description: 'Warm narration',         sampleUrl: '/voices/pFZP5JQG7iQjIQuC4Bku.mp3' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice',   accent: 'British',  gender: 'Female', description: 'Confident, clear',       sampleUrl: '/voices/Xb7hH8MSUJpSbSDYk0k2.mp3' },
  { id: 'ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', accent: 'British',  gender: 'Female', description: 'Pleasant, articulate',   sampleUrl: '/voices/ThT5KcBeYPX3keUQqHPh.mp3' },
  // British male
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George',  accent: 'British',  gender: 'Male',   description: 'Warm narration',         sampleUrl: '/voices/JBFqnCBsd6RMkjVDRZzb.mp3' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel',  accent: 'British',  gender: 'Male',   description: 'Authoritative',          sampleUrl: '/voices/onwK4e9ZLuTAKqWW03F9.mp3' },
  { id: 'Zlb1dXrM653N07WRdFW3', name: 'Joseph',  accent: 'British',  gender: 'Male',   description: 'Articulate',             sampleUrl: '/voices/Zlb1dXrM653N07WRdFW3.mp3' },
  // American
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah',   accent: 'American', gender: 'Female', description: 'Soft conversational',    sampleUrl: '/voices/EXAVITQu4vr4xnSDxMaL.mp3' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric',    accent: 'American', gender: 'Male',   description: 'Smooth, trustworthy',    sampleUrl: '/voices/cjVigY5qzO86Huf0OWal.mp3' },
  // Indian
  { id: 'zEvjs17jNQ2fH5FxAat2', name: 'Anika',   accent: 'Indian',   gender: 'Female', description: 'Warm, gentle',           sampleUrl: '/voices/zEvjs17jNQ2fH5FxAat2.mp3' },
]

export const ALLOWED_VOICE_IDS: ReadonlySet<string> = new Set(VOICES.map(v => v.id))

export function findVoice(id: string | null | undefined): Voice | undefined {
  if (!id) return undefined
  return VOICES.find(v => v.id === id)
}
