import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, Save, Trash2, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface CompanyConfig {
  logoUrl?: string;
  logoBase64?: string;
  watermarkUrl?: string;
  watermarkBase64?: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
}

interface EmailConfig {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPassword: string;
  emailFrom: string;
  emailSubject: string;
  emailTemplate: string;
}

export default function ConfigLogo() {
  const navigate = useNavigate();
  const [companyConfig, setCompanyConfig] = useLocalStorage<CompanyConfig>('companyConfig', {
    companyName: 'Sua Empresa',
    companyAddress: 'Endereço da empresa',
    companyPhone: '(00) 0000-0000',
    companyEmail: 'contato@empresa.com',
    companyWebsite: 'www.empresa.com'
  });

  const [emailConfig, setEmailConfig] = useLocalStorage<EmailConfig>('emailConfig', {
    smtpHost: 'smtp.empresa.com',
    smtpPort: '587',
    smtpUser: 'contato@empresa.com',
    smtpPassword: '',
    emailFrom: 'Suporte Técnico <suporte@empresa.com>',
    emailSubject: 'Relatório Técnico - [Nº da OS]',
    emailTemplate: `Prezado cliente,

Segue em anexo o relatório técnico referente ao serviço prestado em seu equipamento.

Estamos à disposição para quaisquer esclarecimentos.

Atenciosamente,
Equipe Técnica`
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(companyConfig.logoBase64 || null);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(companyConfig.watermarkBase64 || null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setLogoPreview(base64String);
      setCompanyConfig({
        ...companyConfig,
        logoBase64: base64String
      });
    };
    reader.readAsDataURL(file);
  };

  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setWatermarkPreview(base64String);
      setCompanyConfig({
        ...companyConfig,
        watermarkBase64: base64String
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCompanyChange = (field: keyof CompanyConfig, value: string) => {
    setCompanyConfig({
      ...companyConfig,
      [field]: value
    });
  };

  const handleEmailChange = (field: keyof EmailConfig, value: string) => {
    setEmailConfig({
      ...emailConfig,
      [field]: value
    });
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setCompanyConfig({
      ...companyConfig,
      logoBase64: undefined
    });
  };

  const handleRemoveWatermark = () => {
    setWatermarkPreview(null);
    setCompanyConfig({
      ...companyConfig,
      watermarkBase64: undefined
    });
  };

  const handleSaveChanges = () => {
    // Save changes is automatic with localStorage hooks
    toast.success('Configurações salvas com sucesso');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} />
          </Button>
          <h1 className="text-2xl font-bold">Configurações de Logo e Marca d'água</h1>
        </div>

        <Tabs defaultValue="identity">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="identity">Identidade Visual</TabsTrigger>
            <TabsTrigger value="email">Configurações de Email</TabsTrigger>
          </TabsList>
          
          <TabsContent value="identity" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Logo Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Logo da Empresa</CardTitle>
                  <CardDescription>
                    A logo será exibida no cabeçalho dos relatórios e PDFs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    {logoPreview ? (
                      <div className="flex flex-col gap-2">
                        <div className="border rounded-lg p-4 bg-white flex items-center justify-center">
                          <img 
                            src={logoPreview} 
                            alt="Logo preview" 
                            className="max-h-40 max-w-full" 
                          />
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={handleRemoveLogo}
                          className="mt-2"
                        >
                          <Trash2 size={16} className="mr-2" />
                          Remover
                        </Button>
                      </div>
                    ) : (
                      <div className="border border-dashed rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50">
                        <Upload size={24} className="text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 mb-4">Upload da sua logo</p>
                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoUpload} 
                          className="max-w-xs"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Watermark Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Marca d'água</CardTitle>
                  <CardDescription>
                    A marca d'água será aplicada em todos os documentos gerados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    {watermarkPreview ? (
                      <div className="flex flex-col gap-2">
                        <div className="border rounded-lg p-4 bg-white flex items-center justify-center bg-gray-100">
                          <img 
                            src={watermarkPreview} 
                            alt="Watermark preview" 
                            className="max-h-40 max-w-full opacity-30" 
                          />
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={handleRemoveWatermark}
                          className="mt-2"
                        >
                          <Trash2 size={16} className="mr-2" />
                          Remover
                        </Button>
                      </div>
                    ) : (
                      <div className="border border-dashed rounded-lg p-8 flex flex-col items-center justify-center bg-gray-50">
                        <Upload size={24} className="text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 mb-4">Upload da sua marca d'água</p>
                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleWatermarkUpload} 
                          className="max-w-xs"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Company Information */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Informações da Empresa</CardTitle>
                <CardDescription>
                  Estas informações serão exibidas em documentos e emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input
                      id="companyName"
                      value={companyConfig.companyName}
                      onChange={(e) => handleCompanyChange('companyName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyAddress">Endereço</Label>
                    <Input
                      id="companyAddress"
                      value={companyConfig.companyAddress}
                      onChange={(e) => handleCompanyChange('companyAddress', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Telefone</Label>
                    <Input
                      id="companyPhone"
                      value={companyConfig.companyPhone}
                      onChange={(e) => handleCompanyChange('companyPhone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail">Email</Label>
                    <Input
                      id="companyEmail"
                      value={companyConfig.companyEmail}
                      onChange={(e) => handleCompanyChange('companyEmail', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="companyWebsite">Website</Label>
                    <Input
                      id="companyWebsite"
                      value={companyConfig.companyWebsite}
                      onChange={(e) => handleCompanyChange('companyWebsite', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="email" className="mt-4">
            {/* Email Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Servidor de Email</CardTitle>
                <CardDescription>
                  Configure o servidor SMTP para envio de emails
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">Servidor SMTP</Label>
                    <Input
                      id="smtpHost"
                      value={emailConfig.smtpHost}
                      onChange={(e) => handleEmailChange('smtpHost', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">Porta</Label>
                    <Input
                      id="smtpPort"
                      value={emailConfig.smtpPort}
                      onChange={(e) => handleEmailChange('smtpPort', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">Usuário</Label>
                    <Input
                      id="smtpUser"
                      value={emailConfig.smtpUser}
                      onChange={(e) => handleEmailChange('smtpUser', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPassword">Senha</Label>
                    <Input
                      id="smtpPassword"
                      type="password"
                      value={emailConfig.smtpPassword}
                      onChange={(e) => handleEmailChange('smtpPassword', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Modelo de Email</CardTitle>
                <CardDescription>
                  Configure o modelo de email que será enviado aos clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emailFrom">Remetente</Label>
                  <Input
                    id="emailFrom"
                    value={emailConfig.emailFrom}
                    onChange={(e) => handleEmailChange('emailFrom', e.target.value)}
                    placeholder="Nome <email@empresa.com>"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailSubject">Assunto</Label>
                  <Input
                    id="emailSubject"
                    value={emailConfig.emailSubject}
                    onChange={(e) => handleEmailChange('emailSubject', e.target.value)}
                    placeholder="Relatório Técnico - [Nº da OS]"
                  />
                  <p className="text-xs text-gray-500">Use [Nº da OS] para incluir o número da OS automaticamente</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailTemplate">Mensagem Padrão</Label>
                  <Textarea
                    id="emailTemplate"
                    value={emailConfig.emailTemplate}
                    onChange={(e) => handleEmailChange('emailTemplate', e.target.value)}
                    placeholder="Conteúdo do email..."
                    rows={8}
                  />
                </div>
                <div className="pt-2">
                  <Button className="w-full sm:w-auto flex gap-2 items-center">
                    <Mail size={16} />
                    Testar Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
          >
            Cancelar
          </Button>
          <Button 
            className="bg-green-600 hover:bg-green-700"
            onClick={handleSaveChanges}
          >
            <Save size={16} className="mr-2" />
            Salvar Configurações
          </Button>
        </div>
      </div>
    </div>
  );
}