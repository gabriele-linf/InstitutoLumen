/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate,
  Link
} from 'react-router-dom';
import { auth, db, storage, handleFirestoreError } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserProfile, AcademicRequest, UserRole, RequestStatus, OperationType } from './types';
import { 
  Book, 
  User as UserIcon, 
  LogOut, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight,
  ArrowLeft,
  Loader2,
  Trash2,
  Paperclip,
  FileText,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Components ---

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <Loader2 className="w-8 h-8 text-slate-600 animate-spin" />
  </div>
);

const ErrorBoundary = ({ error }: { error: string }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
    <p className="font-semibold">Erro detectado:</p>
    <p className="mt-1 font-mono break-all">{error}</p>
  </div>
);

// --- Pages ---

const LandingPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-32 h-32 text-[#6B8E9B]" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold text-lumen tracking-tight">Instituto Lúmen</h1>
        <p className="text-brand-text mt-2">Portal de Solicitações Acadêmicas</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link 
          to="/login/student"
          className="group bg-white p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all border border-transparent hover:border-brand-border flex flex-col items-center text-center"
        >
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-slate-200 transition-colors">
            <UserIcon className="w-6 h-6 text-brand-text" />
          </div>
          <h2 className="text-xl font-semibold text-lumen">Sou Estudante</h2>
          <p className="text-sm text-brand-text mt-2">Acesse para realizar e acompanhar seus pedidos.</p>
        </Link>

        <Link 
          to="/login/staff"
          className="group bg-brand-button p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all border border-transparent hover:border-brand-border flex flex-col items-center text-center"
        >
          <div className="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-slate-600 transition-colors">
            <UserIcon className="w-6 h-6 text-slate-300" />
          </div>
          <h2 className="text-xl font-semibold text-white">Sou Funcionário</h2>
          <p className="text-sm text-slate-400 mt-2">Gerencie as solicitações da instituição.</p>
        </Link>
      </div>
    </div>
  );
};

const AuthPage = ({ role }: { role: UserRole }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (role === 'staff' && !email.endsWith('@lumen.com')) {
        throw new Error('Email de funcionário deve terminar com @lumen.com');
      }

      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            role: role,
            createdAt: new Date().toISOString()
          });
        } catch (dbError) {
          handleFirestoreError(dbError, OperationType.CREATE, `users/${user.uid}`);
        }
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden p-10"
      >
        <div className="flex flex-col items-center mb-8">
          <BookOpen className="w-24 h-24 text-[#6B8E9B] mb-4" strokeWidth={1.5} />
          <h2 className="text-2xl font-bold text-lumen">Instituto Lúmen</h2>
          <p className="text-brand-text text-sm">{role === 'student' ? 'Portal do Estudante' : 'Portal do Funcionário'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Nome</label>
              <input 
                type="text" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 focus:border-slate-400 outline-none transition-all"
                placeholder="Seu nome completo"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 focus:border-slate-400 outline-none transition-all"
              placeholder={role === 'staff' ? "email@lumen.com" : "seu@email.com"}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Senha</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 focus:border-slate-400 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          {error && <ErrorBoundary error={error} />}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-brand-button hover:opacity-90 text-white font-semibold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Entrar' : 'Inscrever-se')}
          </button>
        </form>

        <div className="mt-8 text-center space-y-2">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
          >
            {isLogin ? (role === 'student' ? 'Primeiro acesso?' : 'Não tem conta?') : 'Já tem uma conta? Entrar'}
          </button>
          <div>
            <Link to="/" className="text-slate-400 hover:text-slate-600 text-xs flex items-center justify-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Voltar ao início
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ profile }: { profile: UserProfile }) => {
  const [requests, setRequests] = useState<AcademicRequest[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [selectedRequest, setSelectedRequest] = useState<AcademicRequest | null>(null);
  const [editStatus, setEditStatus] = useState<RequestStatus>('pending');
  const [editReply, setEditReply] = useState('');
  const [editAttachment, setEditAttachment] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    
    if (profile.role === 'student') {
      q = query(collection(db, 'requests'), where('studentId', '==', profile.uid), orderBy('createdAt', 'desc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs: AcademicRequest[] = [];
      snapshot.forEach((doc) => {
        reqs.push({ id: doc.id, ...doc.data() } as AcademicRequest);
      });
      setRequests(reqs);
      
      // Update selected request if it's currently open
      if (selectedRequest) {
        const updated = reqs.find(r => r.id === selectedRequest.id);
        if (updated) setSelectedRequest(updated);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'requests');
    });

    return () => unsubscribe();
  }, [profile, selectedRequest?.id]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let attachmentUrl = undefined;
      let attachmentName = undefined;

      if (attachment) {
        const fileExt = attachment.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `attachments/${profile.uid}/${fileName}`;
        
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, attachment);
        attachmentUrl = await getDownloadURL(storageRef);
        attachmentName = attachment.name;
      }

      const newRequestId = crypto.randomUUID();
      const newRequest = {
        id: newRequestId,
        studentId: profile.uid,
        studentName: profile.name,
        title: newTitle,
        description: newDescription,
        status: 'pending' as RequestStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(attachmentUrl && { attachmentUrl }),
        ...(attachmentName && { attachmentName })
      };

      await setDoc(doc(db, 'requests', newRequestId), newRequest);

      setShowNewModal(false);
      setNewTitle('');
      setNewDescription('');
      setAttachment(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'requests');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openRequest = (req: AcademicRequest) => {
    setSelectedRequest(req);
    setEditStatus(req.status);
    setEditReply(req.staffReply || '');
    setEditAttachment(null);
  };

  const handleSaveDetails = async () => {
    if (!selectedRequest) return;
    setIsSaving(true);
    try {
      let staffAttachmentUrl = selectedRequest.staffAttachmentUrl;
      let staffAttachmentName = selectedRequest.staffAttachmentName;

      if (editAttachment) {
        const fileExt = editAttachment.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `attachments/${profile.uid}/${fileName}`;
        
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, editAttachment);
        staffAttachmentUrl = await getDownloadURL(storageRef);
        staffAttachmentName = editAttachment.name;
      }

      await updateDoc(doc(db, 'requests', selectedRequest.id), {
        status: editStatus,
        staffReply: editReply,
        updatedAt: new Date().toISOString(),
        ...(staffAttachmentUrl && { staffAttachmentUrl }),
        ...(staffAttachmentName && { staffAttachmentName })
      });

      setSelectedRequest(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `requests/${selectedRequest.id}`);
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta solicitação?')) return;
    try {
      await deleteDoc(doc(db, 'requests', requestId));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `requests/${requestId}`);
    }
  };

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'in-analysis': return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    }
  };

  const getStatusLabel = (status: RequestStatus) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'in-analysis': return 'Em Análise';
      case 'completed': return 'Concluída';
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-brand-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <BookOpen className="w-10 h-10 text-[#6B8E9B]" strokeWidth={1.5} />
          <div>
            <h1 className="font-bold text-lumen leading-none">Instituto Lúmen</h1>
            <p className="text-xs text-brand-text mt-1 uppercase tracking-wider font-medium">Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">{profile.name}</p>
            <p className="text-xs text-slate-400">{profile.role === 'student' ? 'Estudante' : 'Funcionário'}</p>
          </div>
          <button 
            onClick={handleSignOut}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Sair"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-lumen">Solicitações</h2>
          {profile.role === 'student' && (
            <button 
              onClick={() => setShowNewModal(true)}
              className="bg-brand-button hover:opacity-90 text-white px-6 py-3 rounded-2xl shadow-lg transition-all flex items-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" /> Nova Solicitação
            </button>
          )}
        </div>

        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
              <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400">Nenhuma solicitação encontrada.</p>
            </div>
          ) : (
            requests.map((req) => (
              <motion.div 
                layout
                key={req.id}
                onClick={() => openRequest(req)}
                className="bg-white p-6 rounded-3xl shadow-sm border border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md hover:border-brand-button cursor-pointer transition-all group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(req.status)}
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-text">
                      {getStatusLabel(req.status)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-lumen group-hover:text-brand-button transition-colors">{req.title}</h3>
                  <p className="text-brand-text text-sm line-clamp-1 mt-1">{req.description}</p>
                  
                  <div className="mt-4 flex items-center gap-4 text-[10px] text-brand-text uppercase tracking-widest font-bold">
                    <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                    {profile.role === 'staff' && (
                      <>
                        <span>•</span>
                        <span className="text-slate-500">Por: {req.studentName}</span>
                      </>
                    )}
                    {(req.attachmentUrl || req.staffAttachmentUrl) && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-500"><Paperclip className="w-3 h-3"/> Anexos</span>
                      </>
                    )}
                    {req.staffReply && (
                      <>
                        <span>•</span>
                        <span className="text-blue-500">Respondido</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-brand-button group-hover:text-white text-slate-400 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* Request Details Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedRequest(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-3xl max-h-[90vh] rounded-[32px] shadow-2xl relative z-10 overflow-hidden flex flex-col"
            >
              <div className="p-6 sm:p-8 border-b border-brand-border flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-lumen">Detalhes da Solicitação</h3>
                <button onClick={() => setSelectedRequest(null)} className="text-brand-text hover:text-slate-600 p-2">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              
              <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-8">
                {/* Info Section */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    {getStatusIcon(selectedRequest.status)}
                    <span className="text-sm font-bold uppercase tracking-wider text-brand-text">
                      {getStatusLabel(selectedRequest.status)}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">ID: {selectedRequest.id.slice(0,8)}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">{selectedRequest.title}</h2>
                  <p className="text-sm text-slate-500 mb-6">Enviado por <span className="font-semibold text-slate-700">{selectedRequest.studentName}</span> em {new Date(selectedRequest.createdAt).toLocaleDateString()}</p>
                  
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Descrição</h4>
                    <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">{selectedRequest.description}</p>
                  </div>

                  {selectedRequest.attachmentUrl && (
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Anexo do Estudante</h4>
                      <a href={selectedRequest.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-brand-button hover:text-slate-600 transition-colors bg-slate-50 px-4 py-2.5 rounded-xl border border-brand-border">
                        <Paperclip className="w-4 h-4" />
                        <span>{selectedRequest.attachmentName || 'Visualizar Anexo'}</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Staff Action / Reply Section */}
                <div className="border-t border-slate-100 pt-8">
                  <h4 className="text-lg font-bold text-slate-800 mb-4">Resposta da Instituição</h4>
                  
                  {profile.role === 'staff' ? (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                          <select 
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as RequestStatus)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-button outline-none text-sm font-medium text-slate-700"
                          >
                            <option value="pending">Pendente</option>
                            <option value="in-analysis">Em Análise</option>
                            <option value="completed">Concluída</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Anexar Arquivo</label>
                          <div className="relative">
                            <input type="file" id="staff-file" onChange={(e) => setEditAttachment(e.target.files?.[0] || null)} className="hidden" />
                            <label htmlFor="staff-file" className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 hover:border-brand-button rounded-xl cursor-pointer transition-all">
                              <span className="text-sm text-slate-600 truncate pr-4">
                                {editAttachment ? editAttachment.name : (selectedRequest.staffAttachmentName || 'Selecionar arquivo...')}
                              </span>
                              <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mensagem</label>
                        <textarea
                          value={editReply}
                          onChange={(e) => setEditReply(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-brand-button outline-none transition-all resize-none text-sm text-slate-700"
                          placeholder="Escreva a resposta para o estudante..."
                          rows={4}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedRequest.staffReply ? (
                        <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                          <p className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">{selectedRequest.staffReply}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">A instituição ainda não respondeu a esta solicitação.</p>
                      )}
                      
                      {selectedRequest.staffAttachmentUrl && (
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Anexo da Instituição</h4>
                          <a href={selectedRequest.staffAttachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100">
                            <Paperclip className="w-4 h-4" />
                            <span>{selectedRequest.staffAttachmentName || 'Visualizar Anexo'}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 sm:p-8 border-t border-brand-border bg-slate-50 flex justify-end gap-3 shrink-0">
                {profile.role === 'student' && selectedRequest.status === 'pending' && (
                  <button 
                    onClick={() => { handleDeleteRequest(selectedRequest.id); setSelectedRequest(null); }}
                    className="px-6 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors mr-auto flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Excluir
                  </button>
                )}
                
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {profile.role === 'staff' ? 'Cancelar' : 'Fechar'}
                </button>
                
                {profile.role === 'staff' && (
                  <button 
                    onClick={handleSaveDetails}
                    disabled={isSaving}
                    className="px-8 py-3 text-sm font-bold bg-brand-button text-white rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-brand-button/20"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Salvar Alterações
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Request Modal */}
      <AnimatePresence>
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8 border-b border-brand-border flex items-center justify-between">
                <h3 className="text-xl font-bold text-lumen">Nova Solicitação</h3>
                <button onClick={() => setShowNewModal(false)} className="text-brand-text hover:text-slate-600">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              <form onSubmit={handleCreateRequest} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-brand-text uppercase tracking-widest mb-2">Título</label>
                  <input 
                    type="text" 
                    required 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-b border-brand-border focus:border-brand-button outline-none transition-all"
                    placeholder="Ex: Declaração de Matrícula"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-brand-text uppercase tracking-widest mb-2">Descrição</label>
                  <textarea 
                    required 
                    rows={4}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-b border-brand-border focus:border-brand-button outline-none transition-all resize-none"
                    placeholder="Descreva detalhadamente sua necessidade..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-text uppercase tracking-widest mb-2">Anexo (Opcional)</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      id="file-upload"
                      onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <label 
                      htmlFor="file-upload"
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-brand-border hover:border-brand-button cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-2 text-sm text-slate-500 group-hover:text-slate-700 truncate">
                        <FileText className="w-4 h-4 text-brand-button" />
                        <span className="truncate">{attachment ? attachment.name : 'Selecionar arquivo...'}</span>
                      </div>
                      <Paperclip className="w-4 h-4 text-brand-text" />
                    </label>
                  </div>
                </div>

                {error && <ErrorBoundary error={error} />}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-brand-button hover:opacity-90 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Solicitação'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
        <Route path="/login/student" element={user ? <Navigate to="/dashboard" /> : <AuthPage role="student" />} />
        <Route path="/login/staff" element={user ? <Navigate to="/dashboard" /> : <AuthPage role="staff" />} />
        <Route 
          path="/dashboard" 
          element={
            user && profile ? <Dashboard profile={profile} /> : <Navigate to="/" />
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
