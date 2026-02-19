// ═══════════════════════════════════════════════════════════════
// TERMOS DE USO + POLÍTICA DE PRIVACIDADE — Vizzu
// Versão 1.0 — Fevereiro 2026
// ═══════════════════════════════════════════════════════════════

export const CURRENT_TERMS_VERSION = '1.1';
export const TERMS_EFFECTIVE_DATE = '19 de fevereiro de 2026';

export interface TermsSection {
  id: string;
  title: string;
  content: string;
}

// ─── Resumo (exibido em destaque no topo do modal) ───────────
export const TERMS_SUMMARY = [
  'Você mantém todos os direitos sobre as fotos originais dos seus produtos.',
  'As imagens geradas por IA são suas para uso comercial (loja, redes sociais, marketplace).',
  'Não usamos suas imagens para treinar inteligência artificial.',
  'A IA pode não gerar resultados perfeitos — variações são normais.',
  'Roupas de banho e lingerie podem ser bloqueadas pelos filtros de segurança da IA.',
  'Cancelamento a qualquer momento, com 7 dias de arrependimento garantidos por lei.',
  'Seus dados são protegidos conforme a LGPD (Lei Geral de Proteção de Dados).',
];

// ─── Termos de Uso ───────────────────────────────────────────
export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: 'objeto',
    title: '1. O que é o Vizzu',
    content: `O Vizzu é uma plataforma online (SaaS) que usa inteligência artificial para gerar imagens profissionais de produtos para e-commerce. Isso inclui fotos de estúdio, modelos vestindo roupas, cenários criativos e composições de looks.

Ao criar sua conta e aceitar estes termos, você concorda com todas as regras descritas aqui e na nossa Política de Privacidade.

O Vizzu pode atualizar estes termos quando necessário. Se fizermos mudanças importantes, vamos avisar você por e-mail ou por uma notificação na plataforma com pelo menos 15 dias de antecedência. Se continuar usando o Vizzu após esse aviso, entendemos que você concordou com as mudanças.`,
  },
  {
    id: 'elegibilidade',
    title: '2. Quem pode usar',
    content: `Para usar o Vizzu, você precisa ter pelo menos 18 anos ou ser legalmente emancipado.

Se você está criando uma conta em nome de uma empresa, declara que tem autorização para representá-la e vinculá-la a estes termos.`,
  },
  {
    id: 'conta',
    title: '3. Sua conta',
    content: `Sua conta é pessoal e intransferível. Você é responsável por manter seu e-mail e senha em segurança.

Tudo o que acontecer na sua conta é de sua responsabilidade. Se notar qualquer acesso não autorizado, entre em contato imediatamente pelo e-mail contato@vizzu.pro.

Compartilhar credenciais de acesso com outras pessoas é proibido e pode levar à suspensão da conta.`,
  },
  {
    id: 'tecnologia-ia',
    title: '4. Sobre a inteligência artificial',
    content: `O Vizzu utiliza inteligência artificial para gerar imagens profissionais dos seus produtos. É importante que você saiba:

• Resultados não são garantidos — A IA pode gerar imagens que não correspondam exatamente ao esperado em cores, proporções ou detalhes do produto original.

• Cada geração é diferente — O mesmo pedido pode gerar resultados diferentes a cada vez, e resultados parecidos podem ser gerados para outros usuários.

• Não substitui fotógrafo — As imagens geradas são uma ferramenta auxiliar para o seu e-commerce, não uma substituição integral da fotografia profissional.

• Imperfeições podem acontecer — A IA pode ocasionalmente gerar artefatos visuais, distorções ou elementos indesejados.

Trabalhamos continuamente para melhorar a qualidade das imagens, mas não podemos garantir resultados específicos em cada geração.`,
  },
  {
    id: 'filtros-seguranca',
    title: '5. Filtros de segurança e conteúdo sensível',
    content: `A inteligência artificial possui filtros automáticos de segurança que analisam o conteúdo das imagens durante a geração.

Esses filtros podem bloquear a geração de imagens que o sistema considere sensíveis. Na prática, isso significa que:

• Roupas de banho, biquínis, lingerie e peças íntimas podem ocasionalmente acionar os filtros de segurança, resultando em falha na geração.

• Peças com muito tecido expondo pele também podem ser afetadas.

• Isso NÃO é um defeito do serviço — é uma medida de segurança da tecnologia de IA que não temos controle total.

Trabalhamos para minimizar falsos positivos, mas não garantimos que todas as categorias de produto serão processadas com sucesso. Créditos consumidos em gerações bloqueadas por filtros de segurança não serão reembolsados automaticamente, mas você pode entrar em contato conosco para análise caso a caso.`,
  },
  {
    id: 'dados-treinamento',
    title: '6. Uso das suas imagens',
    content: `Queremos ser bem claros nesse ponto:

• O Vizzu NÃO usa as fotos dos seus produtos para treinar inteligência artificial. Suas imagens são usadas exclusivamente para gerar o resultado que você pediu.

• As imagens são processadas por serviços de IA pagos, que conforme seus termos não utilizam dados de APIs pagas para treinamento de modelos.

• Podemos usar dados anônimos e agregados (como quantidade de gerações, tipos de produto mais populares, taxas de sucesso) para melhorar a plataforma, sem possibilidade de identificar você ou seus produtos.

Se no futuro quisermos usar imagens geradas (nunca as originais) para melhorar nossos serviços, vamos pedir seu consentimento separadamente.`,
  },
  {
    id: 'pagamento',
    title: '7. Planos e pagamento',
    content: `O Vizzu oferece diferentes planos de assinatura com cobrança mensal ou anual. Os valores e benefícios de cada plano estão disponíveis na página de configurações da plataforma.

A cobrança é recorrente e processada automaticamente via Stripe, usando o método de pagamento que você cadastrou.

Os preços podem ser alterados com aviso prévio de 30 dias. A mudança só vale a partir do próximo ciclo de cobrança.

Se a cobrança falhar, tentaremos processar novamente em até 3 oportunidades. Se não conseguirmos, seu acesso às funcionalidades pagas será suspenso até a regularização.`,
  },
  {
    id: 'arrependimento',
    title: '8. Direito de arrependimento',
    content: `Conforme o Código de Defesa do Consumidor (art. 49), você pode cancelar sua assinatura em até 7 dias após a contratação, sem precisar dar motivo.

Para exercer esse direito, entre em contato pelo e-mail contato@vizzu.pro. O reembolso integral será processado em até 10 dias úteis pelo mesmo meio de pagamento utilizado.

Após os 7 dias, vale a política de cancelamento descrita na próxima seção.`,
  },
  {
    id: 'cancelamento',
    title: '9. Cancelamento',
    content: `Você pode cancelar sua assinatura a qualquer momento pelas configurações da conta ou pelo e-mail contato@vizzu.pro.

O cancelamento entra em vigor no final do ciclo já pago — ou seja, você continua usando o plano até o vencimento.

Após os 7 dias de arrependimento, não há reembolso proporcional, exceto em caso de indisponibilidade prolongada (mais de 72 horas seguidas) por culpa do Vizzu, ou cobrança indevida/duplicada.

Créditos não utilizados ao final de cada ciclo mensal não são cumulativos e expiram na renovação.`,
  },
  {
    id: 'responsabilidade',
    title: '10. Limitações de responsabilidade',
    content: `Fazemos o máximo para manter o Vizzu funcionando bem, mas precisamos ser transparentes:

• Qualidade das imagens — Não garantimos que toda imagem gerada será perfeita. A tecnologia de IA está em constante evolução e variações nos resultados são esperadas.

• Disponibilidade — Buscamos manter a plataforma disponível 24 horas, mas interrupções podem ocorrer por manutenção (avisamos com 24h de antecedência), falhas em serviços de terceiros ou força maior.

• Limite de indenização — Em qualquer situação, a responsabilidade total do Vizzu será limitada ao valor que você pagou nos últimos 3 meses.

• Backup — Embora façamos backups regulares, recomendamos que você mantenha cópias das suas imagens originais. O Vizzu não se responsabiliza por perda de imagens que você não tenha salvo localmente.`,
  },
  {
    id: 'uso-proibido',
    title: '11. O que você NÃO pode fazer',
    content: `Você concorda em não usar o Vizzu para:

Conteúdo ilegal ou prejudicial:
• Gerar imagens com nudez, pornografia ou conteúdo sexualmente explícito
• Criar conteúdo que promova violência, discriminação ou discurso de ódio
• Gerar imagens envolvendo menores de idade de forma inapropriada
• Usar para fraude, falsificação ou qualquer atividade ilícita
• Criar deepfakes ou imagens enganosas de pessoas reais sem consentimento

Violação de propriedade intelectual:
• Enviar imagens de produtos que você não tem autorização para usar
• Reproduzir marcas, logos ou designs protegidos de terceiros
• Criar conteúdo que viole direitos autorais

Uso abusivo:
• Usar bots ou scripts automatizados para acessar a plataforma
• Tentar fazer engenharia reversa ou extrair código-fonte
• Revender ou redistribuir o acesso ao Vizzu
• Sobrecarregar intencionalmente os servidores
• Compartilhar credenciais com terceiros

Contas que violem essas regras podem ser suspensas ou encerradas sem aviso prévio em casos graves.`,
  },
  {
    id: 'propriedade-intelectual',
    title: '12. Propriedade intelectual',
    content: `Suas fotos originais:
Você mantém todos os direitos sobre as imagens de produtos que envia ao Vizzu. Ao enviar, você nos dá uma licença limitada apenas para processar pela IA, armazenar na sua conta e exibir para você dentro da plataforma.

Imagens geradas pela IA:
• Você recebe uma licença ampla e comercial — pode usar, modificar e distribuir as imagens geradas para seu e-commerce, redes sociais, marketplaces e materiais de marketing.
• As imagens não são exclusivas — resultados parecidos podem ser gerados para outros usuários devido à natureza da tecnologia.
• Sem garantia de copyright — A legislação brasileira atual não reconhece direitos autorais para obras geradas exclusivamente por IA. As imagens geradas podem não ser passíveis de registro autoral.
• Portfólio Vizzu — Reservamos o direito de usar imagens geradas (sem identificar você) em materiais promocionais e demonstrações da nossa tecnologia. Você pode revogar esse consentimento a qualquer momento.

Importante: Você é responsável por garantir que tem os direitos necessários sobre as imagens que envia. O Vizzu não se responsabiliza por violações de propriedade intelectual causadas por imagens enviadas pelo usuário.`,
  },
  {
    id: 'rescisao',
    title: '13. Suspensão e encerramento de conta',
    content: `Quando podemos suspender sua conta:
• Suspeita de violação dos termos de uso
• Atividade suspeita de fraude
• Inadimplência por mais de 15 dias
• Determinação judicial

Quando podemos encerrar sua conta:
• Violação grave ou repetida dos termos, especialmente das regras de uso proibido
• Inadimplência por mais de 60 dias
• Uso para atividades ilegais

Em caso de encerramento, você será notificado com a motivação e terá 15 dias para defesa, exceto em casos de atividade ilegal que exijam ação imediata.

Após encerramento:
• Suas imagens ficam disponíveis para download por 30 dias
• Após 30 dias, imagens e dados da conta são excluídos permanentemente
• Dados fiscais são mantidos pelo prazo legal
• Créditos não utilizados não são reembolsados, exceto se o encerramento for por culpa do Vizzu

Você pode encerrar sua conta a qualquer momento pelas configurações ou pelo e-mail contato@vizzu.pro.`,
  },
  {
    id: 'sla',
    title: '14. Disponibilidade do serviço',
    content: `Buscamos manter disponibilidade de 99,5% ao mês, excluindo manutenções programadas.

Manutenções programadas são comunicadas com pelo menos 24 horas de antecedência e realizadas preferencialmente em horários de menor uso.

Se houver indisponibilidade superior a 24 horas consecutivas por falha exclusiva do Vizzu, os créditos usados durante o período que resultaram em falha serão restaurados.`,
  },
  {
    id: 'foro',
    title: '15. Legislação e foro',
    content: `Estes termos são regidos pelas leis do Brasil.

Para resolver qualquer questão, fica eleito o foro da Comarca de Maringá/PR, sem prejudicar o direito do consumidor de usar o foro da sua própria cidade (conforme o Código de Defesa do Consumidor, art. 101).

Antes de recorrer à justiça, pedimos que entre em contato conosco pelo e-mail contato@vizzu.pro para tentarmos resolver de forma amigável em até 30 dias.`,
  },
];

// ─── Política de Privacidade ─────────────────────────────────
export const PRIVACY_SECTIONS: TermsSection[] = [
  {
    id: 'controlador',
    title: '1. Quem somos',
    content: `O Vizzu é operado por:

Razão Social: 61.823.814 Luana Mardegan Leal
CNPJ: 61.823.814/0001-10
Localidade: Maringá/PR

Para questões sobre seus dados pessoais, entre em contato com nosso Encarregado de Proteção de Dados (DPO) pelo e-mail contato@vizzu.pro.`,
  },
  {
    id: 'dados-coletados',
    title: '2. Dados que coletamos',
    content: `Dados de cadastro: Nome, e-mail e telefone (quando fornecido via Google ou cadastro manual).

Dados de pagamento: Processados diretamente pelo Stripe. O Vizzu NÃO armazena dados do seu cartão de crédito. Guardamos apenas o identificador do cliente no Stripe e o histórico de transações (valores, datas, status).

Dados de uso: Imagens de produtos que você envia, imagens geradas pela IA, preferências de geração, histórico e créditos consumidos.

Dados técnicos: Endereço IP, tipo de navegador, sistema operacional, páginas acessadas e horários de acesso.

Dados de integrações: Se você conectar sua loja Shopify, coletamos dados dos produtos sincronizados (nome, descrição, preço, imagens) e dados da conexão (token criptografado).`,
  },
  {
    id: 'bases-legais',
    title: '3. Por que usamos seus dados',
    content: `Cada tipo de dado tem uma justificativa legal conforme a LGPD:

• Nome e e-mail → Criar e gerenciar sua conta (execução de contrato, art. 7º, V)
• Imagens de produtos → Gerar imagens por IA (execução de contrato)
• Dados de pagamento → Cobrança e faturamento (execução de contrato)
• Dados de uso → Melhorar a plataforma (interesse legítimo, art. 7º, IX)
• Dados técnicos → Segurança e prevenção a fraude (interesse legítimo)
• Dados Shopify → Integração com e-commerce (consentimento, art. 7º, I)
• Dados anônimos → Estatísticas e melhorias (dados anonimizados, art. 12)
• E-mail para marketing → Novidades e promoções (consentimento)`,
  },
  {
    id: 'compartilhamento',
    title: '4. Com quem compartilhamos',
    content: `Compartilhamos dados estritamente com os parceiros necessários para o funcionamento do Vizzu:

• Provedores de inteligência artificial — Suas imagens de produtos são enviadas temporariamente para gerar as imagens por IA.
• Processador de pagamentos — Processa seus pagamentos de forma segura. O Vizzu não armazena dados do seu cartão.
• Infraestrutura e hospedagem — Serviços que armazenam os dados da sua conta e hospedam a plataforma.
• Integrações de e-commerce — Se você conectar sua loja, sincronizamos produtos e exportamos imagens.

As transferências internacionais de dados seguem as salvaguardas exigidas pela LGPD (art. 33), incluindo cláusulas contratuais padrão e certificações de segurança dos parceiros.

O Vizzu NÃO vende, aluga ou comercializa seus dados pessoais a terceiros.`,
  },
  {
    id: 'transferencia',
    title: '5. Transferência internacional',
    content: `Alguns dos nossos parceiros processam dados fora do Brasil.

Garantimos que essas transferências seguem as regras da LGPD (art. 33), com contratos de processamento de dados (DPA) assinados com cada parceiro e medidas técnicas de segurança como criptografia em trânsito e em repouso.

Seus dados principais (conta, produtos, imagens, histórico) ficam armazenados no Brasil.`,
  },
  {
    id: 'cookies',
    title: '6. Cookies',
    content: `O Vizzu utiliza cookies e tecnologias semelhantes para:

• Cookies essenciais — Manter sua sessão ativa e suas preferências (obrigatórios para o funcionamento).
• Cookies de funcionalidade — Lembrar preferências como tema visual.

Atualmente não utilizamos cookies de rastreamento publicitário ou de terceiros para marketing.`,
  },
  {
    id: 'direitos',
    title: '7. Seus direitos (LGPD)',
    content: `Conforme a Lei Geral de Proteção de Dados, você tem direito a:

• Confirmação e acesso — Saber quais dados possuímos sobre você
• Correção — Corrigir dados incompletos ou desatualizados
• Eliminação — Pedir a exclusão dos seus dados
• Portabilidade — Receber seus dados em formato estruturado
• Revogação — Retirar consentimento dado anteriormente
• Oposição — Se opor ao tratamento com base em interesse legítimo
• Informação — Saber com quem compartilhamos seus dados

Para exercer qualquer direito, envie e-mail para contato@vizzu.pro. Responderemos em até 15 dias.

Você também pode registrar reclamação na Autoridade Nacional de Proteção de Dados (ANPD) se entender que seus direitos não foram atendidos.`,
  },
  {
    id: 'retencao',
    title: '8. Retenção e eliminação',
    content: `Seus dados são mantidos enquanto sua conta estiver ativa.

Após encerramento da conta:
• Imagens ficam disponíveis para download por 30 dias
• Após 30 dias, dados são excluídos permanentemente
• Dados fiscais e de transações são mantidos pelo prazo legal (5 anos, conforme legislação tributária)

Dados anônimos e agregados podem ser mantidos indefinidamente, pois não permitem sua identificação.`,
  },
];

// ─── Informação legal (rodapé pequeno) ───────────────────────
export const LEGAL_FOOTER = `Vizzu é operado por 61.823.814 Luana Mardegan Leal — CNPJ 61.823.814/0001-10 — Maringá/PR`;
