'use client'
import { useRef, useState, useCallback } from 'react'
import type { PersonaId } from '@/lib/personas'

export interface CoachAudioInterface {
  startListening: () => void
  stopListening: () => void
  playCoachSpeech: (text: string, persona: PersonaId) => Promise<void>
  interruptSpeech: () => void
  transcriptPartial: string
  transcriptFinal: string | null
  isListening: boolean
  isSpeaking: boolean
}

export function useCoachAudio(params: {
  onTranscriptPartial: (t: string) => void
  onTranscriptFinal: (t: string) => void
}): CoachAudioInterface {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [transcriptPartial, setTranscriptPartial] = useState('')
  const [transcriptFinal, setTranscriptFinal] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const startListening = useCallback(async () => {
    if (isListening) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = e => chunks.push(e.data)
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const form = new FormData()
        form.append('audio', blob, 'audio.webm')
        try {
          const res = await fetch('/api/coach/transcribe', { method: 'POST', body: form })
          const data = await res.json()
          const final = data.transcript ?? ''
          setTranscriptFinal(final)
          params.onTranscriptFinal(final)
        } catch {
          // fallback silencieux
        }
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start(250) // chunks toutes les 250ms
      mediaRecorderRef.current = recorder
      setIsListening(true)
      setTranscriptPartial('')
      setTranscriptFinal(null)
    } catch {
      // Micro non disponible → caller passe en fallback_text
    }
  }, [isListening, params])

  const stopListening = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setIsListening(false)
  }, [])

  const playCoachSpeech = useCallback(async (text: string, persona: PersonaId) => {
    setIsSpeaking(true)
    try {
      const res = await fetch('/api/vocal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persona }),
      })
      if (!res.ok) throw new Error('TTS failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve()
        audio.onerror = reject
        audio.play()
      })
      URL.revokeObjectURL(url)
    } catch {
      // TTS indisponible → texte seul, pas d'interruption de session
    } finally {
      setIsSpeaking(false)
      audioRef.current = null
    }
  }, [])

  const interruptSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  return {
    startListening, stopListening, playCoachSpeech, interruptSpeech,
    transcriptPartial, transcriptFinal, isListening, isSpeaking,
  }
}
