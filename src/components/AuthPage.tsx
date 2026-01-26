import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface UserData {
  email: string;
  name: string;
  avatar?: string;
}

interface AuthPageProps {
  onLogin: (userData: UserData) => void;
  onDemoMode: () => void;
}

export function AuthPage({ onLogin, onDemoMode }: AuthPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { name }
          }
        });
        if (error) throw error;
        setError('✓ Verifique seu email para confirmar o cadastro!');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          onLogin({
            email: data.user.email || email,
            name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || email.split('@')[0],
            avatar: data.user.user_metadata?.avatar_url || ''
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ 
      provider: 'google', 
      options: { redirectTo: window.location.origin } 
    });
  };

  return (
    <div
      className="bg-[#0a0a0f] flex overflow-auto"
      style={{
        minHeight: '100dvh',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img 
              src="/logo.png" 
              alt="Vizzu" 
              className="h-16 w-auto mx-auto mb-4"
            />
            <p className="text-gray-400 text-sm">AI Visual Studio para e-commerce</p>
          </div>

          {/* Form Card */}
          <div className="bg-neutral-900/80 backdrop-blur-xl rounded-3xl p-8 border border-neutral-800 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              {isSignUp ? 'Criar conta' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-neutral-400 text-center mb-6 text-sm">
              {isSignUp ? 'Comece a criar imagens incríveis' : 'Entre para continuar'}
            </p>

            {/* Google Login */}
            <button 
              onClick={handleGoogleLogin}
              className="w-full py-3 bg-white text-neutral-900 rounded-xl font-medium text-sm flex items-center justify-center gap-3 hover:bg-neutral-100 transition-colors mb-4"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com Google
            </button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-neutral-900 text-neutral-600">ou</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Nome</label>
                  <div className="relative">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-600 focus:border-pink-500 focus:outline-none transition-colors"
                      placeholder="Seu nome"
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-neutral-400 mb-2">Email</label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-600 focus:border-pink-500 focus:outline-none transition-colors"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">Senha</label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-600 focus:border-pink-500 focus:outline-none transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <p className={`text-sm ${error.includes('✓') ? 'text-green-400' : 'text-red-400'}`}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-orange-400 text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {isSignUp ? 'Criar conta' : 'Entrar'}
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-pink-400 hover:text-pink-300 text-sm transition-colors"
              >
                {isSignUp ? 'Já tem conta? Entrar' : (
                  <span>
                    Não tem conta? <strong>Criar agora</strong>
                    <span className="block text-neutral-500 text-xs mt-1">
                      Ganhe 50 créditos grátis para testar
                    </span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-pink-900/20 via-[#0a0a0f] to-orange-900/20 items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center p-12">
          <div className="w-24 h-24 bg-gradient-to-r from-pink-500 to-orange-400 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-pink-500/30">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Transforme suas
            <br />
            <span className="bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent">
              fotos de produto
            </span>
          </h2>
          <p className="text-neutral-400 text-lg max-w-md mx-auto">
            Use inteligência artificial para criar imagens profissionais de e-commerce em segundos
          </p>

          {/* Features */}
          <div className="mt-12 grid grid-cols-2 gap-4 max-w-sm mx-auto">
            {[
              'Remove fundos',
              'Modelos IA',
              'Cenários pro',
              'Provador virtual'
            ].map((feature, i) => (
              <div 
                key={i}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10"
              >
                <p className="text-sm text-neutral-300">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
