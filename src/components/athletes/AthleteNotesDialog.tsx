'use client';

import { useEffect, useState } from 'react';
import type { Competitor } from '../../types/roping';
import { useAction } from '../../lib/useAction';
import { saveAthleteNoteAction } from '../../server/actions/athletes';
import { Button, Dialog } from '../ui';

export interface AthleteNotesDialogProps {
  open: boolean;
  onClose: () => void;
  athlete: Competitor | null;
  initialBody: string;
  onSaved?: (athleteId: string, body: string) => void;
}

export function AthleteNotesDialog({ open, onClose, athlete, initialBody, onSaved }: AthleteNotesDialogProps) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open && athlete !== null} onClose={onClose} busy={busy} title={`Notas sobre ${athlete?.nome ?? ''}`} description="Só você vê estas notas.">
      {athlete && <NotesForm key={athlete.id} athlete={athlete} initialBody={initialBody} onClose={onClose} onSaved={onSaved} onBusyChange={setBusy} />}
    </Dialog>
  );
}

function NotesForm({ athlete, initialBody, onClose, onSaved, onBusyChange }: Omit<AthleteNotesDialogProps, 'open' | 'athlete'> & { athlete: Competitor; onBusyChange: (busy: boolean) => void }) {
  const [body, setBody] = useState(initialBody);
  const save = useAction((input: { body: string }) => saveAthleteNoteAction(athlete.id, input), { successMessage: 'Notas salvas.' });
  const error = save.fieldErrors.body?.[0];
  useEffect(() => {
    onBusyChange(save.pending);
  }, [save.pending, onBusyChange]);

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await save.execute({ body });
        if (result?.ok) {
          onSaved?.(athlete.id, body);
          onClose();
        }
      }}
    >
      {save.message && !error && (
        <p role="alert" className="rounded-ui bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {save.message}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`notes-${athlete.id}`} className="text-sm font-semibold text-ink-strong">
          Notas
        </label>
        <textarea
          id={`notes-${athlete.id}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={6}
          aria-invalid={error ? true : undefined}
          className="w-full rounded-ui border border-line bg-surface p-3 text-[0.95rem] text-ink-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        {error && (
          <p role="alert" className="text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={save.pending}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.pending}>
          Salvar notas
        </Button>
      </div>
    </form>
  );
}
