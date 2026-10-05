import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Shield, CheckCircle, Clock, Search, RefreshCw } from 'lucide-react';
import { apiClient } from '../../api/client';
import { User } from '../../types';

interface AdminUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/users');
      setUsers(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load user registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'investigator':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'reviewer':
        return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'demo_user':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">User Administration & RBAC Roster</h3>
                <p className="text-xs text-slate-500">
                  Authorized system operators, investigators, and reviewers across forensic agency units.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar & Stats */}
          <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between gap-4 bg-white">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-sans"
              />
            </div>
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto flex-1">
            {error ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {error}
              </div>
            ) : loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Loading user registry...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No users found matching query.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Operator / Name</th>
                      <th className="py-2.5 px-4">Email</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[11px] text-slate-700">
                            {u.full_name?.charAt(0) || 'U'}
                          </div>
                          <span>{u.full_name}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{u.email}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase ${getRoleBadge(
                              u.role
                            )}`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.is_active ? (
                            <span className="flex items-center gap-1 text-emerald-700 text-[11px] font-medium">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Suspended</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Seeded'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              <span>Role permissions are strictly enforced on all backend API requests via JWT claims.</span>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
