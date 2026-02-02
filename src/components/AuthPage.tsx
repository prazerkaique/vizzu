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
 const [isMagicLink, setIsMagicLink] = useState(false);
 const [magicLinkSent, setMagicLinkSent] = useState(false);
 const [isForgotPassword, setIsForgotPassword] = useState(false);
 const [resetSent, setResetSent] = useState(false);

 const handleForgotPassword = async (e: React.FormEvent) => {
   e.preventDefault();
   setIsLoading(true);
   setError('');
   try {
     const { error } = await supabase.auth.resetPasswordForEmail(email, {
       redirectTo: window.location.origin
     });
     if (error) throw error;
     setResetSent(true);
   } catch (err: any) {
     setError(err.message || 'Erro ao enviar email de recuperação');
   } finally {
     setIsLoading(false);
   }
 };

 const handleMagicLink = async (e: React.FormEvent) => {
   e.preventDefault();
   setIsLoading(true);
   setError('');
   try {
     const { error } = await supabase.auth.signInWithOtp({
       email,
       options: { emailRedirectTo: window.location.origin }
     });
     if (error) throw error;
     setMagicLinkSent(true);
   } catch (err: any) {
     setError(err.message || 'Erro ao enviar link de acesso');
   } finally {
     setIsLoading(false);
   }
 };

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
     className="bg-cream flex overflow-auto"
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
             src="/Logo2Black.png"
             alt="Vizzu"
             className="h-16 w-auto mx-auto mb-4"
           />
           <p className="text-gray-500 text-sm font-serif italic">Estúdio de Bolso</p>
         </div>

         {/* Form Card */}
         <div className="bg-white rounded-3xl p-8 border border-gray-200 ">
           <h2 className="text-2xl font-bold font-serif text-gray-900 mb-2 text-center">
             {isSignUp ? 'Criar conta' : 'Bem-vindo de volta'}
           </h2>
           <p className="text-gray-500 text-center mb-6 text-sm">
             {isSignUp ? 'Comece a criar imagens incríveis' : 'Entre para continuar'}
           </p>

           {/* Google Login */}
           <button
             onClick={handleGoogleLogin}
             className="w-full py-3 bg-gray-50 text-gray-900 rounded-xl font-medium text-sm flex items-center justify-center gap-3 hover:bg-gray-100 border border-gray-200 transition-colors mb-4"
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
               <div className="w-full border-t border-gray-200"></div>
             </div>
             <div className="relative flex justify-center text-xs">
               <span className="px-3 bg-white text-gray-400">ou</span>
             </div>
           </div>

           {isForgotPassword ? (
             resetSent ? (
               <div className="text-center py-4">
                 <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                   <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                   </svg>
                 </div>
                 <h3 className="text-lg font-semibold text-gray-900 mb-2">Email enviado!</h3>
                 <p className="text-gray-500 text-sm mb-4">
                   Verifique sua caixa de entrada em <strong>{email}</strong> e siga as instruções para redefinir sua senha.
                 </p>
                 <button
                   onClick={() => { setResetSent(false); setIsForgotPassword(false); setError(''); }}
                   className="text-[#E91E8C] hover:text-[#E91E8C]/80 text-sm transition-colors"
                 >
                   Voltar ao login
                 </button>
               </div>
             ) : (
               <form onSubmit={handleForgotPassword} className="space-y-4">
                 <p className="text-gray-500 text-sm">
                   Informe seu email e enviaremos um link para redefinir sua senha.
                 </p>
                 <div>
                   <label className="block text-sm text-gray-600 mb-2">Email</label>
                   <div className="relative">
                     <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                     </svg>
                     <input
                       type="email"
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-[#E91E8C] focus:outline-none transition-colors"
                       placeholder="seu@email.com"
                       required
                     />
                   </div>
                 </div>

                 {error && <p className="text-sm text-red-500">{error}</p>}

                 <button
                   type="submit"
                   disabled={isLoading}
                   className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                   {isLoading ? (
                     <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                   ) : 'Enviar link de recuperação'}
                 </button>

                 <button
                   type="button"
                   onClick={() => { setIsForgotPassword(false); setError(''); }}
                   className="w-full text-center text-[#E91E8C] hover:text-[#E91E8C]/80 text-sm transition-colors"
                 >
                   Voltar ao login
                 </button>
               </form>
             )
           ) : isMagicLink ? (
             magicLinkSent ? (
               <div className="text-center py-4">
                 <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                   <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                   </svg>
                 </div>
                 <h3 className="text-lg font-semibold text-gray-900 mb-2">Link enviado!</h3>
                 <p className="text-gray-500 text-sm mb-4">
                   Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para entrar.
                 </p>
                 <button
                   onClick={() => { setMagicLinkSent(false); setIsMagicLink(false); setError(''); }}
                   className="text-[#E91E8C] hover:text-[#E91E8C]/80 text-sm transition-colors"
                 >
                   Voltar ao login
                 </button>
               </div>
             ) : (
               <form onSubmit={handleMagicLink} className="space-y-4">
                 <div>
                   <label className="block text-sm text-gray-600 mb-2">Email</label>
                   <div className="relative">
                     <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                     </svg>
                     <input
                       type="email"
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-[#E91E8C] focus:outline-none transition-colors"
                       placeholder="seu@email.com"
                       required
                     />
                   </div>
                 </div>

                 {error && <p className="text-sm text-red-500">{error}</p>}

                 <button
                   type="submit"
                   disabled={isLoading}
                   className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                   {isLoading ? (
                     <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                   ) : 'Enviar link de acesso'}
                 </button>

                 <button
                   type="button"
                   onClick={() => { setIsMagicLink(false); setError(''); }}
                   className="w-full text-center text-[#E91E8C] hover:text-[#E91E8C]/80 text-sm transition-colors"
                 >
                   Voltar ao login com senha
                 </button>
               </form>
             )
           ) : (
             <>
               <form onSubmit={handleSubmit} className="space-y-4">
                 {isSignUp && (
                   <div>
                     <label className="block text-sm text-gray-600 mb-2">Nome</label>
                     <div className="relative">
                       <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                       </svg>
                       <input
                         type="text"
                         id="auth-name"
                         name="name"
                         autoComplete="name"
                         value={name}
                         onChange={(e) => setName(e.target.value)}
                         className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-[#E91E8C] focus:outline-none transition-colors"
                         placeholder="Seu nome"
                         required={isSignUp}
                       />
                     </div>
                   </div>
                 )}

                 <div>
                   <label className="block text-sm text-gray-600 mb-2">Email</label>
                   <div className="relative">
                     <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                     </svg>
                     <input
                       type="email"
                       id="auth-email"
                       name="email"
                       autoComplete="email"
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-[#E91E8C] focus:outline-none transition-colors"
                       placeholder="seu@email.com"
                       required
                     />
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm text-gray-600 mb-2">Senha</label>
                   <div className="relative">
                     <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                     </svg>
                     <input
                       type="password"
                       id="auth-password"
                       name="password"
                       autoComplete={isSignUp ? "new-password" : "current-password"}
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-[#E91E8C] focus:outline-none transition-colors"
                       placeholder="••••••••"
                       required
                     />
                   </div>
                 </div>

                 {!isSignUp && (
                   <div className="text-right -mt-2">
                     <button
                       type="button"
                       onClick={() => { setIsForgotPassword(true); setError(''); }}
                       className="text-xs text-gray-400 hover:text-[#E91E8C] transition-colors"
                     >
                       Esqueci minha senha
                     </button>
                   </div>
                 )}

                 {error && (
                   <p className={`text-sm ${error.includes('✓') ? 'text-green-600' : 'text-red-500'}`}>
                     {error}
                   </p>
                 )}

                 <button
                   type="submit"
                   disabled={isLoading}
                   className="w-full py-3 bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] text-white font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
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

               {!isSignUp && (
                 <button
                   onClick={() => { setIsMagicLink(true); setError(''); }}
                   className="w-full mt-3 py-3 bg-gray-50 text-gray-700 font-medium rounded-xl hover:bg-gray-100 border border-gray-200 transition-colors text-sm flex items-center justify-center gap-2"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                   </svg>
                   Entrar com link por email
                 </button>
               )}

               <div className="mt-6 text-center">
                 <button
                   onClick={() => {
                     setIsSignUp(!isSignUp);
                     setError('');
                   }}
                   className="text-[#E91E8C] hover:text-[#E91E8C]/80 text-sm transition-colors"
                 >
                   {isSignUp ? 'Já tem conta? Entrar' : (
                     <span>
                       Não tem conta? <strong>Criar agora</strong>
                       <span className="block text-gray-400 text-xs mt-1">
                         Ganhe 50 créditos grátis para testar
                       </span>
                     </span>
                   )}
                 </button>
               </div>
             </>
           )}
         </div>
       </div>
     </div>

     {/* Right Side - Visual */}
     <div className="hidden lg:flex w-1/2 bg-[#efebe6] items-center justify-center relative overflow-hidden">
       {/* Content */}
       <div className="relative z-10 text-left p-12 max-w-lg">
         <h2 className="text-4xl font-extrabold text-[#373632] mb-4 leading-tight">
           Foto de celular.
           <br />
           <span className="bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] bg-clip-text text-transparent">
             Resultado de estúdio.
           </span>
         </h2>
         <p className="text-[#373632]/60 text-lg mb-10">
           Crie fotos profissionais para sua loja em segundos. Sem estúdio, sem fotógrafo.
         </p>

         {/* Feature list */}
         <div className="space-y-3">
           {[
             'Fotos de estúdio',
             'Provador virtual',
             'Modelos com IA',
             'Looks completos',
             'Stills criativos'
           ].map((feature, i) => (
             <div key={i} className="flex items-center gap-3">
               <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#FF6B6B] to-[#FF9F43] flex-shrink-0" />
               <span className="text-sm text-[#373632]/80">{feature}</span>
             </div>
           ))}
         </div>
       </div>
     </div>
   </div>
 );
}
