// Horizontal-mirror helper for recorded video.
//
// MediaRecorder captures the raw camera track, which is NOT mirrored — so the
// saved file (and the hirer's view) looks laterally reversed compared to the
// "selfie" preview the candidate sees on screen. When the candidate opts to
// flip the camera, we draw the live video onto a canvas each frame with a
// horizontal flip and record the canvas' captured stream instead, so the
// saved recording matches what they see of themselves.
//
// The original audio tracks are passed through untouched. If mirroring can't
// be set up (no video track, or no 2D canvas context) we fall back to the
// original stream so recording still works.

const FLIP_PREF_KEY = 'basanite:flipCamera'

// Camera flip defaults ON so the saved recording matches the candidate's
// natural selfie view unless they explicitly turn it off.
export function getFlipPreference(): boolean {
  try {
    const raw = localStorage.getItem(FLIP_PREF_KEY)
    return raw === null ? true : raw === '1'
  } catch {
    return true
  }
}

export function setFlipPreference(flip: boolean): void {
  try {
    localStorage.setItem(FLIP_PREF_KEY, flip ? '1' : '0')
  } catch {
    /* storage unavailable — preference just won't persist */
  }
}

export type MirroredCapture = {
  stream: MediaStream
  stop: () => void
}

export function createMirroredStream(source: MediaStream, fps = 30): MirroredCapture {
  const videoTrack = source.getVideoTracks()[0]
  if (!videoTrack) return { stream: source, stop: () => {} }

  const settings = videoTrack.getSettings()
  const width = settings.width ?? 640
  const height = settings.height ?? 480

  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.srcObject = new MediaStream([videoTrack])

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return { stream: source, stop: () => {} }

  let raf = 0
  let stopped = false
  const draw = () => {
    if (stopped) return
    if (video.readyState >= 2) {
      ctx.save()
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      ctx.restore()
    }
    raf = requestAnimationFrame(draw)
  }

  void video.play().then(draw).catch(draw)

  const canvasStream = canvas.captureStream(fps)
  const mirrored = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...source.getAudioTracks(),
  ])

  const stop = () => {
    stopped = true
    if (raf) cancelAnimationFrame(raf)
    canvasStream.getTracks().forEach(t => t.stop())
    video.srcObject = null
  }

  return { stream: mirrored, stop }
}
