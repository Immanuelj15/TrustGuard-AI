import React, { useState } from 'react';
import { InvestigatorNote } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Plus, Trash2, Clock, UserCheck, ShieldAlert, Sparkles } from 'lucide-react';

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
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Investigator Field Notes &amp; Observations
            </h4>
            <p className="text-xs text-slate-500">
              Human-in-the-loop investigative notes, hypotheses, and evidence annotations
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
          {notes.length} Note{notes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <textarea
          rows={3}
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          placeholder="Record investigative observation, corroborating evidence leads, suspect profile notes, or domain verification status..."
          className="w-full bg-slate-50/80 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y transition-all"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!newNoteText.trim() || submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {submitting ? 'Saving Note...' : 'Add Note'}
          </button>
        </div>
      </form>

      {/* Notes List */}
      {loading ? (
        <div className="py-8 text-center text-slate-500 text-xs font-medium">Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="py-10 text-center border border-slate-200 rounded-2xl bg-white shadow-xs p-6">
          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-700 font-semibold">No investigator notes recorded yet</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
            Record findings, hypothesis verifications, or interviews above to preserve context for certified reporting.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const isAuthor = user?.id === note.user_id || user?.role === 'admin';

            return (
              <div
                key={note.id}
                className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-2.5 relative group hover:border-blue-300 hover:shadow-xs transition-all"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 font-medium">
                    <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                      <UserCheck className="w-3 h-3" />
                    </div>
                    <span className="text-slate-900 font-bold">
                      {note.author_name || 'Investigator'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 font-mono text-slate-400">
                      <Clock className="w-3 h-3" />
                      {new Date(note.created_at).toLocaleString()}
                    </span>
                    {isAuthor && onDeleteNote && (
                      <button
                        onClick={() => handleDelete(note.id)}
                        disabled={deletingId === note.id}
                        title="Delete note"
                        className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1 rounded hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-normal">
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
