import React, { useState } from 'react';
import { auth, loginWithGoogle, logout, loginWithEmail, registerWithEmail, saveUserProfile } from '../services/firebase';
import { LogIn, GraduationCap, Mail, Lock, UserPlus, User, Hash, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'email' | 'register'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [matricula, setMatricula] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  const validateEmail = (email: string) => {
    return email.endsWith('@firjan.com.br');
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      alert('Acesso restrito. Por favor, utilize um e-mail corporativo @firjan.com.br');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const userCredential = await registerWithEmail(email, password);
        const user = userCredential.user;
        await saveUserProfile(user.uid, {
          name,
          matricula,
          photoURL,
          email
        });
      } else {
        await loginWithEmail(email, password);
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      alert(error.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-dark-bg p-4 overflow-hidden relative">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-purple/20 blur-[100px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-neon-green/20 blur-[100px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center w-full max-w-md"
      >
        <div className="flex items-center justify-center mb-6">
          <GraduationCap className="w-16 h-16 text-neon-green mr-2" />
          <h1 className="text-5xl font-black tracking-tighter">
            PROJECT<span className="text-neon-purple">HUB</span>
          </h1>
        </div>
        
        <p className="text-xl text-gray-400 mb-8 mx-auto">
          Acesso restrito para <span className="text-neon-purple font-bold">Professores Orientadores</span>.
        </p>

        <div className="bg-dark-card p-8 rounded-3xl border border-white/5 shadow-2xl">
          <h2 className="text-2xl font-bold mb-8 text-white">
            {mode === 'register' ? 'Cadastro de Professor' : 'Login Corporativo'}
          </h2>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="text"
                    placeholder="Nome Completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-neon-purple transition-all"
                  />
                </div>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="text"
                    placeholder="Matrícula"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-neon-purple transition-all"
                  />
                </div>
                <div className="relative">
                  <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="text"
                    placeholder="URL da Foto de Perfil"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-neon-purple transition-all"
                  />
                </div>
              </>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="email"
                placeholder="E-mail @firjan.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-neon-purple transition-all"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="password"
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-neon-purple transition-all"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="neon-button-green w-full flex items-center justify-center gap-3 text-lg py-4"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" />
              ) : (
                <>
                  {mode === 'register' ? <UserPlus className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
                  {mode === 'register' ? 'Criar Conta' : 'Entrar'}
                </>
              )}
            </button>
            <button 
              type="button"
              onClick={() => setMode(mode === 'email' ? 'register' : 'email')}
              className="text-gray-500 text-sm hover:text-neon-purple transition-colors"
            >
              {mode === 'email' ? 'Não tem conta? Cadastre-se como Professor' : 'Já tem conta? Faça Login'}
            </button>
          </form>
        </div>

        <div className="mt-16 flex justify-center text-gray-500 text-sm uppercase tracking-widest font-bold">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white" />
            By Márcio Vinícius
          </div>
        </div>
      </motion.div>
    </div>
  );
}
