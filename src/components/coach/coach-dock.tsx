'use client'
import { useState, useEffect } from 'react'
import { Mic, MicOff, Keyboard, X, Loader2 } from 'lucide-react'
import { useCoachSession } from '@/stores/coach-session-store'
import { useCoachAudio } from '@/hooks/use-coach-audio'
import { PERSONAS } from '@/lib/personas'
import { cn } from '@/lib/utils'

export function CoachDock() {
  const uiState = useCoachSession(s => s.uiState)
  const coachText = useCoachSession(s => s.coachText)
  const transcriptPartial = useCoachSession(s => s.transcriptPartial)
  const persona = useCoachSession(s => s.persona)
  const draftStatus = useCoachSession(s => s.draftStatus)
  const prescription = useCoachSession(s => s.prescription)
  const sendTurn = useCoachSession(s => s.sendTurn)
  const confirmSession = useCoachSession(s => s.confirmSession)
  const respondPrescription = useCoachSession(s => s.respondPrescription)
  const abandonSession = useCoachSession(s => s.abandonSession)
  const dismissUI = useCoachSession(s => s.dismissUI)
  const setTranscriptPartial = useCoachSession(s => s.setTranscriptPartial)
  const clearTranscriptPartial = useCoachSession(s => s.clearTranscriptPartial)

  const [textInput, setTextInput] = useState('')
  const [isFallbackText, setIsFallbackText] = useState(false)

  const audio = useCoachAudio({
    onTranscriptPartial: setTranscriptPartial,
    onTranscriptFinal: (t) => {
      clearTranscriptPartial()
      sendTurn(t, 'voice')
    },
  })

  const personaConfig = PERSONAS.find(p => p.id === persona) ?? PERSONAS[2]

  // Jouer le TTS quand uiState passe à 'speaking'
  useEffect(() => {
    if (uiState === 'speaking' && coachText && persona) {
      audio.playCoachSpeech(coachText, persona)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiState, coachText])

  // Fallback si micro indisponible
  const handleMicClick = () => {
    if (audio.isListening) {
      audio.stopListening()
    } else {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => audio.startListening())
        .catch(() => setIsFallbackText(true))
    }
  }

  const handleTextSubmit = () => {
    if (!textInput.trim()) return
    sendTurn(textInput.trim(), 'text')
    setTextInput('')
  }

  const handleClose = () => {
    if (['saved', 'closed', 'reading', 'prescribing'].includes(uiState)) {
      dismissUI()
    } else {
      abandonSession()
    }
  }

  const showMic = uiState !== 'fallback_text' && uiState !== 'saving' && uiState !== 'processing'
  const micActive = !['processing', 'saving', 'speaking'].includes(uiState)

  if (uiState === 'idle' || uiState === 'prompted') return null

  return (
    <div
      data-testid="coach-dock"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-card/95 backdrop-blur border-t shadow-2xl',
        'flex items-center gap-3 px-4 py-3',
        'animate-in slide-in-from-bottom-2 duration-200'
      )}
    >
      {/* Avatar + prénom */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-2xl">{personaConfig.emoji}</span>
        <span className="text-xs text-muted-foreground hidden sm:block">{personaConfig.label}</span>
      </div>

      {/* Contenu central */}
      <div className="flex-1 min-w-0">
        {/* Message coach */}
        {coachText && (
          <p className="text-sm truncate">{coachText}</p>
        )}

        {/* Transcription partielle */}
        {transcriptPartial && (
          <p className="text-xs text-muted-foreground truncate italic">{transcriptPartial}</p>
        )}

        {/* Indicateur d'état */}
        {uiState === 'processing' && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 size={12} className="animate-spin" />
            <span>Traitement...</span>
          </div>
        )}

        {/* Confirmation */}
        {uiState === 'confirming' && draftStatus?.can_confirm && (
          <button
            onClick={confirmSession}
            className="text-xs bg-primary text-primary-foreground rounded px-2 py-0.5 mt-1"
          >
            Valider et sauvegarder
          </button>
        )}

        {/* Prescription */}
        {uiState === 'prescribing' && prescription && (
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => respondPrescription('accepted')}
              className="text-xs bg-primary text-primary-foreground rounded px-2 py-0.5"
            >
              Oui, je veux voir
            </button>
            <button
              onClick={() => respondPrescription('refused')}
              className="text-xs border rounded px-2 py-0.5 text-muted-foreground"
            >
              Non merci
            </button>
          </div>
        )}

        {/* Fallback texte */}
        {(isFallbackText || uiState === 'fallback_text') && (
          <div className="flex gap-2 mt-1">
            <input
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
              placeholder="Écris ta réponse..."
              className="flex-1 text-sm border rounded px-2 py-1 bg-background"
              autoFocus
            />
            <button onClick={handleTextSubmit} className="text-xs bg-primary text-primary-foreground rounded px-2 py-1">
              Envoyer
            </button>
          </div>
        )}
      </div>

      {/* Contrôles droite */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {showMic && (
          <button
            onClick={handleMicClick}
            disabled={!micActive}
            className={cn(
              'p-2 rounded-full transition-all',
              audio.isListening ? 'bg-red-500 text-white' : 'bg-muted hover:bg-muted/80',
              !micActive && 'opacity-40 cursor-not-allowed'
            )}
          >
            {audio.isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}

        {!isFallbackText && uiState !== 'fallback_text' && (
          <button
            data-testid="coach-keyboard-btn"
            onClick={() => setIsFallbackText(true)}
            className="p-2 rounded-full bg-muted hover:bg-muted/80"
          >
            <Keyboard size={16} />
          </button>
        )}

        <button
          data-testid="coach-close-btn"
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-muted"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
