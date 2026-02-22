// ═══════════════════════════════════════════════════════════════
// TERMOS DO PROGRAMA DE PARCEIROS — Vizzu
// Versão 1.0 — Fevereiro 2026
// ═══════════════════════════════════════════════════════════════

export const PARTNER_TERMS_VERSION = '1.0';
export const PARTNER_TERMS_EFFECTIVE_DATE = '22 de fevereiro de 2026';

export interface PartnerTermsSection {
  id: string;
  title: string;
  content: string;
}

export const PARTNER_TERMS_SECTIONS: PartnerTermsSection[] = [
  {
    id: 'elegibilidade',
    title: '1. Elegibilidade',
    content: `Para participar do Programa de Parceiros Vizzu, você precisa:

• Ter uma conta ativa no Vizzu com e-mail verificado.
• Ter aceitado os Termos de Uso e Política de Privacidade da plataforma.
• Não ter histórico de violação dos termos de uso.

A participação é voluntária e pode ser encerrada a qualquer momento por você ou pelo Vizzu.`,
  },
  {
    id: 'como-funciona',
    title: '2. Como funciona',
    content: `Ao aderir ao programa, você recebe um link exclusivo de indicação. Quando alguém se cadastra no Vizzu pelo seu link e assina um plano pago, ambos são recompensados:

• Você (indicador): recebe créditos de acordo com o plano assinado pelo indicado.
• Indicado: recebe 10 créditos bônus imediatamente ao assinar.

Cada indicação é rastreada pelo código único no seu link. O cadastro precisa ser feito através do link para que a indicação seja válida.`,
  },
  {
    id: 'recompensas',
    title: '3. Tabela de recompensas',
    content: `As recompensas variam de acordo com o plano e o período de cobrança do indicado.

Assinatura anual:
• Plano Basic → 40 créditos para o indicador
• Plano Pro → 100 créditos para o indicador
• Plano Premier → 200 créditos para o indicador
• Plano Master → 400 créditos para o indicador

Assinatura mensal: 30% do valor da assinatura mensal (pagamento único).
• Plano Basic → 12 créditos | Pro → 30 | Premier → 60 | Master → 120

Todos os indicados recebem 10 créditos bônus imediatamente, independentemente do plano escolhido.

A recompensa é paga uma única vez por indicação, no momento da primeira assinatura.`,
  },
  {
    id: 'holdback',
    title: '4. Período de holdback',
    content: `Os créditos de indicação ficam em holdback por 7 dias corridos após a assinatura do indicado. Esse período existe para:

• Respeitar o direito de arrependimento do consumidor (CDC, art. 49).
• Garantir que a assinatura foi efetivada e o pagamento processado.

Se o indicado cancelar dentro dos 7 dias, a recompensa é automaticamente cancelada. Após o período de holdback, os créditos ficam disponíveis para resgate.`,
  },
  {
    id: 'resgate',
    title: '5. Resgate de créditos',
    content: `Créditos disponíveis (após holdback) podem ser resgatados a qualquer momento pela aba Parceiros nas Configurações.

Os créditos resgatados são adicionados imediatamente ao seu saldo e podem ser usados em qualquer ferramenta do Vizzu.

Créditos de indicação não expiram enquanto sua conta estiver ativa.`,
  },
  {
    id: 'regras',
    title: '6. Regras e proibições',
    content: `Para manter a integridade do programa, as seguintes práticas são proibidas:

• Auto-indicação: criar contas falsas para se indicar.
• Spam: enviar links em massa por e-mail, SMS ou redes sociais de forma não solicitada.
• Publicidade enganosa: prometer benefícios que o Vizzu não oferece.
• Manipulação: usar bots, scripts ou automações para gerar indicações falsas.
• Compra de tráfego: usar anúncios pagos que mencionem a marca Vizzu sem autorização.

O descumprimento dessas regras pode resultar em cancelamento das recompensas pendentes, exclusão do programa e, em casos graves, suspensão da conta.`,
  },
  {
    id: 'modificacoes',
    title: '7. Modificações e encerramento',
    content: `O Vizzu pode modificar as regras do programa (incluindo valores de recompensa) com aviso prévio de 15 dias.

Recompensas já em holdback no momento da alteração mantêm o valor original.

O programa pode ser encerrado a qualquer momento pelo Vizzu, respeitando as recompensas já aprovadas.

Dúvidas ou denúncias de abuso podem ser enviadas para contato@vizzu.pro.`,
  },
];
