// ═══════════════════════════════════════════════════════════════
// VIZZU - Auth Page (Modern Login/Signup)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';

interface AuthPageProps {
  onLogin: (user: { email: string; name: string; avatar?: string }) => void;
  onDemoMode?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onDemoMode }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'instagram') => {
    setIsLoading(true);
    setError('');
    
    // Simular login social (substituir por implementação real)
    setTimeout(() => {
      onLogin({
        email: `user@${provider}.com`,
        name: provider === 'google' ? 'Usuário Google' : provider === 'facebook' ? 'Usuário Facebook' : 'Usuário Instagram',
        avatar: undefined
      });
      setIsLoading(false);
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('As senhas não coincidem');
        return;
      }
      if (!acceptTerms) {
        setError('Você precisa aceitar os termos de uso');
        return;
      }
    }

    setIsLoading(true);
    
    // Simular autenticação (substituir por implementação real)
    setTimeout(() => {
      if (mode === 'forgot') {
        alert('Email de recuperação enviado para ' + email);
        setMode('login');
      } else {
        onLogin({
          email,
          name: name || email.split('@')[0],
        });
      }
      setIsLoading(false);
    }, 1500);
  };

  const features = [
    { icon: 'fa-wand-magic-sparkles', title: 'Studio IA', desc: 'Fotos profissionais em segundos' },
    { icon: 'fa-shirt', title: 'Provador Virtual', desc: 'Vista seus clientes remotamente' },
    { icon: 'fa-robot', title: 'Modelos IA', desc: 'Crie e salve modelos únicos' },
    { icon: 'fa-bolt', title: 'Super Rápido', desc: 'Resultados em menos de 30s' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LEFT SIDE - Video/Marketing */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative bg-black overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0">
          <video
            className="w-full h-full object-cover opacity-40"
            autoPlay
            loop
            muted
            playsInline
            poster=""
          >
            {/* Substitua pelo seu vídeo */}
            {/* <source src="/videos/hero-bg.mp4" type="video/mp4" /> */}
          </video>
          {/* Fallback gradient if no video */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-900 to-orange-900"></div>
        </div>
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16">
          {/* Logo */}
          <div>
            <h1 className="text-4xl font-serif font-bold text-white tracking-tight">Vizzu</h1>
            <p className="text-white/60 text-sm mt-1">AI Visual Studio para E-commerce</p>
          </div>
          
          {/* Main Content */}
          <div className="max-w-lg">
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
              Transforme suas fotos de produto em 
              <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-orange-400 bg-clip-text text-transparent"> obras de arte</span>
            </h2>
            <p className="text-white/70 text-lg leading-relaxed mb-8">
              Use inteligência artificial para criar imagens profissionais, 
              vestir clientes virtualmente e aumentar suas vendas em até 300%.
            </p>
            
            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <i className={`fas ${feature.icon} text-pink-400`}></i>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{feature.title}</p>
                    <p className="text-white/50 text-xs">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Social Proof */}
          <div className="flex items-center gap-6">
            <div className="flex -space-x-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 border-2 border-black flex items-center justify-center">
                  <i className="fas fa-user text-white text-xs"></i>
                </div>
              ))}
            </div>
            <div>
              <p className="text-white font-medium text-sm">+2.500 lojistas</p>
              <p className="text-white/50 text-xs">já transformaram suas lojas</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              {[1,2,3,4,5].map(i => (
                <i key={i} className="fas fa-star text-yellow-400 text-sm"></i>
              ))}
              <span className="text-white/70 text-sm ml-2">4.9/5</span>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* RIGHT SIDE - Auth Form */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-serif font-bold text-gray-900">Vizzu</h1>
            <p className="text-gray-500 text-sm">AI Visual Studio para E-commerce</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
            
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {mode === 'login' && 'Bem-vindo de volta!'}
                {mode === 'signup' && 'Crie sua conta'}
                {mode === 'forgot' && 'Recuperar senha'}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {mode === 'login' && 'Entre para acessar seu estúdio'}
                {mode === 'signup' && 'Comece a transformar suas imagens'}
                {mode === 'forgot' && 'Enviaremos um link para seu email'}
              </p>
            </div>

            {/* Social Login Buttons */}
            {mode !== 'forgot' && (
              <>
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => handleSocialLogin('google')}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continuar com Google
                  </button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleSocialLogin('facebook')}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1877F2] rounded-xl font-medium text-white hover:bg-[#166FE5] transition-all disabled:opacity-50"
                    >
                      <i className="fab fa-facebook-f"></i>
                      Facebook
                    </button>
                    <button
                      onClick={() => handleSocialLogin('instagram')}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-xl font-medium text-white hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      <i className="fab fa-instagram"></i>
                      Instagram
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-400">ou continue com email</span>
                  </div>
                </div>
              </>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
                  <div className="relative">
                    <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-pink-500 transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-pink-500 transition-colors"
                    required
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                  <div className="relative">
                    <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-pink-500 transition-colors"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar senha</label>
                    <div className="relative">
                      <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-pink-500 transition-colors"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                    />
                    <span className="text-sm text-gray-600">
                      Eu aceito os{' '}
                      <a href="#" className="text-pink-500 hover:underline">Termos de Uso</a>
                      {' '}e a{' '}
                      <a href="#" className="text-pink-500 hover:underline">Política de Privacidade</a>
                    </span>
                  </label>
                </>
              )}

              {mode === 'login' && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500" />
                    <span className="text-sm text-gray-600">Lembrar de mim</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-sm text-pink-500 hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Carregando...
                  </>
                ) : (
                  <>
                    {mode === 'login' && <><i className="fas fa-sign-in-alt"></i>Entrar</>}
                    {mode === 'signup' && <><i className="fas fa-rocket"></i>Criar conta grátis</>}
                    {mode === 'forgot' && <><i className="fas fa-paper-plane"></i>Enviar link</>}
                  </>
                )}
              </button>
            </form>

            {/* Mode Switch */}
            <div className="mt-6 text-center">
              {mode === 'login' && (
                <p className="text-gray-600 text-sm">
                  Não tem uma conta?{' '}
                  <button onClick={() => setMode('signup')} className="text-pink-500 font-medium hover:underline">
                    Criar conta grátis
                  </button>
                </p>
              )}
              {mode === 'signup' && (
                <p className="text-gray-600 text-sm">
                  Já tem uma conta?{' '}
                  <button onClick={() => setMode('login')} className="text-pink-500 font-medium hover:underline">
                    Fazer login
                  </button>
                </p>
              )}
              {mode === 'forgot' && (
                <button onClick={() => setMode('login')} className="text-pink-500 font-medium hover:underline text-sm">
                  <i className="fas fa-arrow-left mr-1"></i>
                  Voltar para login
                </button>
              )}
            </div>
          </div>

          {/* Demo Mode */}
          {onDemoMode && (
            <div className="mt-6 text-center">
              <button
                onClick={onDemoMode}
                className="text-gray-500 text-sm hover:text-gray-700 transition-colors"
              >
                <i className="fas fa-play-circle mr-1"></i>
                Testar sem criar conta
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-xs">
              © 2025 Vizzu. Todos os direitos reservados.
            </p>
            <div className="flex items-center justify-center gap-4 mt-2">
              <a href="#" className="text-gray-400 text-xs hover:text-gray-600">Termos</a>
              <a href="#" className="text-gray-400 text-xs hover:text-gray-600">Privacidade</a>
              <a href="#" className="text-gray-400 text-xs hover:text-gray-600">Suporte</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
