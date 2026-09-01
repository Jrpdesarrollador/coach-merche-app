import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, Textarea } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { toFriendlyMessage, workoutsService } from '@/services'
import type { Workout } from '@/types'

const linkClasses =
  'inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-surface-elevated px-3.5 text-sm font-semibold text-ink transition-colors hover:border-line-lime'

interface SelectedWorkoutEditorProps {
  workout: Workout
  onUpdated: (workout: Workout) => void
}

export function SelectedWorkoutEditor({
  workout,
  onUpdated,
}: SelectedWorkoutEditorProps) {
  const { showToast } = useToast()
  const [title, setTitle] = useState(workout.title)
  const [description, setDescription] = useState(workout.description ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTitle(workout.title)
    setDescription(workout.description ?? '')
  }, [workout.description, workout.id, workout.title])

  async function handleSave() {
    if (!title.trim()) {
      showToast('El entrenamiento necesita un nombre.', 'error')
      return
    }

    setSaving(true)
    try {
      const updated = await workoutsService.updateWorkout(workout.id, {
        title: title.trim(),
        description: description.trim() || null,
      })
      onUpdated(updated)
      showToast('Nombre y descripción actualizados en todos los días')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-elevated p-4">
      <div>
        <p className="font-display text-base text-ink">
          Renombrar o actualizar este entrenamiento
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
          El cambio se aplicará en todos los días donde se utilice.
        </p>
      </div>
      <Input
        id="selected-workout-title"
        label="Nombre del entrenamiento"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <Textarea
        id="selected-workout-description"
        label="Descripción"
        value={description}
        rows={2}
        onChange={(event) => setDescription(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" loading={saving} onClick={() => void handleSave()}>
          Guardar nombre y descripción
        </Button>
        <Link to={`/gestion/entrenos?edit=${workout.id}`} className={linkClasses}>
          Cambiar imagen o vídeo
        </Link>
      </div>
    </div>
  )
}
