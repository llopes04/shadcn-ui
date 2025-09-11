# Sistema de Ordem de Serviço - PWA

Sistema completo para gerenciamento de ordens de serviço de geradores com funcionalidades PWA (Progressive Web App).

## 🚀 Funcionalidades

### ✅ Principais
- **Criação de OS** - Formulário completo para ordens de serviço
- **Gestão de Clientes** - Cadastro e gerenciamento de clientes
- **Geração de PDF** - Relatórios profissionais em PDF
- **Envio por Email** - Integração com EmailJS
- **Firebase** - Sincronização em nuvem
- **PWA** - Instalável como aplicativo móvel

### 📱 PWA Features
- **Instalação** - Instale no celular como app nativo
- **Offline** - Funciona sem internet para consultas
- **Sincronização** - Dados sincronizam quando voltar online
- **Notificações** - Alertas do sistema
- **Ícones Personalizados** - Visual profissional

## 🛠️ Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Shadcn/ui + Tailwind CSS
- **Backend**: Firebase Firestore
- **Email**: EmailJS
- **PWA**: Service Worker + Web App Manifest
- **PDF**: jsPDF + html2canvas
- **Deploy**: Vercel

## 📦 Instalação

### 1. Clone o repositório
```bash
git clone <repository-url>
cd sistema-os
```

### 2. Instale as dependências
```bash
pnpm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:
- Firebase (obtenha em https://console.firebase.google.com)
- EmailJS (obtenha em https://www.emailjs.com)

### 4. Execute o projeto
```bash
pnpm run dev
```

## 🔧 Configuração

### Firebase
1. Acesse o [Console Firebase](https://console.firebase.google.com)
2. Crie um novo projeto
3. Ative o Firestore Database
4. Copie as credenciais para o `.env`
5. Configure no app: Dashboard → Configurar Firebase

### EmailJS
1. Acesse o [EmailJS](https://www.emailjs.com)
2. Crie uma conta e configure um serviço
3. Copie as credenciais para o `.env`
4. Configure no app: Dashboard → Configurar Email

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Outros Provedores
- Netlify
- Firebase Hosting
- GitHub Pages

## 📱 Instalação PWA

### No Celular
1. Acesse o site pelo navegador
2. Toque em "Instalar Aplicativo" (popup)
3. Ou use "Adicionar à tela inicial" no menu do navegador

### No Desktop
1. Acesse o site
2. Clique no ícone de instalação na barra de endereços
3. Ou use Ctrl+Shift+A (Chrome)

## 🔄 Funcionalidades Offline

- **Consulta de OS** - Visualize ordens criadas
- **Dados de Clientes** - Acesse informações salvas
- **Cache Inteligente** - Carregamento rápido
- **Sincronização** - Dados sincronizam quando voltar online

## 📊 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (Shadcn)
│   ├── InstallPrompt.tsx
│   └── PWAStatus.tsx
├── hooks/              # Custom hooks
│   ├── usePWA.ts
│   └── useOnlineStatus.ts
├── pages/              # Páginas da aplicação
├── services/           # Serviços (Firebase, etc)
├── utils/              # Utilitários
└── types/              # Definições TypeScript

public/
├── icons/              # Ícones PWA
├── manifest.json       # Web App Manifest
└── sw.js              # Service Worker
```

## 🎯 Próximos Passos

- [ ] Notificações push
- [ ] Sincronização em background
- [ ] Backup automático
- [ ] Relatórios avançados
- [ ] Multi-idioma

## 📞 Suporte

Para dúvidas ou suporte, entre em contato através do sistema.

---

**Sistema OS** - Desenvolvido com ❤️ para profissionais de manutenção