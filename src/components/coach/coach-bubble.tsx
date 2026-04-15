'use client'
import { useEffect, useRef, useState } from 'react'
import { Mic, X, MessageSquare } from 'lucide-react'
import { useCoachSession } from '@/stores/coach-session-store'
import { useCoachTrigger } from '@/hooks/use-coach-trigger'
import { PERSONAS } from '@/lib/personas'
import { cn } from '@/lib/utils'

// Templates de message bulle par trigger
const BUBBLE_MESSAGES: Record<string, string> = {
  ratio_rouge:        '3 visites pour 0 offre. On regarde ça ensemble ?',
  lundi_sans_debrief: "C'est lundi. Tu me racontes ta semaine ?",
  bouton_manuel:      'On fait le point ?',
}

export function CoachBubble() {
  // Le hook déclenche startSession automatiquement selon les signaux
  useCoachTrigger()

  const uiState = useCoachSession(s => s.uiState)
  const coachText = useCoachSession(s => s.coachText)
  const persona = useCoachSession(s => s.persona)
  const startSession = useCoachSession(s => s.startSession)

  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const personaConfig = PERSONAS.find(p => p.id === persona) ?? PERSONAS[2]

  // Afficher la bulle quand uiState passe à 'prompted' (avant réponse serveur)
  useEffect(() => {
    if (uiState === 'prompted') {
      setVisible(true)
      timerRef.current = setTimeout(() => setVisible(false), 15_000)
    } else {
      setVisible(false)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [uiState])

  // La bulle n'est visible que pendant 'prompted'
  if (!visible || uiState !== 'prompted') return null

  return (
    <div className={cn(
      'fixed bottom-24 right-6 z-40 max-w-xs',
      'bg-card border shadow-xl rounded-2xl p-4',
      'animate-in slide-in-from-bottom-4 fade-in duration-200'
    )}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{personaConfig.emoji}</span>
        <span className="text-sm font-medium">{personaConfig.label}</span>
        <button
          onClick={() => setVisible(false)}
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          <X size={14} />
        </button>
      </div>

      <p className="text-sm mb-3">
        {coachText ?? BUBBLE_MESSAGES.bouton_manuel}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => startSession({ trigger_type: 'bouton_manuel' })}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-medium"
        >
          <Mic size={12} /> Parler
        </button>
        <button
          onClick={() => startSession({ trigger_type: 'bouton_manuel' })}
          className="flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-xs text-muted-foreground"
        >
          <MessageSquare size={12} /> En texte
        </button>
      </div>
    </div>
  )
}
