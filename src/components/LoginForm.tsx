import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authService } from '@/services/firebaseService';
import { isFirebaseConfigured } from '@/lib/firebase';
import { LogIn, UserPlus, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    usuario: '',
    password: '',
    telefone: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFirebaseConfigured()) {
      setMessage({ type: 'error', text: 'Firebase não está configurado. Configure primeiro.' });
      return;
    }

    if (!formData.usuario || !formData.password) {
      setMessage({ type: 'error', text: 'Usuário e senha são obrigatórios.' });
      return;
    }

    if (!isLogin && !formData.nome) {
      setMessage({ type: 'error', text: 'Nome é obrigatório para cadastro.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        console.log('🔐 Tentando fazer login...');
        const result = await authService.login(formData.usuario, formData.password);
        
        if (result.success) {
          setMessage({ type: 'success', text: `Bem-vindo, ${result.user?.nome}!` });
          setTimeout(() => {
            onLoginSuccess();
          }, 1000);
        } else {
          setMessage({ type: 'error', text: result.message || 'Erro no login' });
        }
      } else {
        console.log('📝 Tentando cadastrar usuário...');
        const result = await authService.register({
          nome: formData.nome,
          usuario: formData.usuario,
          senha: formData.password,
          telefone: formData.telefone
        });
        
        if (result.success) {
          setMessage({ type: 'success', text: 'Usuário cadastrado com sucesso! Faça login.' });
          setIsLogin(true);
          setFormData({ nome: '', usuario: '', password: '', telefone: '' });
        } else {
          setMessage({ type: 'error', text: result.message || 'Erro no cadastro' });
        }
      }
    } catch (error) {
      console.error('Erro na autenticação:', error);
      setMessage({ type: 'error', text: 'Erro interno. Tente novamente.' });
    } finally {
      setIsLoading(false);
    }
  };

  const isConfigured = isFirebaseConfigured();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            {isLogin ? 'Login' : 'Cadastro'}
          </CardTitle>
          <CardDescription>
            {isLogin ? 'Entre com suas credenciais' : 'Crie sua conta'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isConfigured && (
            <Alert className="mb-4 border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                Firebase não está configurado. Configure primeiro em "Configurar Firebase".
              </AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className={`mb-4 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <AlertCircle className={`h-4 w-4 ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`} />
              <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <Label htmlFor="nome">Nome Completo</Label>
                <Input
                  id="nome"
                  type="text"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  placeholder="Digite seu nome completo"
                  disabled={!isConfigured}
                />
              </div>
            )}

            <div>
              <Label htmlFor="usuario">Usuário</Label>
              <Input
                id="usuario"
                type="text"
                value={formData.usuario}
                onChange={(e) => handleInputChange('usuario', e.target.value)}
                placeholder="Digite seu usuário"
                disabled={!isConfigured}
              />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Digite sua senha"
                  disabled={!isConfigured}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={!isConfigured}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <Label htmlFor="telefone">Telefone (Opcional)</Label>
                <Input
                  id="telefone"
                  type="tel"
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  placeholder="Digite seu telefone"
                  disabled={!isConfigured}
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!isConfigured || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : isLogin ? (
                <LogIn className="w-4 h-4 mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              {isLoading ? 'Processando...' : isLogin ? 'Entrar' : 'Cadastrar'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage(null);
                setFormData({ nome: '', usuario: '', password: '', telefone: '' });
              }}
              disabled={!isConfigured}
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}