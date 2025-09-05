import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Settings, Info, ExternalLink, ArrowLeft } from 'lucide-react';
import { EmailJSConfig } from '@/utils/emailJSService';

const ConfigEmail = () => {
  const navigate = useNavigate();
  const [emailConfig, setEmailConfig] = useState<EmailJSConfig>({
    serviceId: '',
    templateId: '',
    publicKey: '',
    companyName: '',
    signature: ''
  });
  const [isSaved, setIsSaved] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Carregar configurações salvas
  useEffect(() => {
    const savedConfig = localStorage.getItem('emailjs_config');
    if (savedConfig) {
      setEmailConfig(JSON.parse(savedConfig));
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('emailjs_config', JSON.stringify(emailConfig));
    setIsSaved(true);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleInputChange = (field: keyof EmailJSConfig, value: string) => {
    setEmailConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setIsSaved(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Configuração de Email
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure o EmailJS para envio automático de ordens de serviço por email
        </p>
      </div>

      {showSuccess && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <Settings className="h-4 w-4" />
          <AlertDescription className="text-green-800">
            Configurações salvas com sucesso!
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="tutorial">Tutorial</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações do EmailJS
              </CardTitle>
              <CardDescription>
                Configure suas credenciais do EmailJS para envio de emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceId">Service ID</Label>
                  <Input
                    id="serviceId"
                    placeholder="Ex: service_xxxxxxx"
                    value={emailConfig.serviceId}
                    onChange={(e) => handleInputChange('serviceId', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="templateId">Template ID</Label>
                  <Input
                    id="templateId"
                    placeholder="Ex: template_xxxxxxx"
                    value={emailConfig.templateId}
                    onChange={(e) => handleInputChange('templateId', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="publicKey">Public Key</Label>
                <Input
                  id="publicKey"
                  placeholder="Ex: xxxxxxxxxxxxxxxx"
                  value={emailConfig.publicKey}
                  onChange={(e) => handleInputChange('publicKey', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa</Label>
                <Input
                  id="companyName"
                  placeholder="Ex: Minha Empresa Ltda"
                  value={emailConfig.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">Assinatura do Email</Label>
                <Textarea
                  id="signature"
                  placeholder="Ex: Equipe de Suporte Técnico&#10;Tel: (11) 9999-9999&#10;Email: suporte@empresa.com"
                  value={emailConfig.signature}
                  onChange={(e) => handleInputChange('signature', e.target.value)}
                  rows={4}
                />
              </div>

              <Button 
                onClick={handleSave} 
                className="w-full"
                disabled={!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey}
              >
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tutorial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Como Configurar o EmailJS
              </CardTitle>
              <CardDescription>
                Siga este passo a passo para configurar o envio de emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-lg">1. Criar Conta no EmailJS</h3>
                  <p className="text-muted-foreground">
                    Acesse <a href="https://www.emailjs.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                      emailjs.com <ExternalLink className="h-3 w-3" />
                    </a> e crie uma conta gratuita
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-semibold text-lg">2. Configurar Serviço de Email</h3>
                  <p className="text-muted-foreground">
                    Vá em "Email Services" e adicione seu provedor (Gmail, Outlook, etc.)
                  </p>
                </div>

                <div className="border-l-4 border-yellow-500 pl-4">
                  <h3 className="font-semibold text-lg">3. Criar Template</h3>
                  <p className="text-muted-foreground mb-2">
                    Crie um template com as seguintes variáveis:
                  </p>
                  <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                    <div>{'{{to_email}}'} - Email do destinatário</div>
                    <div>{'{{to_name}}'} - Nome do cliente</div>
                    <div>{'{{from_name}}'} - Nome da empresa</div>
                    <div>{'{{subject}}'} - Assunto do email</div>
                    <div>{'{{order_number}}'} - Número da OS</div>
                    <div>{'{{order_date}}'} - Data da OS</div>
                    <div>{'{{technician}}'} - Nome do técnico</div>
                    <div>{'{{maintenance_type}}'} - Tipo de manutenção</div>
                    <div>{'{{client_name}}'} - Nome do cliente</div>
                    <div>{'{{company_name}}'} - Nome da empresa</div>
                    <div>{'{{signature}}'} - Assinatura</div>
                  </div>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-semibold text-lg">4. Obter Credenciais</h3>
                  <p className="text-muted-foreground">
                    Copie o Service ID, Template ID e Public Key do painel do EmailJS
                  </p>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="font-semibold text-lg">5. Configurar neste App</h3>
                  <p className="text-muted-foreground">
                    Cole as credenciais na aba "Configuração" acima e salve
                  </p>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Dica:</strong> O EmailJS oferece 200 emails gratuitos por mês. 
                  Para mais emails, você pode fazer upgrade do plano.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfigEmail;