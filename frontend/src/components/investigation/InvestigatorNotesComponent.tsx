import React, { useState } from 'react';
import { InvestigatorNote } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Plus, Trash2, Clock, UserCheck, ShieldAlert } from 'lucide-react';

interface InvestigatorNotesProps {
  notes: InvestigatorNote[];
  onAddNote: (content: string) => Promise<void>;
  onDeleteNote?: (noteId: string) => Promise<void>;
  loading?: boolean;
}

export const InvestigatorNotesComponent: React.FC<InvestigatorNotesProps> = ({
  notes,
  onAddNote,
  onDeleteNote,
  loading,
}) => {
  const { user } = useAuth();
  const [newNoteText, setNewNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddNote(newNoteText.trim());
      setNewNoteText('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!onDeleteNote || deletingId) return;
    if (!window.confirm('Are you sure you want to remove this investigator note?')) return;
    setDeletingId(noteId);
    try {
      await onDeleteNote(noteId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">
              Investigator Field Notes &amp; Observations
            </h4>
            <p className="text-[11px] text-slate-400">
              Human-in-the-loop investigative notes and hypothesis tracking
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-400">
          {notes.length} Note{notes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          rows={3}
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          placeholder="Record investigative observation, corroborating evidence leads, or domain verification status..."
          className="w-full bg-slate-950/70 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-y"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!newNoteText.trim() || submitting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {submitting ? 'Saving Note...' : 'Add Note'}
          </button>
        </div>
      </form>

      {/* Notes List */}
      {loading ? (
        <div className="py-8 text-center text-slate-400 text-xs">Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="py-8 text-center text-slate-500 border border-slate-800/60 rounded-lg text-xs">
          No investigator notes recorded yet. Add your first field note above.
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const isAuthor = user?.id === note.user_id || user?.role === 'admin';

            return (
              <div
                key={note.id}
                className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 space-y-2 relative group hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5 font-mono">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-slate-200 font-semibold">
                      {note.author_name || 'Investigator'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 font-mono text-slate-500">
                      <Clock className="w-3 h-3" />
                      {new Date(note.created_at).toLocaleString()}
                    </span>
                    {isAuthor && onDeleteNote && (
                      <button
                        onClick={() => handleDelete(note.id)}
                        disabled={deletingId === note.id}
                        title="Delete note"
                        className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {note.note}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
