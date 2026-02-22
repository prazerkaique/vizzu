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

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
 'product-studio': { label: 'Product Studio', icon: 'fa-camera', color: 'from-[#FF6B6B] to-[#FF9F43]' },
 'look-composer': { label: 'Look Composer', icon: 'fa-shirt', color: 'from-purple-500 to-pink-500' },
 'creative-still': { label: 'Still Criativo', icon: 'fa-palette', color: 'from-amber-500 to-orange-500' },
 'provador': { label: 'Provador Virtual', icon: 'fa-user-check', color: 'from-blue-500 to-cyan-500' },
};

const STATUS_CONFIG: Record<string, { label: string; icon: string; bg: string; text: string }> = {
 approved: { label: 'Aprovado', icon: 'fa-check-circle', bg: 'bg-green-50 border-green-200', text: 'text-green-600' },
 denied: { label: 'Negado', icon: 'fa-times-circle', bg: 'bg-red-50 border-red-200', text: 'text-red-500' },
 pending: { label: 'Pendente', icon: 'fa-clock', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600' },
};

export const AdminReportsPage: React.FC = () => {
 const { user } = useAuth();
 const { showToast } = useUI();
 const [reports, setReports] = useState<GenerationReport[]>([]);
 const [loading, setLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
 const [reviewingId, setReviewingId] = useState<string | null>(null);
 const [expandedImage, setExpandedImage] = useState<string | null>(null);

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
    showToast(
     action === 'approve' ? 'Report aprovado! 1 crédito adicionado.' : 'Report negado.',
     action === 'approve' ? 'success' : 'info'
    );
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

 const handleGoogleLogin = async () => {
  await supabase.auth.signInWithOAuth({
   provider: 'google',
   options: {
    redirectTo: window.location.origin,
    queryParams: { prompt: 'select_account' },
   },
  });
 };

 const pendingReports = reports.filter(r => r.status === 'pending');
 const historyReports = reports.filter(r => r.status !== 'pending');
 const displayReports = activeTab === 'pending' ? pendingReports : historyReports;

 const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `há ${diffMins}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
 };

 // ============================================================
 // LOGIN
 // ============================================================

 if (!user) {
  return (
   <div className="min-h-screen bg-[#f7f5f2] flex items-center justify-center"
    style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
    <div className="max-w-sm w-full mx-4">
     <div className="text-center mb-8">
      <img src="/Logo2Black.png" alt="Vizzu" className="h-12 w-auto mx-auto mb-3" />
      <p className="text-gray-400 text-xs font-serif italic">Painel de Reports</p>
     </div>
     <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
      <div className="w-14 h-14 mx-auto rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] flex items-center justify-center mb-5">
       <i className="fas fa-flag text-white text-xl"></i>
      </div>
      <h2 className="text-gray-900 text-lg font-bold font-serif mb-1">Acesso Administrativo</h2>
      <p className="text-gray-500 text-sm mb-6">Entre com sua conta Google para continuar</p>
      <button
       onClick={handleGoogleLogin}
       className="w-full py-3 bg-gray-50 text-gray-900 rounded-xl font-medium text-sm flex items-center justify-center gap-3 hover:bg-gray-100 border border-gray-200 transition-colors"
      >
       <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
       </svg>
       Entrar com Google
      </button>
     </div>
    </div>
   </div>
  );
 }

 if (!isAdmin) {
  return (
   <div className="min-h-screen bg-[#f7f5f2] flex items-center justify-center">
    <div className="max-w-sm w-full mx-4 bg-white rounded-2xl p-8 border border-gray-200 text-center">
     <div className="w-14 h-14 mx-auto rounded-xl bg-red-50 flex items-center justify-center mb-5">
      <i className="fas fa-lock text-red-400 text-xl"></i>
     </div>
     <h2 className="text-gray-900 text-lg font-bold font-serif mb-1">Acesso Restrito</h2>
     <p className="text-gray-500 text-sm mb-1">Você não tem permissão para acessar esta página.</p>
     <p className="text-gray-400 text-xs mt-3">{user.email}</p>
    </div>
   </div>
  );
 }

 // ============================================================
 // ADMIN PANEL
 // ============================================================

 return (
  <div className="min-h-screen bg-[#f7f5f2]">
   {/* Header */}
   <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-40">
    <div className="max-w-5xl mx-auto flex items-center justify-between">
     <div className="flex items-center gap-3">
      <img src="/Logo2Black.png" alt="Vizzu" className="h-7 w-auto" />
      <div className="w-px h-6 bg-gray-200"></div>
      <div>
       <h1 className="text-gray-900 text-sm font-bold flex items-center gap-2">
        <i className="fas fa-flag text-[#FF6B6B] text-xs"></i>
        Reports
       </h1>
       <p className="text-gray-400 text-[10px]">
        {pendingReports.length} pendente{pendingReports.length !== 1 ? 's' : ''}
       </p>
      </div>
     </div>
     <button
      onClick={fetchReports}
      disabled={loading}
      className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-100 transition-colors"
     >
      <i className={`fas fa-arrows-rotate text-xs ${loading ? 'fa-spin' : ''}`}></i>
     </button>
    </div>
   </div>

   {/* Tabs */}
   <div className="max-w-5xl mx-auto px-4 pt-5">
    <div className="flex gap-2 mb-5">
     <button
      onClick={() => setActiveTab('pending')}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
       activeTab === 'pending'
        ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white'
        : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
      }`}
     >
      <i className="fas fa-clock mr-2 text-xs"></i>
      Pendentes ({pendingReports.length})
     </button>
     <button
      onClick={() => setActiveTab('history')}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
       activeTab === 'history'
        ? 'bg-gray-900 text-white'
        : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
      }`}
     >
      <i className="fas fa-history mr-2 text-xs"></i>
      Histórico ({historyReports.length})
     </button>
    </div>

    {/* Loading */}
    {loading && (
     <div className="text-center py-16">
      <div className="w-12 h-12 mx-auto rounded-xl bg-white border border-gray-200 flex items-center justify-center mb-4">
       <i className="fas fa-spinner fa-spin text-[#FF6B6B]"></i>
      </div>
      <p className="text-gray-400 text-sm">Carregando reports...</p>
     </div>
    )}

    {/* Empty State */}
    {!loading && displayReports.length === 0 && (
     <div className="text-center py-20">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-white border border-gray-200 flex items-center justify-center mb-4">
       <i className={`fas ${activeTab === 'pending' ? 'fa-check-double text-green-400' : 'fa-inbox text-gray-300'} text-xl`}></i>
      </div>
      <h3 className="text-gray-900 font-semibold font-serif mb-1">
       {activeTab === 'pending' ? 'Tudo em dia!' : 'Histórico vazio'}
      </h3>
      <p className="text-gray-400 text-sm">
       {activeTab === 'pending' ? 'Nenhum report pendente para revisão.' : 'Nenhum report revisado ainda.'}
      </p>
     </div>
    )}

    {/* Report Cards */}
    {!loading && (
     <div className="space-y-4 pb-10">
      {displayReports.map(report => {
       const typeInfo = TYPE_LABELS[report.generation_type] || { label: report.generation_type, icon: 'fa-image', color: 'from-gray-400 to-gray-500' };
       const statusInfo = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;

       return (
        <div
         key={report.id}
         className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 transition-colors"
        >
         <div className="flex flex-col md:flex-row">
          {/* Imagem gerada */}
          <div className="md:w-52 flex-shrink-0 relative group">
           <div
            className="aspect-square md:aspect-auto md:h-full bg-gray-100 cursor-pointer"
            onClick={() => setExpandedImage(report.generated_image_url)}
           >
            <img
             src={report.generated_image_url}
             alt="Imagem reportada"
             className="w-full h-full object-cover"
             loading="lazy"
            />
           </div>
           {/* Badge tipo */}
           <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-gradient-to-r ${typeInfo.color} text-white text-[10px] font-semibold flex items-center gap-1.5`}>
            <i className={`fas ${typeInfo.icon} text-[8px]`}></i>
            {typeInfo.label}
           </div>
           {/* Zoom hint */}
           <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <i className="fas fa-search-plus text-white opacity-0 group-hover:opacity-70 transition-opacity text-lg"></i>
           </div>
          </div>

          {/* Info */}
          <div className="flex-1 p-5">
           {/* Header: nome + status */}
           <div className="flex items-start justify-between mb-3">
            <div>
             <p className="text-gray-900 text-sm font-semibold">
              {report.user_name || 'Usuário'}
             </p>
             <p className="text-gray-400 text-xs">{report.user_email}</p>
            </div>
            {report.status !== 'pending' && (
             <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border flex items-center gap-1 ${statusInfo.bg} ${statusInfo.text}`}>
              <i className={`fas ${statusInfo.icon} text-[8px]`}></i>
              {statusInfo.label}
             </span>
            )}
           </div>

           {/* Produto */}
           {report.product_name && (
            <div className="flex items-center gap-1.5 mb-3">
             <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-medium">
              <i className="fas fa-tag mr-1 text-[8px]"></i>{report.product_name}
             </span>
            </div>
           )}

           {/* Observação */}
           <div className="bg-[#f7f5f2] rounded-xl p-3.5 mb-3 border border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 font-medium">Observação do usuário</p>
            <p className="text-gray-700 text-xs leading-relaxed">{report.observation}</p>
           </div>

           {/* Data */}
           <p className="text-gray-400 text-[10px] mb-4 flex items-center gap-3">
            <span><i className="far fa-clock mr-1"></i>{formatDate(report.created_at)}</span>
            {report.reviewed_at && (
             <span><i className="fas fa-gavel mr-1"></i>{formatDate(report.reviewed_at)}</span>
            )}
           </p>

           {/* Actions (only pending) */}
           {report.status === 'pending' && (
            <div className="flex gap-2">
             <button
              onClick={() => handleReview(report.id, 'approve')}
              disabled={reviewingId === report.id}
              className="flex-1 py-2.5 bg-green-50 text-green-600 border border-green-200 rounded-xl text-sm font-semibold hover:bg-green-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
             >
              {reviewingId === report.id ? (
               <i className="fas fa-spinner fa-spin text-xs"></i>
              ) : (
               <><i className="fas fa-check text-xs"></i>Aprovar (+1 cred.)</>
              )}
             </button>
             <button
              onClick={() => handleReview(report.id, 'deny')}
              disabled={reviewingId === report.id}
              className="flex-1 py-2.5 bg-red-50 text-red-500 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
             >
              {reviewingId === report.id ? (
               <i className="fas fa-spinner fa-spin text-xs"></i>
              ) : (
               <><i className="fas fa-times text-xs"></i>Negar</>
              )}
             </button>
            </div>
           )}
          </div>

          {/* Imagem original (se existir) */}
          {report.original_image_url && (
           <div className="md:w-36 flex-shrink-0 p-3 md:p-0 md:border-l border-gray-100">
            <div
             className="md:h-full bg-gray-50 md:rounded-none rounded-xl overflow-hidden cursor-pointer"
             onClick={() => setExpandedImage(report.original_image_url!)}
            >
             <p className="text-center text-gray-400 text-[9px] font-medium py-1.5 bg-gray-50 border-b border-gray-100 uppercase tracking-wide">
              Referência
             </p>
             <img
              src={report.original_image_url}
              alt="Original"
              className="w-full h-32 md:h-[calc(100%-28px)] object-cover"
              loading="lazy"
             />
            </div>
           </div>
          )}
         </div>
        </div>
       );
      })}
     </div>
    )}
   </div>

   {/* Modal: Expandir Imagem */}
   {expandedImage && (
    <div
     className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
     onClick={() => setExpandedImage(null)}
    >
     <button
      onClick={() => setExpandedImage(null)}
      className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
     >
      <i className="fas fa-times"></i>
     </button>
     <img
      src={expandedImage}
      alt="Imagem expandida"
      className="max-w-full max-h-[85vh] object-contain rounded-2xl"
      onClick={e => e.stopPropagation()}
     />
    </div>
   )}
  </div>
 );
};
