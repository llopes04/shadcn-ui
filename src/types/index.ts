export interface Client {
  id: string;
  nome: string;
  endereco: string;
  telefone: string;
  email: string;
  cidade: string;
  estado: string;
  geradores: Generator[];
}

export interface Generator {
  id: string;
  motor: string;
  modelo_motor: string;
  serie_motor: string;
  gerador: string;
  modelo_gerador: string;
  serie_gerador: string;
  usca: string;
}

export interface Verification {
  item: string;
  status: 'OK' | 'OBS' | 'COM_CARGA';
  observacao?: string;
  gerador_id?: string; // Para associar verificação a um gerador específico
  // Campos específicos para teste de carga
  corrente_r?: string;
  corrente_s?: string;
  corrente_t?: string;
  corrente_geral?: string;
}

// Dados específicos de um gerador em uma OS
export interface GeneratorData {
  gerador_id: string;
  tipo_manutencao: 'Preventiva' | 'Corretiva'; // Movido para cada gerador
  // Campos elétricos específicos do gerador
  fase_r_s?: string;
  fase_t_r?: string;
  fase_t_s?: string;
  frequencia?: string;
  kva?: string;
  tensao_bateria_standby?: string;
  tensao_bateria_carregando?: string;
  queda_tensao_bateria?: string; // Campo adicionado conforme solicitação
  temperatura_agua?: string;
  pressao_oleo?: string;
  nivel_combustivel?: string;
  tempo_funcionamento?: string;
  // Novos campos de corrente
  corrente_r?: string;
  corrente_s?: string;
  corrente_t?: string;
  corrente_geral?: string;
  verificacoes: Verification[];
  observacoes?: string;
}

export interface ServiceOrder {
  id: string;
  tecnico: string;
  data: string;
  cliente_id: string;
  
  // Array de dados dos geradores (suporte a múltiplos geradores)
  geradores: GeneratorData[];
  
  // Campos globais da OS
  observacoes_gerais?: string;
  assinatura?: string;
  representante?: string;
  rti_id?: string; // Referência ao RTI associado à OS
}

export interface MultiServiceOrder {
  id: string;
  orders: ServiceOrder[];
  assinatura: string;
  data_criacao: string;
}

// Interface para anexos de imagem
export interface ImageAttachment {
  id: string;
  name: string;
  url: string; // Base64 data URL
  size: number;
  type: string;
  uploadDate: string;
  description?: string;
}

// Interface para o Relatório Técnico Interno (RTI)
export interface RTI {
  id: string;
  service_order_id: string; // Referência à OS associada
  tecnico: string; // Nome do técnico que criou o RTI
  data_criacao: string; // Data de criação do RTI
  detalhes_tecnicos: string; // Detalhes técnicos adicionais
  recomendacoes: string; // Recomendações técnicas
  pecas_utilizadas: string; // Peças utilizadas durante o serviço
  tempo_gasto: string; // Tempo gasto na manutenção
  problemas_identificados: string; // Problemas identificados durante o serviço
  solucao_aplicada: string; // Solução aplicada para resolver o problema
  images?: ImageAttachment[]; // Anexos de imagem
}

export interface User {
  id: string;
  nome: string;
  usuario: string;
  senha: string;
}