# Atualização da Página de Ordem de Serviço (OS)

## Objetivo
Atualizar a página ServiceOrders.tsx para incluir todos os campos específicos de manutenção mecânica e elétrica, com capacidade de múltiplas OS por vez e assinatura única no final.

## Arquivos a modificar/criar:
1. `/workspace/shadcn-ui/src/pages/ServiceOrders.tsx` - Página principal de OS
2. `/workspace/shadcn-ui/src/types/index.ts` - Atualizar tipos para novos campos
3. `/workspace/shadcn-ui/src/components/MultiOSForm.tsx` - Novo componente para múltiplas OS

## Campos a adicionar:

### Manutenção Mecânica:
- Tanque de combustivel: ok/obs (multipla escolha)
- Nível do combustivel: campo manual
- Estado do tanque: ok/obs
- Motor de partida: ok/obs
- Nível de água: ok/obs
- Mangueiras e Tubulações: ok/obs
- Verificação de vazamentos: ok/obs
- Verificação de correias: ok/obs
- Nível de óleo lubrificante: ok/obs
- Tempo de funcionamento: campo manual (horas)
- Ruídos estranhos no motor: ok/obs

### Manutenção Elétrica:
- Teste sem carga de 5min: ok/obs
- QTA: ok/obs
- Cabos de força/comandos: ok/obs
- Conexões e contatos elétricos: ok/obs
- Pré aquecimento: ok/obs
- Solenoide: ok/obs
- Fase R/S: campo manual
- Fase T/R: campo manual
- Fase T/S: campo manual
- Frequência: campo manual (HZ)
- KVA: campo manual
- Cabos e polos da bateria: ok/obs
- Bateria: ok/obs
- Tensão da bateria em standby: campo manual
- Tensão da bateria carregando: campo manual
- Queda de tensão da bateria: campo manual
- Temperatura da água: campo manual
- Pressão do óleo: campo manual

### Campos adicionais:
- Técnico: campo manual
- Representante cliente: campo manual
- Data: automática

## Funcionalidades:
- Sistema de múltiplas OS (adicionar/remover)
- Assinatura única no final de todas as OS
- Validação de campos obrigatórios
- Layout responsivo

## Prioridade:
1. Atualizar tipos em index.ts
2. Criar componente MultiOSForm
3. Modificar ServiceOrders.tsx
4. Testar funcionalidade