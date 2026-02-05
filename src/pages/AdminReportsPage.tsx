// ═══════════════════════════════════════════════════════════════
// VIZZU - Admin Reports Page (report.vizzu.pro)
// Painel para admin aprovar/negar reports de geração
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { supabase } from '../services/supabaseClient';
import {
 GenerationReport,
 getAdminReports,
 reviewReport,
} from '../lib/api/reports';

const ADMIN_EMAIL = 'kaiquelearner@gmail.com';

const TYPE_LABELS: Record<string, string> = {
 'product-studio': 'Product Studio',
 'look-composer': 'Look Composer',
 'creative-still': 'Still Criativo',
 'provador': 'Provador Virtual',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
 approved: { label: 'Aprovado', color: 'text-green-400 bg-green-500/15' },
 denied: { label: 'Negado', color: 'text-red-400 bg-red-500/15' },
 pending: { label: 'Pendente', color: 'text-amber-400 bg-amber-500/15' },
};

export const AdminReportsPage: React.FC = () => {
 const { user } = useAuth();
 const { showToast } = useUI();
 const [reports, setReports] = useState<GenerationReport[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
 const [reviewingId, setReviewingId] = useState<string | null>(null);

 const isAdmin = user?.email === ADMIN_EMAIL;

 const fetchReports = useCallback(async () => {
  if (!isAdmin || !user?.email) return;
  setLoading(true);
  try {
   const result = await getAdminReports(user.email);
   if (result.success) {
    setReports(result.reports);
   }
  } catch (e) {
   console.error('Erro ao buscar reports:', e);
   showToast('Erro ao carregar reports', 'error');
  } finally {
   setLoading(false);
  }
 }, [isAdmin, user?.email]);

 useEffect(() => {
  if (isAdmin) {
   fetchReports();
  } else {
   setLoading(false);
  }
 }, [isAdmin, fetchReports]);

 const handleReview = async (reportId: string, action: 'approve' | 'deny') => {
  if (!user?.email) return;
  setReviewingId(reportId);
  try {
   const result = await reviewReport({
    reportId,
    adminEmail: user.email,
    action,
   });
   if (result.success) {
    showToast(action === 'approve' ? 'Report aprovado! 1 crédito adicionado.' : 'Report negado.', action === 'approve' ? 'success' : 'info');
    // Mover da lista
    setReports(prev =>
     prev.map(r =>
      r.id === reportId
       ? { ...r, status: action === 'approve' ? 'approved' : 'denied', reviewed_at: new Date().toISOString(), reviewed_by: user.email! }
       : r
     )
    );
   }
  } catch (e: any) {
   showToast(e.message || 'Erro ao revisar report', 'error');
  } finally {
   setReviewingId(null);
  }
 };

 const pendingReports = reports.filter(r => r.status === 'pending');
 const historyReports = reports.filter(r => r.status !== 'pending');

 const displayReports = activeTab === 'pending' ? pendingReports : historyReports;

 // ============================================================
 // AUTH STATES
 // ============================================================

 const handleGoogleLogin = async () => {
  await supabase.auth.signInWithOAuth({
   provider: 'google',
   options: {
    redirectTo: window.location.origin,
    queryParams: { prompt: 'select_account' },
   },
  });
 };

 if (!user) {
  return (
   <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="max-w-sm w-full mx-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
     <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center mb-6">
      <i className="fas fa-shield-halved text-white text-2xl"></i>
     </div>
     <h1 className="text-white text-xl font-bold mb-2">Vizzu Reports</h1>
     <p className="text-neutral-400 text-sm mb-6">Painel administrativo de reports</p>
     <button
      onClick={handleGoogleLogin}
      className="w-full py-3 bg-white text-black rounded-xl font-semibold text-sm flex items-center justify-center gap-3 hover:bg-gray-100 transition-colors"
     >
      <i className="fab fa-google"></i>
      Entrar com Google
     </button>
    </div>
   </div>
  );
 }

 if (!isAdmin) {
  return (
   <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="max-w-sm w-full mx-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
     <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-6">
      <i className="fas fa-lock text-red-400 text-2xl"></i>
     </div>
     <h1 className="text-white text-xl font-bold mb-2">Acesso Não Autorizado</h1>
     <p className="text-neutral-400 text-sm mb-2">Você não tem permissão para acessar esta página.</p>
     <p className="text-neutral-600 text-xs">{user.email}</p>
    </div>
   </div>
  );
 }

 // ============================================================
 // ADMIN PANEL
 // ============================================================

 return (
  <div className="min-h-screen bg-black">
   {/* Header */}
   <div className="bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] px-4 py-4 sticky top-0 z-40">
    <div className="max-w-5xl mx-auto flex items-center justify-between">
     <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
       <i className="fas fa-flag text-white"></i>
      </div>
      <div>
       <h1 className="text-white text-base font-bold">Vizzu Reports</h1>
       <p className="text-white/60 text-xs">{pendingReports.length} pendente{pendingReports.length !== 1 ? 's' : ''}</p>
      </div>
     </div>
     <button
      onClick={fetchReports}
      disabled={loading}
      className="w-9 h-9 rounded-lg bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
     >
      <i className={`fas fa-arrows-rotate text-sm ${loading ? 'fa-spin' : ''}`}></i>
     </button>
    </div>
   </div>

   {/* Tabs */}
   <div className="max-w-5xl mx-auto px-4 pt-4">
    <div className="flex gap-2 mb-4">
     <button
      onClick={() => setActiveTab('pending')}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
       activeTab === 'pending'
        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-neutral-700'
      }`}
     >
      <i className="fas fa-clock mr-2"></i>
      Pendentes ({pendingReports.length})
     </button>
     <button
      onClick={() => setActiveTab('history')}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
       activeTab === 'history'
        ? 'bg-neutral-700 text-white border border-neutral-600'
        : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-neutral-700'
      }`}
     >
      <i className="fas fa-history mr-2"></i>
      Histórico ({historyReports.length})
     </button>
    </div>

    {/* Loading */}
    {loading && (
     <div className="text-center py-12">
      <i className="fas fa-spinner fa-spin text-[#FF6B6B] text-2xl mb-3"></i>
      <p className="text-neutral-500 text-sm">Carregando reports...</p>
     </div>
    )}

    {/* Empty State */}
    {!loading && displayReports.length === 0 && (
     <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto rounded-full bg-neutral-800 flex items-center justify-center mb-4">
       <i className={`fas ${activeTab === 'pending' ? 'fa-check-double' : 'fa-inbox'} text-neutral-600 text-xl`}></i>
      </div>
      <p className="text-neutral-400 text-sm">
       {activeTab === 'pending' ? 'Nenhum report pendente!' : 'Nenhum report no histórico.'}
      </p>
     </div>
    )}

    {/* Report Cards */}
    {!loading && (
     <div className="space-y-3 pb-8">
      {displayReports.map(report => (
       <div
        key={report.id}
        className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
       >
        <div className="flex flex-col md:flex-row">
         {/* Imagem */}
         <div className="md:w-48 flex-shrink-0">
          <div className="aspect-square md:aspect-auto md:h-full bg-neutral-800 relative">
           <img
            src={report.generated_image_url}
            alt="Imagem reportada"
            className="w-full h-full object-cover"
            loading="lazy"
           />
           {/* Badge tipo */}
           <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/60 text-white">
            {TYPE_LABELS[report.generation_type] || report.generation_type}
           </span>
          </div>
         </div>

         {/* Info */}
         <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-2">
           <div>
            <p className="text-white text-sm font-medium">
             {report.user_name || report.user_email || 'Usuário'}
            </p>
            <p className="text-neutral-500 text-xs">{report.user_email}</p>
           </div>
           {report.status !== 'pending' && (
            <span className={`px-2 py-1 rounded-md text-[10px] font-semibold ${STATUS_LABELS[report.status]?.color || ''}`}>
             {STATUS_LABELS[report.status]?.label || report.status}
            </span>
           )}
          </div>

          {/* Produto */}
          {report.product_name && (
           <p className="text-neutral-400 text-xs mb-2">
            <i className="fas fa-tag mr-1"></i>{report.product_name}
           </p>
          )}

          {/* Observação */}
          <div className="bg-neutral-800 rounded-lg p-3 mb-3">
           <p className="text-neutral-300 text-xs leading-relaxed">{report.observation}</p>
          </div>

          {/* Data */}
          <p className="text-neutral-600 text-[10px] mb-3">
           <i className="fas fa-calendar mr-1"></i>
           {new Date(report.created_at).toLocaleString('pt-BR')}
           {report.reviewed_at && (
            <span className="ml-3">
             <i className="fas fa-gavel mr-1"></i>
             Revisado em {new Date(report.reviewed_at).toLocaleString('pt-BR')}
            </span>
           )}
          </p>

          {/* Actions (only pending) */}
          {report.status === 'pending' && (
           <div className="flex gap-2">
            <button
             onClick={() => handleReview(report.id, 'approve')}
             disabled={reviewingId === report.id}
             className="flex-1 py-2.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl text-sm font-semibold hover:bg-green-500/30 transition-colors disabled:opacity-50"
            >
             {reviewingId === report.id ? (
              <i className="fas fa-spinner fa-spin"></i>
             ) : (
              <><i className="fas fa-check mr-2"></i>Aprovar</>
             )}
            </button>
            <button
             onClick={() => handleReview(report.id, 'deny')}
             disabled={reviewingId === report.id}
             className="flex-1 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-sm font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
             {reviewingId === report.id ? (
              <i className="fas fa-spinner fa-spin"></i>
             ) : (
              <><i className="fas fa-times mr-2"></i>Negar</>
             )}
            </button>
           </div>
          )}
         </div>

         {/* Imagem original (se existir) */}
         {report.original_image_url && (
          <div className="md:w-32 flex-shrink-0 p-2 md:p-0">
           <div className="md:h-full bg-neutral-800 rounded-lg md:rounded-none overflow-hidden">
            <p className="text-center text-neutral-600 text-[9px] py-1 bg-neutral-800/80">Original</p>
            <img
             src={report.original_image_url}
             alt="Original"
             className="w-full h-32 md:h-[calc(100%-20px)] object-cover"
             loading="lazy"
            />
           </div>
          </div>
         )}
        </div>
       </div>
      ))}
     </div>
    )}
   </div>
  </div>
 );
};
