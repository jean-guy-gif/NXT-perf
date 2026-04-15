'use client'
import { useState } from 'react'
import { PERSONAS } from '@/lib/personas'
import type { PersonaId } from '@/lib/personas'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface PersonaSelectorProps {
  onSelected: (persona: PersonaId) => void
}

export function PersonaSelector({ onSelected }: PersonaSelectorProps) {
  const [selected, setSelected] = useState<PersonaId | null>(null)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!selected || loading) return
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.from('profiles').update({
        coach_persona: selected,
        coach_onboarded: true,
        coach_persona_set_at: new Date().toISOString(),
      }).eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
      onSelected(selected)
    } finally {
      setLoading(false)
    }
  }

  const selectedPersona = PERSONAS.find(p => p.id === selected)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-xl font-semibold text-center mb-2">Choisis ton coach</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">Ce choix reste modifiable dans les paramètres.</p>

        <div className="grid grid-cols-1 gap-3 mb-6">
          {PERSONAS.map(persona => (
            <button
              key={persona.id}
              onClick={() => setSelected(persona.id)}
              className={cn(
                'flex items-start gap-4 p-4 rounded-xl border text-left transition-all',
                selected === persona.id
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-muted-foreground'
              )}
            >
              <span className="text-2xl mt-0.5">{persona.emoji}</span>
              <div>
                <div className="font-medium">{persona.label}</div>
                <div className="text-sm text-muted-foreground">{persona.description}</div>
                <div className="text-xs text-muted-foreground italic mt-1">"{persona.signature}"</div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleConfirm}
          disabled={!selected || loading}
          className={cn(
            'w-full py-3 rounded-xl font-medium transition-all',
            selected && !loading
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {loading ? 'Chargement...' : selectedPersona ? `Commencer avec ${selectedPersona.label}` : 'Choisir un coach'}
        </button>
      </div>
    </div>
  )
}
