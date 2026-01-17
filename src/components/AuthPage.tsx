import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Sparkles, Mail, Lock, User, ArrowRight } from 'lucide-react';

interface AuthPageProps {
  onLogin: (email: string, password: string) => void;
}

export function AuthPage({ onLogin }: AuthPageProps) {
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
        onLogin(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img 
              src="/logo.png" 
              alt="Vizzu" 
              className="h-16 w-auto mx-auto mb-4"
            />
            <p className="text-gray-400">AI Visual Studio para e-commerce</p>
          </div>

          {/* Form Card */}
          <div className="bg-[#12121a]/80 backdrop-blur-xl rounded-3xl p-8 border border-purple-900/30 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">
              {isSignUp ? 'Criar conta' : 'Bem-vindo de volta'}
            </h2>
            <p className="text-gray-400 text-center mb-6">
              {isSignUp ? 'Comece a criar imagens incríveis' : 'Entre para continuar'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Nome</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-[#0a0a0f] border border-purple-900/30 rounded-xl text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
                      placeholder="Seu nome"
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#0a0a0f] border border-purple-900/30 rounded-xl text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-[#0a0a0f] border border-purple-900/30 rounded-xl text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
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
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {isSignUp ? 'Criar conta' : 'Entrar'}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
                className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
              >
                {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Criar agora'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-purple-900/20 via-[#0a0a0f] to-pink-900/20 items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* Content */}
        <div className="relative z-10 text-center p-12">
          <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-purple-500/30">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Transforme suas
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              fotos de produto
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
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
                <p className="text-sm text-gray-300">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
