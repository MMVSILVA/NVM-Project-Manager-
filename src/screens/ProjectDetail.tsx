import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth, getUserProfile } from '../services/firebase';
import { getTasks, createTask, updateTaskStatus, deleteTask } from '../services/atividades';
import { updateProject } from '../services/projetos';
import { generateTasks, generateSchedule } from '../services/ia';
import { ArrowLeft, Plus, Trash2, Sparkles, Calendar, Loader2, Rocket, LayoutDashboard, CheckCircle2, Clock, Play, FileText, Image as ImageIcon, Box, Presentation, ShieldCheck, Download, MessageCircle, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

type TabType = 'kanban' | 'canvas' | 'relatorio' | 'banner' | 'prototipo' | 'pitch' | 'aprovacao';

interface Project {
  id: string;
  name: string;
  description: string;
  turma: string;
  curso: string;
  startDate: string;
  endDate: string;
  approvalProfessor: boolean;
  approvalBiblioteca: boolean;
  bmCanvas?: string;
  bmCanvasFile?: string;
  relatorio?: string;
  relatorioFile?: string;
  banner?: string;
  prototipo?: string;
  pitch?: string;
  professorPhoto?: string;
  createdAt?: any;
}

interface Task {
  id: string;
  projectId: string;
  title: string;
  completed: boolean;
  status: 'todo' | 'doing' | 'done';
  createdAt?: any;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('kanban');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingIA, setLoadingIA] = useState(false);
  const [schedule, setSchedule] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Form states for sections
  const [bmCanvas, setBmCanvas] = useState('');
  const [relatorio, setRelatorio] = useState('');
  const [banner, setBanner] = useState('');
  const [prototipo, setPrototipo] = useState('');
  const [pitch, setPitch] = useState('');

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;
      const docRef = doc(db, 'projects', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Project;
        setProject(data);
        if (data) {
          setBmCanvas(data.bmCanvas || '');
          setRelatorio(data.relatorio || '');
          setBanner(data.banner || '');
          setPrototipo(data.prototipo || '');
          setPitch(data.pitch || '');
        }
      }
      setLoading(false);
    };

    const fetchProfile = async () => {
      if (auth.currentUser) {
        const profile = await getUserProfile(auth.currentUser.uid);
        setUserProfile(profile);
      }
    };

    fetchProject();
    fetchProfile();
    if (id) {
      const unsubscribe = getTasks(id, setTasks);
      return () => unsubscribe();
    }
  }, [id]);

  const handleSaveSection = async (field: string, value: string) => {
    if (!id) return;
    try {
      await updateProject(id, { [field]: value });
      setProject({ ...project, [field]: value });
    } catch (error) {
      console.error(`Error saving ${field}:`, error);
    }
  };

  const handleNotifyValeria = (type: 'whatsapp' | 'email') => {
    if (!project) return;
    const message = `Olá Valéria, o projeto "${project.name}" da turma ${project.turma} (${project.curso}) já foi aprovado pelo professor e está pronto para o registro na biblioteca.`;
    
    if (type === 'whatsapp') {
      const phone = '5521999999999'; // Placeholder, user should provide real number
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      const email = 'vasouza@firjan.com.br';
      window.open(`mailto:${email}?subject=Aprovação de Projeto: ${project.name}&body=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const handleApproval = async (type: 'Professor' | 'Biblioteca') => {
    if (!id || !project) return;
    const field = type === 'Professor' ? 'approvalProfessor' : 'approvalBiblioteca';
    
    // Logic: Biblioteca can only approve if Professor already approved
    if (type === 'Biblioteca' && !project.approvalProfessor) {
      alert('A aprovação do Professor é necessária antes da Biblioteca.');
      return;
    }

    // Email restrictions
    const userEmail = auth.currentUser?.email;
    if (type === 'Professor' && userEmail !== 'mmvsilva@firjan.com.br') {
      alert('Apenas o Professor (mmvsilva@firjan.com.br) pode aprovar esta etapa.');
      return;
    }
    if (type === 'Biblioteca' && userEmail !== 'vasouza@firjan.com.br') {
      alert('Apenas a Valéria (vasouza@firjan.com.br) pode aprovar esta etapa.');
      return;
    }

    try {
      await updateProject(id, { [field]: !project[field] });
      setProject({ ...project, [field]: !project[field] });
    } catch (error) {
      console.error(`Error updating ${type} approval:`, error);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !id) return;
    await createTask(id, newTaskTitle);
    setNewTaskTitle('');
  };

  const handleSuggestTasks = async () => {
    if (!project || !id) return;
    setLoadingIA(true);
    try {
      const suggestedTasks = await generateTasks(project.name);
      for (const task of suggestedTasks) {
        await createTask(id, task.title);
      }
    } catch (error) {
      console.error("Error suggesting tasks:", error);
    } finally {
      setLoadingIA(false);
    }
  };

  const generateProjectReport = () => {
    if (!project) return;
    const reportContent = `
RELATÓRIO DO PROJETO: ${project.name}
--------------------------------------------------
CURSO: ${project.curso}
TURMA: ${project.turma}
PERÍODO: ${project.startDate} até ${project.endDate}
DESCRIÇÃO: ${project.description}

--- ENTREGAS ---
BM CANVAS:
${project.bmCanvas || 'Não preenchido'}

RELATÓRIO:
${project.relatorio || 'Não preenchido'}

BANNER:
${project.banner || 'Não preenchido'}

PROTÓTIPO:
${project.prototipo || 'Não preenchido'}

PITCH:
${project.pitch || 'Não preenchido'}

--- APROVAÇÕES ---
PROFESSOR: ${project.approvalProfessor ? 'APROVADO' : 'PENDENTE'}
VALÉRIA (BIBLIOTECA): ${project.approvalBiblioteca ? 'APROVADO' : 'PENDENTE'}
--------------------------------------------------
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${project.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center">
      <Loader2 className="w-12 h-12 text-neon-purple animate-spin" />
    </div>
  );

  if (!project) return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-4">Projeto não encontrado</h1>
      <button onClick={() => navigate('/')} className="neon-button">Voltar ao Dashboard</button>
    </div>
  );

  const kanbanColumns = [
    { id: 'todo', title: 'A Fazer', icon: <Clock className="w-4 h-4" />, color: 'text-gray-400' },
    { id: 'doing', title: 'Em Andamento', icon: <Play className="w-4 h-4" />, color: 'text-neon-purple' },
    { id: 'done', title: 'Concluído', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-neon-green' },
  ];

  return (
    <div className="min-h-screen bg-dark-bg text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Navigation & Actions */}
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Voltar ao Dashboard
          </button>
          
          <div className="flex items-center gap-4">
            {userProfile && (
              <div className="flex items-center gap-3 px-4 py-2 bg-dark-card rounded-full border border-white/10">
                <div className="w-10 h-10 rounded-full overflow-hidden border border-neon-purple/30">
                  {userProfile.photoURL ? (
                    <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-neon-purple/20 flex items-center justify-center text-neon-purple font-bold">
                      {userProfile.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white leading-none">{userProfile.name}</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Mat: {userProfile.matricula}</span>
                </div>
              </div>
            )}
            <button 
              onClick={generateProjectReport}
              className="flex items-center gap-2 px-4 py-2 bg-neon-green/10 text-neon-green border border-neon-green/20 rounded-xl hover:bg-neon-green/20 transition-all font-bold text-sm"
            >
              <Download className="w-4 h-4" />
              GERAR RELATÓRIO DO PROJETO
            </button>
          </div>
        </div>

        {/* Project Header */}
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {project.professorPhoto && (
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-neon-purple/30 mr-2">
                    <img src={project.professorPhoto} alt="Professor" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
                <div className="px-3 py-1 bg-neon-purple/20 text-neon-purple text-xs font-bold rounded-full border border-neon-purple/30 uppercase tracking-widest">
                  {project.curso}
                </div>
                <div className="px-3 py-1 bg-white/5 text-gray-400 text-xs font-bold rounded-full border border-white/10 uppercase tracking-widest">
                  Turma: {project.turma}
                </div>
                <span className="text-gray-600 text-sm flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {project.startDate} - {project.endDate}
                </span>
              </div>
              <h1 className="text-5xl font-black tracking-tighter mb-4">{project.name}</h1>
              <p className="text-gray-400 text-lg leading-relaxed max-w-3xl">
                {project.description}
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleSuggestTasks}
                disabled={loadingIA}
                className="neon-button flex items-center gap-2 px-6 py-3"
              >
                {loadingIA ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                Sugerir Tarefas com IA
              </button>
            </div>
          </div>
        </header>

        {/* Tabs Navigation */}
        <div className="flex flex-nowrap overflow-x-auto gap-2 mb-8 border-b border-white/5 pb-4 no-scrollbar scroll-smooth">
          {[
            { id: 'kanban', label: 'Kanban', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'canvas', label: 'BM Canvas', icon: <FileText className="w-4 h-4" /> },
            { id: 'relatorio', label: 'Relatório', icon: <FileText className="w-4 h-4" /> },
            { id: 'banner', label: 'Banner', icon: <ImageIcon className="w-4 h-4" /> },
            { id: 'prototipo', label: 'Protótipo', icon: <Box className="w-4 h-4" /> },
            { id: 'pitch', label: 'Pitch', icon: <Presentation className="w-4 h-4" /> },
            { id: 'aprovacao', label: 'Aprovação', icon: <ShieldCheck className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(188,19,254,0.3)]' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {activeTab === 'kanban' && (
            <div className="space-y-8">
              <form onSubmit={handleAddTask} className="flex gap-3 max-w-2xl">
                <input 
                  type="text" 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Adicionar nova tarefa ao Kanban..."
                  className="flex-1 bg-dark-card border border-white/10 rounded-xl px-5 py-3 focus:outline-none focus:border-neon-purple transition-all"
                />
                <button type="submit" className="neon-button p-3">
                  <Plus className="w-6 h-6" />
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {kanbanColumns.map((col) => (
                  <div key={col.id} className="bg-black/20 rounded-2xl p-4 border border-white/5 min-h-[400px]">
                    <div className={`flex items-center gap-2 mb-6 font-bold uppercase tracking-widest text-xs ${col.color}`}>
                      {col.icon}
                      {col.title}
                      <span className="ml-auto bg-white/5 px-2 py-0.5 rounded-full text-[10px]">
                        {tasks.filter(t => t.status === col.id).length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <AnimatePresence>
                        {tasks
                          .filter(t => t.status === col.id || (!t.status && col.id === 'todo'))
                          .map((task) => (
                            <motion.div
                              key={task.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="bg-dark-card p-4 rounded-xl border border-white/5 hover:border-white/10 group relative"
                            >
                              <p className="text-sm mb-4">{task.title}</p>
                              <div className="flex justify-between items-center">
                                <div className="flex gap-1">
                                  {kanbanColumns.map(c => (
                                    <button
                                      key={c.id}
                                      onClick={() => updateTaskStatus(task.id, c.id)}
                                      className={`w-2 h-2 rounded-full transition-all ${
                                        (task.status || 'todo') === c.id ? 'scale-125 ring-2 ring-white/20' : 'opacity-20 hover:opacity-50'
                                      } ${
                                        c.id === 'todo' ? 'bg-gray-400' : c.id === 'doing' ? 'bg-neon-purple' : 'bg-neon-green'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <button 
                                  onClick={() => deleteTask(task.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-500 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'canvas' && (
            <div className="bg-dark-card p-8 rounded-2xl border border-white/5">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6 text-neon-purple" />
                Business Model Canvas
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Descrição do Modelo</label>
                  <textarea 
                    value={bmCanvas}
                    onChange={(e) => setBmCanvas(e.target.value)}
                    onBlur={() => handleSaveSection('bmCanvas', bmCanvas)}
                    placeholder="Descreva o modelo de negócio aqui..."
                    className="w-full h-[200px] bg-black/30 border border-white/10 rounded-xl p-6 focus:outline-none focus:border-neon-purple transition-all resize-none text-gray-300 leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Link do Arquivo (Anexo)</label>
                  <input 
                    type="text"
                    value={project.bmCanvasFile || ''}
                    onChange={(e) => handleSaveSection('bmCanvasFile', e.target.value)}
                    placeholder="Cole o link do arquivo (Google Drive, Dropbox, etc)..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-neon-purple transition-all"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4 italic">* As alterações são salvas automaticamente.</p>
            </div>
          )}

          {activeTab === 'relatorio' && (
            <div className="bg-dark-card p-8 rounded-2xl border border-white/5">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6 text-neon-green" />
                Relatório do Projeto
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Resumo do Relatório</label>
                  <textarea 
                    value={relatorio}
                    onChange={(e) => setRelatorio(e.target.value)}
                    onBlur={() => handleSaveSection('relatorio', relatorio)}
                    placeholder="Escreva o relatório detalhado do projeto..."
                    className="w-full h-[200px] bg-black/30 border border-white/10 rounded-xl p-6 focus:outline-none focus:border-neon-green transition-all resize-none text-gray-300 leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Link do Arquivo (Anexo)</label>
                  <input 
                    type="text"
                    value={project.relatorioFile || ''}
                    onChange={(e) => handleSaveSection('relatorioFile', e.target.value)}
                    placeholder="Cole o link do arquivo (Google Drive, Dropbox, etc)..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-neon-green transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'banner' && (
            <div className="bg-dark-card p-8 rounded-2xl border border-white/5">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <ImageIcon className="w-6 h-6 text-neon-purple" />
                Banner do Projeto
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Link do Arquivo (Anexo)</label>
                  <input 
                    type="text"
                    value={banner}
                    onChange={(e) => setBanner(e.target.value)}
                    onBlur={() => handleSaveSection('banner', banner)}
                    placeholder="Link para o banner (Google Drive, Dropbox, etc)..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-neon-purple transition-all"
                  />
                </div>
                {banner && banner.match(/\.(jpeg|jpg|gif|png)$/) && (
                  <div className="aspect-video bg-black/50 rounded-xl overflow-hidden border border-white/10">
                    <img src={banner} alt="Banner Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'prototipo' && (
            <div className="bg-dark-card p-8 rounded-2xl border border-white/5">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Box className="w-6 h-6 text-neon-green" />
                Protótipo
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Link do Protótipo (YouTube ou Foto)</label>
                  <input 
                    type="text"
                    value={prototipo}
                    onChange={(e) => setPrototipo(e.target.value)}
                    onBlur={() => handleSaveSection('prototipo', prototipo)}
                    placeholder="Link do vídeo no YouTube ou link da foto..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-neon-green transition-all"
                  />
                </div>
                {prototipo && (
                  <div className="aspect-video bg-black/50 rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
                    {prototipo.includes('youtube.com') || prototipo.includes('youtu.be') ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                        <Play className="w-12 h-12 text-red-500" />
                        <span className="text-sm font-bold text-gray-400">Vídeo do YouTube Detectado</span>
                        <a href={prototipo} target="_blank" rel="noopener noreferrer" className="text-xs text-neon-green hover:underline">Abrir Vídeo</a>
                      </div>
                    ) : prototipo.match(/\.(jpeg|jpg|gif|png)$/) ? (
                      <img src={prototipo} alt="Protótipo Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <p className="text-gray-600 text-sm">Link adicionado: {prototipo}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'pitch' && (
            <div className="bg-dark-card p-8 rounded-2xl border border-white/5">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Presentation className="w-6 h-6 text-neon-purple" />
                Pitch
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Link do Vídeo no YouTube</label>
                  <input 
                    type="text"
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                    onBlur={() => handleSaveSection('pitch', pitch)}
                    placeholder="Link do vídeo do pitch no YouTube..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-neon-purple transition-all"
                  />
                </div>
                {pitch && (pitch.includes('youtube.com') || pitch.includes('youtu.be')) && (
                  <div className="aspect-video bg-black/50 rounded-xl overflow-hidden border border-white/10 flex flex-col items-center justify-center gap-4">
                    <Play className="w-12 h-12 text-red-500" />
                    <span className="text-sm font-bold text-gray-400">Vídeo do Pitch Detectado</span>
                    <a href={pitch} target="_blank" rel="noopener noreferrer" className="text-xs text-neon-purple hover:underline">Abrir Vídeo</a>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'aprovacao' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className={`p-8 rounded-2xl border transition-all ${project.approvalProfessor ? 'bg-neon-green/10 border-neon-green/30' : 'bg-dark-card border-white/5'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-1">1. Aprovação do Professor</h3>
                    <p className="text-sm text-gray-500">Validação técnica e pedagógica do projeto.</p>
                  </div>
                  <button 
                    onClick={() => handleApproval('Professor')}
                    className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${
                      project.approvalProfessor 
                        ? 'bg-neon-green text-black' 
                        : 'bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    {project.approvalProfessor ? 'APROVADO' : 'APROVAR'}
                  </button>
                </div>
              </div>

              <div className={`p-8 rounded-2xl border transition-all ${project.approvalBiblioteca ? 'bg-neon-green/10 border-neon-green/30' : 'bg-dark-card border-white/5'} ${!project.approvalProfessor ? 'opacity-50 grayscale' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold mb-1">2. Valéria - Biblioteca</h3>
                    <p className="text-sm text-gray-500">Registro e arquivamento no acervo da biblioteca.</p>
                  </div>
                  <div className="flex gap-2">
                    {project.approvalProfessor && !project.approvalBiblioteca && (
                      <div className="flex gap-2 mr-4">
                        <button 
                          onClick={() => handleNotifyValeria('whatsapp')}
                          className="p-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-all"
                          title="Notificar via WhatsApp"
                        >
                          <MessageCircle className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleNotifyValeria('email')}
                          className="p-2 bg-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500/30 transition-all"
                          title="Notificar via E-mail"
                        >
                          <Mail className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    <button 
                      onClick={() => handleApproval('Biblioteca')}
                      disabled={!project.approvalProfessor}
                      className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${
                        project.approvalBiblioteca 
                          ? 'bg-neon-green text-black' 
                          : 'bg-white/5 text-white hover:bg-white/10'
                      }`}
                    >
                      {project.approvalBiblioteca ? 'APROVADO' : 'APROVAR'}
                    </button>
                  </div>
                </div>
                {!project.approvalProfessor && (
                  <p className="text-xs text-red-500 mt-4 flex items-center gap-1 font-bold">
                    <ShieldCheck className="w-3 h-3" /> Aguardando aprovação do Professor
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Footer */}
        <footer className="mt-20 py-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-gray-600 text-xs font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white" />
            By Márcio Vinícius
          </div>
          <div>© 2026 HUB DASHBOARD - TODOS OS DIREITOS RESERVADOS</div>
        </footer>
      </div>
    </div>
  );
}
