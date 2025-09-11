import { generateServiceOrderPDF, getPDFBlob } from './pdfGenerator';
import { ServiceOrder, Client, RTI, Generator } from '@/types';

export interface EmailConfig {
  smtpServer: string;
  smtpPort: number;
  emailSender: string;
  password: string;
  companyName?: string;
  signature?: string;
}

export async function sendServiceOrderEmail(
  order: ServiceOrder,
  client: Client,
  recipientEmail: string,
  config: EmailConfig,
  generator?: Generator
): Promise<boolean> {
  try {
    // Gerar PDF com informações do gerador
    const pdf = await generateServiceOrderPDF(order, client, generator);
    const pdfBlob = getPDFBlob(pdf);

    // Nome da empresa para a assinatura
    const companyName = config.companyName || 'Equipe de Manutenção';
    
    // Assinatura personalizada ou padrão
    const signature = config.signature || `
      ${companyName}<br>
      Suporte Técnico<br>
      Tel: (XX) XXXX-XXXX<br>
      Email: suporte@empresa.com.br<br>
      <a href="https://www.empresa.com.br">www.empresa.com.br</a>
    `;

    // Adicionar informações do gerador na tabela se disponível
    const generatorRows = generator ? `
      <tr class="highlight">
        <th>Gerador</th>
        <td>${generator.gerador} - ${generator.modelo_gerador}</td>
      </tr>
      <tr>
        <th>Motor</th>
        <td>${generator.motor} - ${generator.modelo_motor}</td>
      </tr>
    ` : '';

    // Mensagem de email mais profissional e formatada
    const emailBody = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background-color: #f8f8f8; padding: 20px; border-bottom: 3px solid #0051a0; }
            .content { padding: 20px; }
            .footer { font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 15px; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; }
            table, th, td { border: 1px solid #ddd; }
            th, td { padding: 10px; text-align: left; }
            th { background-color: #f2f2f2; }
            .highlight { background-color: #f8f8f8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Ordem de Serviço #${order.id.slice(-6)}</h2>
            </div>
            <div class="content">
              <p>Prezado(a) ${client.nome},</p>
              
              <p>Esperamos que esta mensagem o(a) encontre bem.</p>
              
              <p>Segue em anexo a ordem de serviço referente à manutenção realizada em seus equipamentos em ${order.data}.</p>
              
              <h3>Resumo do Serviço:</h3>
              <table>
                <tr class="highlight">
                  <th>Número da OS</th>
                  <td>#${order.id.slice(-6)}</td>
                </tr>
                <tr>
                  <th>Data</th>
                  <td>${order.data}</td>
                </tr>
                <tr class="highlight">
                  <th>Técnico Responsável</th>
                  <td>${order.tecnico}</td>
                </tr>
                <tr>
                  <th>Tipo de Manutenção</th>
                  <td>${order.tipo_manutencao}</td>
                </tr>
                ${generatorRows}
              </table>
              
              <p>O documento em anexo contém todas as informações detalhadas sobre os serviços executados, 
              verificações realizadas e demais observações relevantes.</p>
              
              <p>Em caso de dúvidas ou necessidade de esclarecimentos adicionais, por favor, 
              não hesite em entrar em contato conosco pelos canais de atendimento abaixo.</p>
              
              <p>Agradecemos pela confiança em nossos serviços.</p>
              
              <p>Atenciosamente,</p>
              
              <div>${signature}</div>
            </div>
            <div class="footer">
              <p>Este é um email automático. Por favor, não responda diretamente a esta mensagem.</p>
              <p>&copy; ${new Date().getFullYear()} ${companyName}. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Criar form data para enviar para um servidor de email
    const formData = new FormData();
    formData.append('pdf', pdfBlob, `ordem_servico_${order.id}.pdf`);
    formData.append('to', recipientEmail);
    formData.append('subject', `Ordem de Serviço #${order.id.slice(-6)} - ${client.nome}`);
    formData.append('body', emailBody);
    formData.append('isHtml', 'true'); // Indicar que o corpo do email é HTML

    // Esta é uma implementação simplificada que requer um endpoint backend
    // Para uma implementação real, você precisaria de um servidor para enviar emails
    console.log('Simulação de envio de email:', {
      to: recipientEmail,
      subject: `Ordem de Serviço #${order.id.slice(-6)} - ${client.nome}`,
      attachment: `ordem_servico_${order.id}.pdf`,
      bodyType: 'HTML'
    });

    // Em produção, você faria uma chamada para seu servidor:
    // const response = await fetch('/api/send-email', {
    //   method: 'POST',
    //   body: formData
    // });

    // return response.ok;

    // Por enquanto, retornamos true para simular sucesso
    return true;

  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return false;
  }
}

// Configurações padrão (deveriam vir de variáveis de ambiente)
export const defaultEmailConfig: EmailConfig = {
  smtpServer: "smtp.gmail.com",
  smtpPort: 587,
  emailSender: "seu-email@gmail.com",
  password: "sua-senha"
};