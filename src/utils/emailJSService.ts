import emailjs from '@emailjs/browser';
import { ServiceOrder, Client } from '@/types';
import { generateServiceOrderPDF } from './pdfGenerator';
import jsPDF from 'jspdf';

export interface EmailJSConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  companyName?: string;
  signature?: string;
}

export const defaultEmailJSConfig: EmailJSConfig = {
  serviceId: 'service_qwtsafe',
  templateId: 'template_ll647ew',
  publicKey: 'DzFTH1PSxzQME9aZ3'
};

interface LegacyServiceOrder extends Omit<ServiceOrder, 'geradores'> {
  gerador_id?: string;
}

// Função para converter PDF para base64
const pdfToBase64 = async (pdf: jsPDF): Promise<string> => {
  const pdfBlob = pdf.output('blob');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove o prefixo "data:application/pdf;base64," para obter apenas o base64
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(pdfBlob);
  });
};

// Função para obter logo da empresa em base64
const getCompanyLogoBase64 = (): string | null => {
  try {
    const companyConfig = localStorage.getItem('companyConfig');
    if (companyConfig) {
      const config = JSON.parse(companyConfig);
      if (config.logoBase64) {
        return config.logoBase64;
      }
    }
    return localStorage.getItem('company_logo');
  } catch (error) {
    console.error('Erro ao obter logo:', error);
    return null;
  }
};

// Função para obter nome da empresa
const getCompanyName = (): string => {
  try {
    const companyConfig = localStorage.getItem('companyConfig');
    if (companyConfig) {
      const config = JSON.parse(companyConfig);
      if (config.companyName) {
        return config.companyName;
      }
    }
    return localStorage.getItem('company_name') || 'Empresa';
  } catch (error) {
    console.error('Erro ao obter nome da empresa:', error);
    return 'Empresa';
  }
};

// Função para obter informações dos geradores
const getGeneratorsInfo = (order: ServiceOrder, client: Client): string => {
  const clientGenerators = client.geradores || [];
  
  // Verificar se é formato antigo ou novo
  const isLegacyOrder = !order.geradores || !Array.isArray(order.geradores);
  
  if (isLegacyOrder) {
    const legacyOrder = order as LegacyServiceOrder;
    if (legacyOrder.gerador_id) {
      const generator = clientGenerators.find(g => g.id === legacyOrder.gerador_id);
      if (generator) {
        return `• ${generator.gerador} - ${generator.modelo_gerador} (Série: ${generator.serie_gerador})`;
      }
    }
    return '• Informações do gerador não disponíveis';
  }
  
  // Formato novo - múltiplos geradores
  return order.geradores.map((genData, index) => {
    const generator = clientGenerators.find(g => g.id === genData.gerador_id);
    if (generator) {
      return `• Gerador ${index + 1}: ${generator.gerador} - ${generator.modelo_gerador} (${genData.tipo_manutencao})`;
    }
    return `• Gerador ${index + 1}: Informações não disponíveis`;
  }).join('\n');
};

export const sendServiceOrderEmailJS = async (
  order: ServiceOrder,
  client: Client,
  recipientEmail: string,
  config: EmailJSConfig,
  secondaryEmail?: string
): Promise<boolean> => {
  try {
    // Gerar PDF
    const clientGenerators = client.geradores || [];
    const pdf = await generateServiceOrderPDF(order, client, clientGenerators);
    
    // Converter PDF para base64
    const pdfBase64 = await pdfToBase64(pdf);

    // Obter informações da empresa
    const companyName = getCompanyName();
    const companyLogo = getCompanyLogoBase64();
    
    // Preparar informações dos geradores
    const generatorsInfo = getGeneratorsInfo(order, client);

    // Preparar dados do template
    const templateParams = {
      // Informações do destinatário
      to_email: recipientEmail,
      to_name: client.nome,
      
      // Informações da empresa
      company_name: companyName,
      company_logo: companyLogo || '',
      
      // Informações da OS
      order_number: `#${order.id.slice(-6)}`,
      service_date: order.data,
      technician: order.tecnico,
      
      // Informações do cliente
      client_name: client.nome,
      client_address: client.endereco,
      client_phone: client.telefone,
      client_email: client.email,
      
      // Informações dos geradores
      generators_info: generatorsInfo,
      
      // Observações
      general_observations: order.observacoes_gerais || 'Nenhuma observação adicional.',
      
      // Anexo PDF
      pdf_attachment: pdfBase64,
      pdf_filename: `OS_${order.id.slice(-6)}.pdf`,
      
      // Dados adicionais
      signature_status: order.assinatura ? 'Assinado pelo cliente' : 'Pendente de assinatura',
      representative: order.representante || 'Não informado',
      
      // Mensagem personalizada
      message: `Segue em anexo a Ordem de Serviço ${order.id.slice(-6)} referente aos serviços realizados em ${order.data}.
      
Geradores atendidos:
${generatorsInfo}

${order.observacoes_gerais ? `Observações: ${order.observacoes_gerais}` : ''}

Atenciosamente,
${companyName}`
    };

    // Enviar email principal
    const response = await emailjs.send(
      config.serviceId,
      config.templateId,
      templateParams,
      config.publicKey
    );
    
    // Se há email secundário, enviar também
    if (secondaryEmail && secondaryEmail.trim() !== '') {
      const secondaryTemplateParams = {
        ...templateParams,
        to_email: secondaryEmail
      };
      
      const secondaryResponse = await emailjs.send(
        config.serviceId,
        config.templateId,
        secondaryTemplateParams,
        config.publicKey
      );
      
      // Retorna true se ambos foram enviados com sucesso
      return response.status === 200 && secondaryResponse.status === 200;
    }
    
    return response.status === 200;

  } catch (error) {
    console.error('Erro detalhado ao enviar email:', error);
    
    // Log mais detalhado do erro
    if (error instanceof Error) {
      console.error('Mensagem do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    // Se for erro do EmailJS, mostrar detalhes específicos
    if (error && typeof error === 'object' && 'text' in error) {
      console.error('Resposta do EmailJS:', error);
    }
    
    throw error;
  }
};

// Função para testar configuração do EmailJS
export const testEmailJSConfig = async (config: EmailJSConfig, testEmail: string): Promise<boolean> => {
  try {
    const templateParams = {
      to_email: testEmail,
      to_name: 'Teste',
      company_name: getCompanyName(),
      message: 'Este é um email de teste para verificar a configuração do EmailJS.',
      order_number: '#TESTE',
      service_date: new Date().toLocaleDateString('pt-BR'),
      technician: 'Técnico Teste',
      client_name: 'Cliente Teste',
      generators_info: '• Gerador de Teste'
    };

    const response = await emailjs.send(
      config.serviceId,
      config.templateId,
      templateParams,
      config.publicKey
    );

    return response.status === 200;
  } catch (error) {
    console.error('Erro ao testar configuração:', error);
    return false;
  }
};
