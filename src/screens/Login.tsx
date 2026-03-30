import React, { useState } from 'react';
import { auth, loginWithGoogle, logout, loginWithEmail, registerWithEmail, saveUserProfile } from '../services/firebase';
import { LogIn, GraduationCap, Mail, Lock, UserPlus, User, Hash, Camera, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'email' | 'register'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [matricula, setMatricula] = useState('');
  const [telefone, setTelefone] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  const validateEmail = (email: string) => {
    return email.endsWith('@firjan.com.br') || email.endsWith('@docente.firjan.senai.br');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for base64
        setError('A foto deve ter no máximo 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError('Acesso restrito. Por favor, utilize um e-mail corporativo @firjan.com.br');
      return;
    }

    if (mode === 'register' && password.length < 8) {
      setError('A senha deve ter no mínimo 8 dígitos');
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
          telefone,
          photoURL,
          email
        });
      } else {
        await loginWithEmail(email, password);
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      let message = 'Erro ao autenticar';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        message = 'E-mail ou senha incorretos';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'Este e-mail já está em uso';
      }
      setError(message);
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

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-6 text-sm font-bold"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

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
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="tel"
                    placeholder="Telefone/WhatsApp (Ex: 24999999999)"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    required
                    className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-4 focus:outline-none focus:border-neon-purple transition-all"
                  />
                </div>
                <div className="relative">
                  <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <div className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-4 flex items-center justify-between">
                    <span className="text-gray-500 text-sm truncate">
                      {photoURL ? 'Foto selecionada' : 'Foto de Perfil'}
                    </span>
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {photoURL && (
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-neon-purple">
                        <img src={photoURL} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
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
