import { Scribe, RealtimeEvents, AudioFormat } from '@elevenlabs/client'

// Browser-side audio capture for Copilot live sessions.
//
// Three capture modes reach ElevenLabs Scribe realtime STT:
//  - 'in_person':  this device's microphone hears both people in the room.
//                  Echo cancellation stays ON (nothing plays through speakers
//                  that we need to keep).
//  - 'remote_mic': the call plays through the interviewer's SPEAKERS and the
//                  mic picks the candidate up acoustically. Echo cancellation
//                  must be OFF — it is precisely the DSP that strips far-end
//                  (candidate) audio coming out of the speakers.
//  - 'tab':        the interviewer shares the Google Meet tab (with audio);
//                  we mix the tab's audio (candidate) with the mic
//                  (interviewer) via the Web Audio API and stream PCM16
//                  chunks to Scribe manually. Headphone-proof.
//
// The fourth mode, bot-join, needs no browser audio at all — the transcript
// arrives server-side from the meeting bot.

export type CaptureMode = 'in_person' | 'remote_mic' | 'tab'

export type CaptureHandlers = {
  onPartial: (text: string) => void
  onCommitted: (text: string) => void
  onError: (message: string) => void
}

export type CaptureHandle = {
  stop: () => void
}

const SAMPLE_RATE = 16_000
const CHUNK_SIZE = 4096

function attachTranscriptHandlers(connection: any, handlers: CaptureHandlers) {
  connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data: any) => {
    handlers.onPartial(data?.text ?? '')
  })
  connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data: any) => {
    handlers.onCommitted((data?.text ?? '').trim())
  })
  connection.on(RealtimeEvents.ERROR, () => {
    handlers.onError('Transcription hiccup — reconnect if it persists.')
  })
}

function startMicCapture(
  token: string,
  echoCancellation: boolean,
  handlers: CaptureHandlers,
): CaptureHandle {
  const connection = Scribe.connect({
    token,
    modelId: 'scribe_v2_realtime',
    microphone: {
      echoCancellation,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })
  attachTranscriptHandlers(connection, handlers)
  return { stop: () => connection.close?.() }
}

async function startTabCapture(token: string, handlers: CaptureHandlers): Promise<CaptureHandle> {
  // Ask for the Meet tab. video:true is required for the tab picker; the
  // user must tick "Also share tab audio". suppressLocalAudioPlayback:false
  // keeps the candidate audible to the interviewer while we capture.
  const display = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: { suppressLocalAudioPlayback: false } as MediaTrackConstraints,
  })
  if (display.getAudioTracks().length === 0) {
    display.getTracks().forEach((t) => t.stop())
    throw new Error(
      'No tab audio captured — pick the Google Meet tab and tick "Also share tab audio".',
    )
  }
  // The mic still carries the interviewer's own voice (tab audio on Meet
  // contains only the far end). Echo cancellation ON here: the candidate's
  // voice reaches us cleanly via the tab, so stripping it from the mic
  // avoids double transcription.
  const mic = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  })

  const context = new AudioContext({ sampleRate: SAMPLE_RATE })
  const processor = context.createScriptProcessor(CHUNK_SIZE, 1, 1)
  // Web Audio sums multiple connections into a node — this IS the mixer.
  context.createMediaStreamSource(display).connect(processor)
  context.createMediaStreamSource(mic).connect(processor)
  // ScriptProcessor only fires while connected to the graph's destination;
  // its output buffer stays zeroed so nothing is audible.
  processor.connect(context.destination)

  const connection = Scribe.connect({
    token,
    modelId: 'scribe_v2_realtime',
    audioFormat: AudioFormat.PCM_16000,
    sampleRate: SAMPLE_RATE,
  })
  attachTranscriptHandlers(connection, handlers)

  let closed = false
  processor.onaudioprocess = (event) => {
    if (closed) return
    const input = event.inputBuffer.getChannelData(0)
    const pcm = new Int16Array(input.length)
    for (let i = 0; i < input.length; i++) {
      const sample = Math.max(-1, Math.min(1, input[i]))
      pcm[i] = sample < 0 ? sample * 32768 : sample * 32767
    }
    const bytes = new Uint8Array(pcm.buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
    }
    try {
      connection.send({ audioBase64: btoa(binary) })
    } catch {
      // Connection closing mid-chunk — stop() is about to run.
    }
  }

  const stop = () => {
    closed = true
    processor.disconnect()
    display.getTracks().forEach((t) => t.stop())
    mic.getTracks().forEach((t) => t.stop())
    void context.close().catch(() => {})
    connection.close?.()
  }
  // If the user ends the share from Chrome's own bar, stop everything.
  display.getVideoTracks()[0]?.addEventListener('ended', () => {
    handlers.onError('Tab sharing ended — restart listening to continue.')
    stop()
  })
  return { stop }
}

export async function startCapture(
  mode: CaptureMode,
  token: string,
  handlers: CaptureHandlers,
): Promise<CaptureHandle> {
  if (mode === 'tab') return startTabCapture(token, handlers)
  return startMicCapture(token, mode === 'in_person', handlers)
}
