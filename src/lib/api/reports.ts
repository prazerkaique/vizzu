// ═══════════════════════════════════════════════════════════════
// VIZZU - Reports API
// Envio e gerenciamento de reports de geração
// ═══════════════════════════════════════════════════════════════

import { supabase } from '../../services/supabaseClient';

const N8N_BASE_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

export type ReportGenerationType = 'product-studio' | 'look-composer' | 'creative-still' | 'provador';
export type ReportStatus = 'pending' | 'approved' | 'denied';

export interface GenerationReport {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  generation_type: ReportGenerationType;
  generation_id: string | null;
  product_name: string | null;
  generated_image_url: string;
  original_image_url: string | null;
  observation: string;
  status: ReportStatus;
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  user_notified: boolean;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════
// SUBMETER REPORT (usuario → Supabase + N8N WhatsApp)
// ═══════════════════════════════════════════════════════════════

interface SubmitReportParams {
  userId: string;
  userEmail: string;
  userName: string;
  generationType: ReportGenerationType;
  generationId?: string;
  productName?: string;
  generatedImageUrl: string;
  originalImageUrl?: string;
  observation: string;
}

export async function submitReport(params: SubmitReportParams): Promise<{ success: boolean; reportId?: string; error?: string }> {
  const { data, error } = await supabase
    .from('generation_reports')
    .insert({
      user_id: params.userId,
      user_email: params.userEmail,
      user_name: params.userName,
      generation_type: params.generationType,
      generation_id: params.generationId || null,
      product_name: params.productName || null,
      generated_image_url: params.generatedImageUrl,
      original_image_url: params.originalImageUrl || null,
      observation: params.observation,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Erro ao salvar report:', error);
    return { success: false, error: error.message };
  }

  // Notificar admin via N8N (WhatsApp) — fire and forget
  try {
    await fetch(`${N8N_BASE_URL}/vizzu/report-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report_id: data.id,
        user_name: params.userName,
        user_email: params.userEmail,
        generation_type: params.generationType,
        product_name: params.productName || 'N/A',
        generated_image_url: params.generatedImageUrl,
        original_image_url: params.originalImageUrl || null,
        observation: params.observation,
        admin_panel_url: 'https://report.vizzu.pro',
      }),
    });
  } catch (e) {
    console.error('Erro ao enviar notificacao WhatsApp:', e);
  }

  return { success: true, reportId: data.id };
}

// ═══════════════════════════════════════════════════════════════
// CHECAR REPORTS REVISADOS (notificação no app load)
// ═══════════════════════════════════════════════════════════════

export async function getReviewedReports(userId: string): Promise<GenerationReport[]> {
  const { data, error } = await supabase
    .from('generation_reports')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'pending')
    .eq('user_notified', false)
    .order('reviewed_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar reports revisados:', error);
    return [];
  }
  return data || [];
}

// ═══════════════════════════════════════════════════════════════
// MARCAR REPORTS COMO NOTIFICADOS
// ═══════════════════════════════════════════════════════════════

export async function markReportsNotified(reportIds: string[]): Promise<void> {
  if (reportIds.length === 0) return;

  const { error } = await supabase
    .from('generation_reports')
    .update({ user_notified: true })
    .in('id', reportIds);

  if (error) {
    console.error('Erro ao marcar reports como notificados:', error);
  }
}

// ═══════════════════════════════════════════════════════════════
// ADMIN: BUSCAR REPORTS (via N8N — bypassa RLS)
// ═══════════════════════════════════════════════════════════════

export async function getAdminReports(adminEmail: string): Promise<{ success: boolean; reports: GenerationReport[]; error?: string }> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/admin-reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ admin_email: adminEmail }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Erro ao buscar reports');
  return data;
}

// ═══════════════════════════════════════════════════════════════
// ADMIN: APROVAR/NEGAR REPORT (via N8N — credita se aprovado)
// ═══════════════════════════════════════════════════════════════

export async function reviewReport(params: {
  reportId: string;
  adminEmail: string;
  action: 'approve' | 'deny';
  adminNotes?: string;
}): Promise<{ success: boolean; credits_added?: number; error?: string }> {
  const response = await fetch(`${N8N_BASE_URL}/vizzu/review-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      report_id: params.reportId,
      admin_email: params.adminEmail,
      action: params.action,
      admin_notes: params.adminNotes || null,
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Erro ao revisar report');
  return data;
}
