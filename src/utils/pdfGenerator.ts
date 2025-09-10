import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ServiceOrder, Client, RTI, ImageAttachment, Generator, GeneratorData } from '@/types';

interface LegacyServiceOrder extends Omit<ServiceOrder, 'geradores'> {
  tipo_manutencao?: string;
}

// Função para carregar imagem como base64
const loadImageAsBase64 = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (src.startsWith('data:')) {
      resolve(src);
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
};

// Função para obter logo da empresa
const getCompanyLogo = (): string | null => {
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

// Função para obter marca d'água
const getWatermarkImage = (): string | null => {
  try {
    const companyConfig = localStorage.getItem('companyConfig');
    if (companyConfig) {
      const config = JSON.parse(companyConfig);
      if (config.watermarkBase64) {
        return config.watermarkBase64;
      }
    }
    return localStorage.getItem('company_watermark');
  } catch (error) {
    console.error('Erro ao obter marca d\'água:', error);
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
    return localStorage.getItem('company_name') || 'CONFIDENCIAL';
  } catch (error) {
    console.error('Erro ao obter nome da empresa:', error);
    return 'CONFIDENCIAL';
  }
};

// Função para adicionar marca d'água
const addWatermark = async (pdf: jsPDF, text?: string) => {
  const pageCount = pdf.getNumberOfPages();
  const watermarkImage = getWatermarkImage();
  
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.saveGraphicsState();
    
    if (watermarkImage) {
      try {
        pdf.setGState(pdf.GState({ opacity: 0.1 }));
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = 100;
        const imgHeight = 100;
        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;
        
        pdf.addImage(watermarkImage, 'PNG', x, y, imgWidth, imgHeight);
      } catch (error) {
        console.error('Erro ao adicionar marca d\'água de imagem:', error);
        addTextWatermark(pdf, text || getCompanyName());
      }
    } else {
      addTextWatermark(pdf, text || getCompanyName());
    }
    
    pdf.restoreGraphicsState();
  }
};

// Função auxiliar para marca d'água de texto
const addTextWatermark = (pdf: jsPDF, text: string) => {
  pdf.setGState(pdf.GState({ opacity: 0.08 }));
  pdf.setTextColor(128, 128, 128);
  pdf.setFontSize(45);
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  pdf.text(text, pageWidth / 2, pageHeight / 2, {
    angle: 45,
    align: 'center'
  });
};

// Função para adicionar cabeçalho profissional
const addProfessionalHeader = async (pdf: jsPDF, title: string, orderNumber: string, date: string) => {
  pdf.setFillColor(41, 128, 185);
  pdf.rect(0, 0, 210, 35, 'F');
  
  const logoData = getCompanyLogo();
  if (logoData) {
    try {
      const logoBase64 = await loadImageAsBase64(logoData);
      pdf.addImage(logoBase64, 'PNG', 15, 8, 35, 18);
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
    }
  }
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, logoData ? 60 : 20, 18);
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Documento: ${orderNumber}`, logoData ? 60 : 20, 26);
  pdf.text(`Data: ${date}`, 150, 26);
  
  pdf.setDrawColor(52, 73, 94);
  pdf.setLineWidth(0.8);
  pdf.line(15, 40, 195, 40);
  
  return 50;
};

// Função para adicionar seção com estilo
const addSection = (pdf: jsPDF, title: string, yPosition: number): number => {
  pdf.setFillColor(236, 240, 241);
  pdf.rect(15, yPosition - 3, 180, 12, 'F');
  
  pdf.setTextColor(44, 62, 80);
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, 20, yPosition + 4);
  
  pdf.setDrawColor(52, 152, 219);
  pdf.setLineWidth(2);
  pdf.line(20, yPosition + 7, 50, yPosition + 7);
  
  return yPosition + 15;
};

// Função para adicionar campo de informação
const addInfoField = (pdf: jsPDF, label: string, value: string, x: number, y: number, maxWidth: number = 80): number => {
  pdf.setTextColor(52, 73, 94);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${label}:`, x, y);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(44, 62, 80);
  const lines = pdf.splitTextToSize(value, maxWidth);
  pdf.text(lines, x, y + 4);
  
  return y + (lines.length * 4) + 3;
};

// Função para adicionar rodapé profissional
const addProfessionalFooter = (pdf: jsPDF) => {
  const pageHeight = pdf.internal.pageSize.getHeight();
  const footerY = pageHeight - 20;
  
  pdf.setDrawColor(52, 73, 94);
  pdf.setLineWidth(0.5);
  pdf.line(15, footerY, 195, footerY);
  
  pdf.setTextColor(127, 140, 141);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  
  const companyName = getCompanyName();
  pdf.text(`${companyName} - Documento gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')}`, 20, footerY + 8);
  
  const pageNumber = pdf.getCurrentPageInfo().pageNumber;
  pdf.text(`Página ${pageNumber}`, 175, footerY + 8);
};

// Função para adicionar informações de um gerador específico
const addGeneratorInfo = (pdf: jsPDF, generator: Generator, generatorData: GeneratorData, generatorNumber: number, yPosition: number): number => {
  yPosition = addSection(pdf, `GERADOR ${generatorNumber} - ${generator.gerador}`, yPosition);
  
  pdf.setTextColor(44, 62, 80);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  
  let nextY = addInfoField(pdf, 'Gerador', generator.gerador, 20, yPosition, 85);
  nextY = addInfoField(pdf, 'Modelo Gerador', generator.modelo_gerador, 20, nextY, 85);
  nextY = addInfoField(pdf, 'Série Gerador', generator.serie_gerador, 20, nextY, 85);
  
  addInfoField(pdf, 'Motor', generator.motor, 110, yPosition, 75);
  addInfoField(pdf, 'Modelo Motor', generator.modelo_motor, 110, yPosition + 8, 75);
  addInfoField(pdf, 'Série Motor', generator.serie_motor, 110, yPosition + 16, 75);
  
  if (generator.usca) {
    nextY = addInfoField(pdf, 'USCA', generator.usca, 20, nextY, 85);
  }

  yPosition = Math.max(nextY, yPosition + 24) + 5;

  // Adicionar tempo de funcionamento e tipo de manutenção
  if (generatorData.tempo_funcionamento || generatorData.tipo_manutencao) {
    let operationalY = yPosition;
    if (generatorData.tempo_funcionamento) {
      operationalY = addInfoField(pdf, 'Tempo de Funcionamento', `${generatorData.tempo_funcionamento}h`, 20, operationalY, 85);
    }
    if (generatorData.tipo_manutencao) {
      operationalY = addInfoField(pdf, 'Tipo de Manutenção', generatorData.tipo_manutencao, 20, operationalY, 85);
    }
    if (generatorData.nivel_combustivel) {
      addInfoField(pdf, 'Nível de Combustível', generatorData.nivel_combustivel, 110, yPosition, 75);
    }
    yPosition = Math.max(operationalY, yPosition + 8) + 5;
  }

  if (generatorData.fase_r_s || generatorData.tensao_bateria_standby || generatorData.temperatura_agua || generatorData.pressao_oleo) {
    pdf.setTextColor(44, 62, 80);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Dados Técnicos:', 20, yPosition);
    yPosition += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    if (generatorData.fase_r_s) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Fase R-S:', 25, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${generatorData.fase_r_s}V`, 55, yPosition);
      yPosition += 4;
    }
    
    if (generatorData.fase_t_r) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Fase T-R:', 25, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${generatorData.fase_t_r}V`, 55, yPosition);
      yPosition += 4;
    }
    
    if (generatorData.fase_t_s) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Fase T-S:', 25, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${generatorData.fase_t_s}V`, 55, yPosition);
      yPosition += 4;
    }
    
    if (generatorData.frequencia) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Frequência:', 25, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${generatorData.frequencia}Hz`, 55, yPosition);
      yPosition += 4;
    }
    
    if (generatorData.kva) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('KVA:', 25, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(generatorData.kva, 55, yPosition);
      yPosition += 4;
    }
    
    if (generatorData.tensao_bateria_standby) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Tensão Bateria (Standby):', 25, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${generatorData.tensao_bateria_standby}V`, 90, yPosition);
      yPosition += 4;
    }
    
    if (generatorData.tensao_bateria_carregando) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Tensão Bateria (Carregando):', 25, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${generatorData.tensao_bateria_carregando}V`, 95, yPosition);
      yPosition += 4;
    }
    
    if (generatorData.queda_tensao_bateria) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Queda de Tensão da Bateria:', 25, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${generatorData.queda_tensao_bateria}V`, 95, yPosition);
      yPosition += 4;
    }
    
    if (generatorData.temperatura_agua) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Temperatura da Água:', 25, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${generatorData.temperatura_agua}°C`, 80, yPosition);
      yPosition += 4;
    }
    
    if (generatorData.pressao_oleo) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Pressão do Óleo:', 25, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(generatorData.pressao_oleo, 75, yPosition);
      yPosition += 4;
    }
    
    yPosition += 8;
  }

  if (generatorData.verificacoes && generatorData.verificacoes.length > 0) {
    if (yPosition > 200) {
      addProfessionalFooter(pdf);
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setTextColor(44, 62, 80);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Verificações Realizadas:', 20, yPosition);
    yPosition += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');

    generatorData.verificacoes.forEach((verificacao) => {
      // Para o campo "Teste de carga 5min" com status "COM_CARGA", ajustar o layout
      if (verificacao.item === 'Teste de carga 5min' && verificacao.status === 'COM_CARGA') {
        // Exibir o status e nome do campo na mesma linha
        const statusColor = [230, 126, 34]; // Cor para COM_CARGA
        pdf.setTextColor(...statusColor);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`(${verificacao.status})`, 25, yPosition);
        
        pdf.setTextColor(44, 62, 80);
        pdf.setFont('helvetica', 'normal');
        pdf.text(verificacao.item, 25 + pdf.getTextWidth(`(${verificacao.status}) `), yPosition);
        
        yPosition += 6;
        
        // Adicionar observação se existir
        if (verificacao.observacao) {
          pdf.setTextColor(127, 140, 141);
          pdf.setFontSize(8);
          const obsLines = pdf.splitTextToSize(`Obs: ${verificacao.observacao}`, 150);
          pdf.text(obsLines, 30, yPosition);
          yPosition += obsLines.length * 3 + 2;
          pdf.setFontSize(9);
        }
        
        // Adicionar campos de corrente em uma seção separada
        pdf.setTextColor(44, 62, 80);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Dados de Corrente:', 30, yPosition);
        yPosition += 5;
        
        pdf.setFont('helvetica', 'normal');
        
        // Organizar os campos de corrente em duas colunas para economizar espaço
        let currentY = yPosition;
        let leftColumn = true;
        
        if (verificacao.corrente_r) {
          const xPos = leftColumn ? 35 : 110;
          pdf.text(`Corrente R: ${verificacao.corrente_r}A`, xPos, currentY);
          if (leftColumn) {
            leftColumn = false;
          } else {
            currentY += 4;
            leftColumn = true;
          }
        }
        
        if (verificacao.corrente_s) {
          const xPos = leftColumn ? 35 : 110;
          pdf.text(`Corrente S: ${verificacao.corrente_s}A`, xPos, currentY);
          if (leftColumn) {
            leftColumn = false;
          } else {
            currentY += 4;
            leftColumn = true;
          }
        }
        
        if (verificacao.corrente_t) {
          const xPos = leftColumn ? 35 : 110;
          pdf.text(`Corrente T: ${verificacao.corrente_t}A`, xPos, currentY);
          if (leftColumn) {
            leftColumn = false;
          } else {
            currentY += 4;
            leftColumn = true;
          }
        }
        
        if (verificacao.corrente_geral) {
          const xPos = leftColumn ? 35 : 110;
          pdf.text(`Corrente Geral: ${verificacao.corrente_geral}A`, xPos, currentY);
          if (leftColumn) {
            leftColumn = false;
          } else {
            currentY += 4;
            leftColumn = true;
          }
        }
        
        // Ajustar yPosition para a próxima linha
        yPosition = currentY + (leftColumn ? 0 : 4) + 3;
        pdf.setFontSize(9);
        
      } else {
        // Layout padrão para outros campos
        const statusColor = verificacao.status === 'OK' ? [39, 174, 96] : [230, 126, 34];
        pdf.setTextColor(...statusColor);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`[${verificacao.status}]`, 25, yPosition);
        
        pdf.setTextColor(44, 62, 80);
        pdf.setFont('helvetica', 'normal');
        pdf.text(verificacao.item, 40, yPosition);
        
        yPosition += 4;
        
        if (verificacao.observacao) {
          pdf.setTextColor(127, 140, 141);
          pdf.setFontSize(8);
          const obsLines = pdf.splitTextToSize(`Obs: ${verificacao.observacao}`, 150);
          pdf.text(obsLines, 30, yPosition);
          yPosition += obsLines.length * 3 + 2;
          pdf.setFontSize(9);
        }
      }

      yPosition += 2;

      if (yPosition > 250) {
        addProfessionalFooter(pdf);
        pdf.addPage();
        yPosition = 20;
      }
    });
    
    yPosition += 5;
  }

  if (generatorData.observacoes) {
    if (yPosition > 220) {
      addProfessionalFooter(pdf);
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setTextColor(44, 62, 80);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Observações Específicas:', 20, yPosition);
    yPosition += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const observacoesLines = pdf.splitTextToSize(generatorData.observacoes, 170);
    pdf.text(observacoesLines, 20, yPosition);
    yPosition += observacoesLines.length * 4 + 15;
  }

  return yPosition;
};

// Função para gerar PDF da Ordem de Serviço com múltiplos geradores
export const generateServiceOrderPDF = async (
  order: ServiceOrder,
  client: Client,
  generators: Generator[]
): Promise<jsPDF> => {
  const pdf = new jsPDF();
  
  try {
    let yPosition = await addProfessionalHeader(
      pdf, 
      'ORDEM DE SERVIÇO', 
      `#${order.id.slice(-6)}`, 
      order.data
    );

    yPosition = addSection(pdf, 'DADOS DO CLIENTE', yPosition);
    
    let nextY = addInfoField(pdf, 'Nome', client.nome, 20, yPosition, 85);
    nextY = addInfoField(pdf, 'Endereço', client.endereco, 20, nextY, 85);
    
    addInfoField(pdf, 'Telefone', client.telefone, 110, yPosition, 75);
    addInfoField(pdf, 'Email', client.email, 110, yPosition + 8, 75);
    
    yPosition = Math.max(nextY, yPosition + 16) + 10;

    yPosition = addSection(pdf, 'INFORMAÇÕES GERAIS DO SERVIÇO', yPosition);
    
    nextY = addInfoField(pdf, 'Técnico Responsável', order.tecnico, 20, yPosition, 85);
    
    // Obter todos os tipos de manutenção únicos
    const tiposManutencao = [...new Set(order.geradores.map(g => g.tipo_manutencao))];
    const tipoManutencaoText = tiposManutencao.join(', ');
    
    addInfoField(pdf, 'Tipo de Manutenção', tipoManutencaoText, 110, yPosition, 75);
    
    yPosition = Math.max(nextY, yPosition + 8) + 10;

    if (order.observacoes_gerais) {
      if (yPosition > 220) {
        addProfessionalFooter(pdf);
        pdf.addPage();
        yPosition = 20;
      }

      yPosition = addSection(pdf, 'OBSERVAÇÕES GERAIS', yPosition);

      pdf.setTextColor(44, 62, 80);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const observacoesLines = pdf.splitTextToSize(order.observacoes_gerais, 170);
      pdf.text(observacoesLines, 20, yPosition);
      yPosition += observacoesLines.length * 4 + 15;
    }

    order.geradores.forEach((generatorData, index) => {
      const generator = generators.find(g => g.id === generatorData.gerador_id);
      if (generator) {
        if (yPosition > 180) {
          addProfessionalFooter(pdf);
          pdf.addPage();
          yPosition = 20;
        }
        
        yPosition = addGeneratorInfo(pdf, generator, generatorData, index + 1, yPosition);
      }
    });

    if (yPosition > 220) {
      addProfessionalFooter(pdf);
      pdf.addPage();
      yPosition = 20;
    }

    yPosition = addSection(pdf, 'ASSINATURA DO CLIENTE', yPosition);

    pdf.setDrawColor(189, 195, 199);
    pdf.setLineWidth(0.5);
    pdf.line(20, yPosition + 30, 170, yPosition + 30);
    
    pdf.setTextColor(52, 73, 94);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Representante do Cliente', 20, yPosition + 35);
    
    if (order.assinatura) {
      try {
        const signatureBase64 = await loadImageAsBase64(order.assinatura);
        pdf.addImage(signatureBase64, 'PNG', 20, yPosition + 5, 80, 20);
      } catch (error) {
        console.error('Erro ao carregar assinatura:', error);
      }
    }
    
    if (order.representante) {
      pdf.setFont('helvetica', 'normal');
      pdf.text(order.representante, 20, yPosition + 40);
    }

    await addWatermark(pdf);
    addProfessionalFooter(pdf);

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }

  return pdf;
};

// Função para gerar PDF apenas do RTI (separado)
export const generateRTIPDF = async (
  rti: RTI,
  order: ServiceOrder,
  client: Client
): Promise<jsPDF> => {
  const pdf = new jsPDF();
  
  try {
    let yPosition = await addProfessionalHeader(
      pdf, 
      'RELATÓRIO TÉCNICO INTERNO', 
      `RTI #${rti.id.slice(-6)} - OS #${order.id.slice(-6)}`, 
      rti.data_criacao
    );

    yPosition = addSection(pdf, 'INFORMAÇÕES GERAIS', yPosition);
    
    let nextY = addInfoField(pdf, 'Cliente', client.nome, 20, yPosition, 85);
    nextY = addInfoField(pdf, 'Técnico', rti.tecnico, 20, nextY, 85);
    
    // Para RTI, usar o tipo de manutenção da OS (formato antigo) ou dos geradores (formato novo)
    let tipoManutencao = 'N/A';
    const legacyOrder = order as LegacyServiceOrder;
    if (legacyOrder.tipo_manutencao) {
      tipoManutencao = legacyOrder.tipo_manutencao;
    } else if (order.geradores && order.geradores.length > 0) {
      const tipos = [...new Set(order.geradores.map(g => g.tipo_manutencao))];
      tipoManutencao = tipos.join(', ');
    }
    
    addInfoField(pdf, 'Tipo de Manutenção', tipoManutencao, 110, yPosition, 75);
    if (rti.tempo_gasto) {
      addInfoField(pdf, 'Tempo Gasto', `${rti.tempo_gasto} horas`, 110, yPosition + 8, 75);
    }
    
    yPosition = Math.max(nextY, yPosition + 20) + 15;

    if (rti.problemas_identificados) {
      yPosition = addSection(pdf, 'PROBLEMAS IDENTIFICADOS', yPosition);
      
      pdf.setTextColor(44, 62, 80);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const problemasLines = pdf.splitTextToSize(rti.problemas_identificados, 170);
      pdf.text(problemasLines, 20, yPosition);
      yPosition += problemasLines.length * 4 + 15;
    }

    if (rti.solucao_aplicada) {
      if (yPosition > 220) {
        addProfessionalFooter(pdf);
        pdf.addPage();
        yPosition = 20;
      }
      
      yPosition = addSection(pdf, 'SOLUÇÃO APLICADA', yPosition);
      
      pdf.setTextColor(44, 62, 80);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      const solucaoLines = pdf.splitTextToSize(rti.solucao_aplicada, 170);
      pdf.text(solucaoLines, 20, yPosition);
      yPosition += solucaoLines.length * 4 + 15;
    }

    await addWatermark(pdf);
    addProfessionalFooter(pdf);

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw error;
  }

  return pdf;
};

// Função para fazer download do PDF
export const downloadPDF = (pdf: jsPDF, filename: string) => {
  pdf.save(filename);
};