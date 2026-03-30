import React, { useState, useEffect } from 'react';
import { auth, logout, getUserProfile } from '../services/firebase';
import { getProjects, createProject, deleteProject, getAllProjects } from '../services/projetos';
import { createTask } from '../services/atividades';
import { generateProjectDescription, generateTasks } from '../services/ia';
import { Plus, Trash2, LogOut, Sparkles, FolderKanban, ArrowRight, Loader2, Search, FileText, Calendar as CalendarIcon, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

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
  professorPhoto?: string;
  bmCanvas?: string;
  bmCanvasFile?: string;
  relatorio?: string;
  relatorioFile?: string;
  banner?: string;
  prototipo?: string;
  pitch?: string;
  createdAt?: any;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [turma, setTurma] = useState('');
  const [curso, setCurso] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [professorPhoto, setProfessorPhoto] = useState('');
  const [loadingIA, setLoadingIA] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = getProjects(setProjects);
    
    const fetchProfile = async () => {
      if (auth.currentUser) {
        const profile = await getUserProfile(auth.currentUser.uid);
        setUserProfile(profile);
      }
    };
    fetchProfile();

    return () => unsubscribe();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !turma || !curso || !startDate || !endDate) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      await createProject(newProjectName, "Projeto educacional em desenvolvimento.", turma, curso, startDate, endDate, professorPhoto);
      setNewProjectName('');
      setTurma('');
      setCurso('');
      setStartDate('');
      setEndDate('');
      setProfessorPhoto('');
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleCreateWithIA = async () => {
    if (!newProjectName.trim() || !turma || !curso || !startDate || !endDate) {
      alert('Por favor, preencha todos os campos obrigatórios para gerar com IA.');
      return;
    }
    setLoadingIA(true);

    try {
      const description = await generateProjectDescription(newProjectName);
      const projectId = await createProject(newProjectName, description, turma, curso, startDate, endDate, professorPhoto);
      
      if (projectId) {
        const tasks = await generateTasks(newProjectName);
        for (const task of tasks) {
          await createTask(projectId, task.title);
        }
        navigate(`/project/${projectId}`);
      }
    } catch (error) {
      console.error("IA Generation Error:", error);
    } finally {
      setLoadingIA(false);
    }
  };

  const generateGlobalReport = async () => {
    const allProjects = await getAllProjects() as Project[];
    if (!allProjects || allProjects.length === 0) {
      alert('Nenhum projeto encontrado para gerar o relatório.');
      return;
    }

    // 1. Prepare Raw Data for "Projetos" sheet
    const rawData = allProjects.map(p => ({
      'ID': p.id,
      'Nome do Projeto': p.name,
      'Curso': p.curso,
      'Turma': p.turma,
      'Descrição': p.description,
      'Data Início': p.startDate,
      'Data Término': p.endDate,
      'Aprovação Professor': p.approvalProfessor ? 'SIM' : 'NÃO',
      'Aprovação Biblioteca': p.approvalBiblioteca ? 'SIM' : 'NÃO',
      'Data de Criação': p.createdAt ? new Date(p.createdAt.toDate()).toLocaleString() : 'N/A'
    }));

    // 2. Prepare Dashboard Data for "Dashboard" sheet
    const totalProjects = allProjects.length;
    const approvedProfessor = allProjects.filter(p => p.approvalProfessor).length;
    const approvedBiblioteca = allProjects.filter(p => p.approvalBiblioteca).length;

    const courseCounts: Record<string, number> = {};
    const turmaCounts: Record<string, number> = {};

    allProjects.forEach(p => {
      courseCounts[p.curso] = (courseCounts[p.curso] || 0) + 1;
      turmaCounts[p.turma] = (turmaCounts[p.turma] || 0) + 1;
    });

    const dashboardData = [
      ['DASHBOARD GERAL DE PROJETOS'],
      [''],
      ['MÉTRICAS GERAIS'],
      ['Total de Projetos', totalProjects],
      ['Aprovados pelo Professor', approvedProfessor, `${((approvedProfessor/totalProjects)*100).toFixed(1)}%`],
      ['Aprovados pela Biblioteca', approvedBiblioteca, `${((approvedBiblioteca/totalProjects)*100).toFixed(1)}%`],
      [''],
      ['PROJETOS POR CURSO'],
      ['Curso', 'Quantidade']
    ];

    Object.entries(courseCounts).forEach(([course, count]) => {
      dashboardData.push([course, count]);
    });

    dashboardData.push(['']);
    dashboardData.push(['PROJETOS POR TURMA']);
    dashboardData.push(['Turma', 'Quantidade']);

    Object.entries(turmaCounts).forEach(([turma, count]) => {
      dashboardData.push([turma, count]);
    });

    // 3. Create Workbook and Sheets
    const wb = XLSX.utils.book_new();
    
    // Raw Data Sheet
    const wsRaw = XLSX.utils.json_to_sheet(rawData);
    XLSX.utils.book_append_sheet(wb, wsRaw, "Lista de Projetos");

    // Dashboard Sheet
    const wsDash = XLSX.utils.aoa_to_sheet(dashboardData);
    XLSX.utils.book_append_sheet(wb, wsDash, "Dashboard");

    // 4. Download File
    XLSX.writeFile(wb, `Relatorio_Geral_Projetos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-dark-bg text-white p-6">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neon-purple rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(188,19,254,0.5)]">
            <FolderKanban className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase">
            HUB<span className="text-neon-green">DASHBOARD</span>
          </h1>
        </div>

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
          {(auth.currentUser?.email === 'mmvsilva@firjan.com.br' || auth.currentUser?.email === 'vasouza@firjan.com.br') && (
            <button 
              onClick={generateGlobalReport}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-sm font-bold"
            >
              <Download className="w-4 h-4 text-neon-green" />
              RELATÓRIO EXCEL
            </button>
          )}
          <button onClick={logout} className="p-2 hover:text-neon-purple transition-colors">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* Create Project Section */}
        <section className="mb-16">
          <div className="bg-dark-card p-8 rounded-2xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/5 blur-[80px] -mr-32 -mt-32" />
            
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
              Registro de <span className="text-neon-purple">Projetos</span>
            </h2>

            <form onSubmit={handleCreateProject} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Nome do Projeto</label>
                  <input 
                    type="text" 
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Ex: Sistema de Gestão Escolar"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-neon-purple transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Curso</label>
                  <input 
                    type="text" 
                    value={curso}
                    onChange={(e) => setCurso(e.target.value)}
                    placeholder="Ex: Desenvolvimento de Sistemas"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-neon-purple transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Turma</label>
                  <input 
                    type="text" 
                    value={turma}
                    onChange={(e) => setTurma(e.target.value)}
                    placeholder="Ex: 2024.1-A"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-neon-purple transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Início</label>
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-neon-purple transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Término</label>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-neon-purple transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Foto do Professor (URL)</label>
                  <input 
                    type="text" 
                    value={professorPhoto}
                    onChange={(e) => setProfessorPhoto(e.target.value)}
                    placeholder="Ex: https://link-da-foto.com/foto.jpg"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-neon-purple transition-all"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit"
                  className="bg-white text-black font-bold px-8 py-4 rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Criar Manual
                </button>

                <button 
                  type="button"
                  onClick={handleCreateWithIA}
                  disabled={loadingIA || !newProjectName.trim()}
                  className="neon-button flex items-center gap-2 px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingIA ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  Gerar com IA
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Projects List */}
        <section>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Seus Projetos</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="Buscar projetos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-dark-card border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-neon-green transition-all w-64"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group bg-dark-card p-6 rounded-2xl border border-white/5 hover:border-neon-purple/50 transition-all cursor-pointer relative"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-neon-purple/10 transition-colors overflow-hidden">
                      {project.professorPhoto ? (
                        <img src={project.professorPhoto} alt="Professor" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <FolderKanban className="w-6 h-6 text-gray-400 group-hover:text-neon-purple transition-colors" />
                      )}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(project.id);
                      }}
                      className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <h3 className="text-xl font-bold mb-2 group-hover:text-neon-purple transition-colors">{project.name}</h3>
                  <p className="text-gray-500 text-sm line-clamp-2 mb-6">
                    {project.description}
                  </p>

                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-600">
                    <span>{new Date(project.createdAt?.toDate()).toLocaleDateString()}</span>
                    <div className="flex items-center gap-1 group-hover:text-neon-green transition-colors">
                      VER DETALHES <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredProjects.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-2xl">
                <p className="text-gray-500">Nenhum projeto encontrado. Crie um novo acima!</p>
              </div>
            )}
          </div>
        </section>
        {/* Footer */}
        <footer className="mt-20 py-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-gray-600 text-xs font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white" />
            By Márcio Vinícius
          </div>
          <div>© 2026 HUB DASHBOARD - TODOS OS DIREITOS RESERVADOS</div>
        </footer>
      </main>
    </div>
  );
}
