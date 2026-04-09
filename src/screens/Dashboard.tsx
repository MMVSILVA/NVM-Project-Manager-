import React, { useState, useEffect, useMemo } from 'react';
import { auth, logout, getUserProfile, saveUserProfile } from '../services/supabase';
import { getProjects, createProject, deleteProject, getAllProjects } from '../services/projetos';
import { createTask } from '../services/atividades';
import { generateProjectDescription, generateTasks } from '../services/ia';
import { Plus, Trash2, LogOut, Sparkles, FolderKanban, ArrowRight, Loader2, Search, FileText, Calendar as CalendarIcon, Download, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

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
  userId: string;
  professorPhoto?: string;
  professorName?: string;
  approvalBibliotecaStatus?: 'approved' | 'reservations' | 'rejected' | 'pending';
  approvalBibliotecaMessage?: string;
  presentationDate?: string;
  // Canvas Fields
  canvasParceiros?: string;
  canvasAtividades?: string;
  canvasRecursos?: string;
  canvasProposta?: string;
  canvasRelacionamento?: string;
  canvasCanais?: string;
  canvasSegmentos?: string;
  canvasCustos?: string;
  canvasReceitas?: string;
  relatorio?: string;
  banner?: string;
  prototipo?: string;
  pitch?: string;
  professorFinalApproval?: boolean;
  sagaDate?: string;
  sagaRegistered?: boolean;
  presentationCompleted?: boolean;
  status?: 'active' | 'archived';
  createdAt?: any;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [turma, setTurma] = useState('');
  const [curso, setCurso] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [professorName, setProfessorName] = useState('');
  const [professorPhoto, setProfessorPhoto] = useState('');
  const [loadingIA, setLoadingIA] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [viewAll, setViewAll] = useState(true);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ name: '', preferredName: '', matricula: '', telefone: '', photoURL: '' });
  const navigate = useNavigate();

  const isAdmin = auth.currentUser?.email === 'mmvsilva@firjan.com.br' || 
                  auth.currentUser?.email === 'vasouza@firjan.com.br' || 
                  auth.currentUser?.email === 'marcio.s@docente.firjan.senai.br' ||
                  auth.currentUser?.email === 'marcio.v.silva@docente.firjan.senai.br';

  useEffect(() => {
    const unsubscribe = getProjects((projs) => {
      if (isAdmin) {
        setProjects(viewAll ? projs : projs.filter(p => p.userId === auth.currentUser?.id));
      } else {
        setProjects(projs.filter(p => p.userId === auth.currentUser?.id));
      }
    });
    
    const fetchProfile = async () => {
      if (auth.currentUser) {
        const profile = await getUserProfile(auth.currentUser.id);
        setUserProfile(profile);
      }
    };
    fetchProfile();

    return () => unsubscribe();
  }, [viewAll, isAdmin]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !turma || !curso || !startDate || !endDate) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      await createProject(newProjectName, "Projeto educacional em desenvolvimento.", turma, curso, startDate, endDate, professorPhoto, professorName);
      setNewProjectName('');
      setTurma('');
      setCurso('');
      setStartDate('');
      setEndDate('');
      setProfessorName('');
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
      const projectId = await createProject(newProjectName, description, turma, curso, startDate, endDate, professorPhoto, professorName);
      
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

  const handleSaveProfile = async () => {
    if (auth.currentUser) {
      await saveUserProfile(auth.currentUser.id, {
        ...editProfileData,
        email: auth.currentUser.email || ''
      });
      setUserProfile({ ...userProfile, ...editProfileData });
      setShowEditProfileModal(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setEditProfileData({ ...editProfileData, photoURL: dataUrl });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const generateGlobalReport = async () => {
    const allProjects = await getAllProjects() as Project[];
    if (!allProjects || allProjects.length === 0) {
      alert('Nenhum projeto encontrado para gerar o relatório.');
      return;
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Firjan SENAI';
    wb.created = new Date();

    // Try to add logo
    try {
      const response = await fetch('/logo-senai.svg');
      const svgText = await response.text();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const v = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgText)));
      });
      canvas.width = v.width;
      canvas.height = v.height;
      ctx?.drawImage(v, 0, 0);
      const base64Image = canvas.toDataURL('image/png');
      const imageId = wb.addImage({
        base64: base64Image,
        extension: 'png',
      });
      
      // --- TAB 1: DASHBOARD ---
      const wsDash = wb.addWorksheet('Dashboard', { views: [{ showGridLines: false }] });
      wsDash.addImage(imageId, {
        tl: { col: 0, row: 0 },
        ext: { width: 150, height: 50 }
      });
      
      // Title
      wsDash.mergeCells('A1:E2');
      const titleCell = wsDash.getCell('A1');
      titleCell.value = 'DASHBOARD GERAL DE PROJETOS - FIRJAN SENAI';
      titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0055A4' } }; // Firjan Blue
      titleCell.alignment = { vertical: 'middle', horizontal: 'right' }; // Align right to leave space for logo
    } catch (e) {
      console.error('Error adding logo to Excel', e);
      // Fallback if logo fails
      const wsDash = wb.addWorksheet('Dashboard', { views: [{ showGridLines: false }] });
      wsDash.mergeCells('A1:E2');
      const titleCell = wsDash.getCell('A1');
      titleCell.value = 'DASHBOARD GERAL DE PROJETOS - FIRJAN SENAI';
      titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0055A4' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    const wsDash = wb.getWorksheet('Dashboard');
    if (!wsDash) return;

    // Metrics
    const totalProjects = allProjects.length;
    const approvedProfessor = allProjects.filter(p => p.approvalProfessor).length;
    const approvedBiblioteca = allProjects.filter(p => p.approvalBiblioteca).length;

    wsDash.getCell('A4').value = 'MÉTRICAS GERAIS';
    wsDash.getCell('A4').font = { size: 12, bold: true };

    const createMetricCard = (row: number, label: string, value: string | number) => {
      wsDash.getCell(`A${row}`).value = label;
      wsDash.getCell(`B${row}`).value = value;
      wsDash.getCell(`A${row}`).font = { bold: true };
      wsDash.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
      wsDash.getCell(`B${row}`).alignment = { horizontal: 'center' };
      wsDash.getCell(`A${row}`).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      wsDash.getCell(`B${row}`).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    };

    createMetricCard(5, 'Total de Projetos', totalProjects);
    createMetricCard(6, 'Aprovados pelo Professor', `${approvedProfessor} (${((approvedProfessor/totalProjects)*100).toFixed(1)}%)`);
    createMetricCard(7, 'Aprovados pela Biblioteca', `${approvedBiblioteca} (${((approvedBiblioteca/totalProjects)*100).toFixed(1)}%)`);

    wsDash.getColumn('A').width = 30;
    wsDash.getColumn('B').width = 20;
    wsDash.getColumn('C').width = 5;
    wsDash.getColumn('D').width = 30;
    wsDash.getColumn('E').width = 20;

    // Course Data
    const courseCounts: Record<string, number> = {};
    const turmaCounts: Record<string, number> = {};
    allProjects.forEach(p => {
      courseCounts[p.curso] = (courseCounts[p.curso] || 0) + 1;
      turmaCounts[p.turma] = (turmaCounts[p.turma] || 0) + 1;
    });

    wsDash.getCell('D4').value = 'PROJETOS POR CURSO';
    wsDash.getCell('D4').font = { size: 12, bold: true };
    wsDash.getCell('D5').value = 'Curso';
    wsDash.getCell('E5').value = 'Quantidade';
    ['D5', 'E5'].forEach(cell => {
      wsDash.getCell(cell).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsDash.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0055A4' } };
      wsDash.getCell(cell).alignment = { horizontal: 'center' };
    });

    let currentRow = 6;
    Object.entries(courseCounts).forEach(([course, count]) => {
      wsDash.getCell(`D${currentRow}`).value = course;
      wsDash.getCell(`E${currentRow}`).value = count;
      wsDash.getCell(`E${currentRow}`).alignment = { horizontal: 'center' };
      wsDash.getCell(`D${currentRow}`).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      wsDash.getCell(`E${currentRow}`).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      currentRow++;
    });

    currentRow += 2;
    wsDash.getCell(`D${currentRow}`).value = 'PROJETOS POR TURMA';
    wsDash.getCell(`D${currentRow}`).font = { size: 12, bold: true };
    currentRow++;
    wsDash.getCell(`D${currentRow}`).value = 'Turma';
    wsDash.getCell(`E${currentRow}`).value = 'Quantidade';
    [`D${currentRow}`, `E${currentRow}`].forEach(cell => {
      wsDash.getCell(cell).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsDash.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0055A4' } };
      wsDash.getCell(cell).alignment = { horizontal: 'center' };
    });
    currentRow++;
    Object.entries(turmaCounts).forEach(([turma, count]) => {
      wsDash.getCell(`D${currentRow}`).value = turma;
      wsDash.getCell(`E${currentRow}`).value = count;
      wsDash.getCell(`E${currentRow}`).alignment = { horizontal: 'center' };
      wsDash.getCell(`D${currentRow}`).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      wsDash.getCell(`E${currentRow}`).border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      currentRow++;
    });

    // --- TAB 2: LISTA DE PROJETOS ---
    const wsData = wb.addWorksheet('Lista de Projetos');
    
    wsData.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nome do Projeto', key: 'name', width: 40 },
      { header: 'Curso', key: 'curso', width: 30 },
      { header: 'Turma', key: 'turma', width: 15 },
      { header: 'Professor Responsável', key: 'professorName', width: 30 },
      { header: 'Descrição', key: 'description', width: 60 },
      { header: 'Data Início', key: 'startDate', width: 15 },
      { header: 'Data Término', key: 'endDate', width: 15 },
      { header: 'Aprovação Prof.', key: 'appProf', width: 15 },
      { header: 'Status Biblioteca', key: 'appBibStatus', width: 20 },
      { header: 'Mensagem Biblioteca', key: 'appBibMsg', width: 40 },
      { header: 'Finalizado Prof.', key: 'profFinal', width: 15 },
      { header: 'Data Saga', key: 'sagaDate', width: 20 },
      { header: 'Registrado Saga', key: 'sagaReg', width: 15 },
      { header: 'Data Apresentação', key: 'presDate', width: 20 },
      { header: 'Apresentado', key: 'presComp', width: 15 },
      { header: 'Status Geral', key: 'status', width: 15 },
      { header: 'Data de Criação', key: 'createdAt', width: 20 },
    ];

    // Style Headers
    wsData.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsData.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0055A4' } };
    wsData.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    wsData.autoFilter = 'A1:R1';

    // Add Data
    allProjects.forEach(p => {
      wsData.addRow({
        id: p.id.substring(0, 8) + '...',
        name: p.name,
        curso: p.curso,
        turma: p.turma,
        professorName: p.professorName || 'Não informado',
        description: p.description,
        startDate: p.startDate,
        endDate: p.endDate,
        appProf: p.approvalProfessor ? 'SIM' : 'NÃO',
        appBibStatus: p.approvalBibliotecaStatus === 'approved' ? 'Aprovado' : p.approvalBibliotecaStatus === 'reservations' ? 'Com Ressalvas' : p.approvalBibliotecaStatus === 'rejected' ? 'Reprovado' : 'Pendente',
        appBibMsg: p.approvalBibliotecaMessage || '',
        profFinal: p.professorFinalApproval ? 'SIM' : 'NÃO',
        sagaDate: p.sagaDate ? new Date(p.sagaDate).toLocaleString('pt-BR') : '',
        sagaReg: p.sagaRegistered ? 'SIM' : 'NÃO',
        presDate: p.presentationDate ? new Date(p.presentationDate).toLocaleString('pt-BR') : '',
        presComp: p.presentationCompleted ? 'SIM' : 'NÃO',
        status: p.status === 'archived' ? 'Arquivado' : 'Ativo',
        createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'
      });
    });

    // Add alternating row colors and borders
    wsData.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: {style:'thin', color: {argb:'FFDDDDDD'}},
          left: {style:'thin', color: {argb:'FFDDDDDD'}},
          bottom: {style:'thin', color: {argb:'FFDDDDDD'}},
          right: {style:'thin', color: {argb:'FFDDDDDD'}}
        };
        if (rowNumber > 1) {
          cell.alignment = { vertical: 'middle', wrapText: true };
        }
      });
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
      }
    });

    // --- TAB 3: CANVAS E DETALHES ---
    const wsCanvas = wb.addWorksheet('Canvas e Detalhes');
    wsCanvas.columns = [
      { header: 'Nome do Projeto', key: 'name', width: 40 },
      { header: 'Parceiros', key: 'parceiros', width: 40 },
      { header: 'Atividades', key: 'atividades', width: 40 },
      { header: 'Recursos', key: 'recursos', width: 40 },
      { header: 'Proposta de Valor', key: 'proposta', width: 40 },
      { header: 'Relacionamento', key: 'relacionamento', width: 40 },
      { header: 'Canais', key: 'canais', width: 40 },
      { header: 'Segmentos', key: 'segmentos', width: 40 },
      { header: 'Custos', key: 'custos', width: 40 },
      { header: 'Receitas', key: 'receitas', width: 40 },
    ];

    wsCanvas.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsCanvas.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF26A21' } }; // Orange
    wsCanvas.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    wsCanvas.autoFilter = 'A1:J1';

    allProjects.forEach(p => {
      wsCanvas.addRow({
        name: p.name,
        parceiros: p.canvasParceiros || '',
        atividades: p.canvasAtividades || '',
        recursos: p.canvasRecursos || '',
        proposta: p.canvasProposta || '',
        relacionamento: p.canvasRelacionamento || '',
        canais: p.canvasCanais || '',
        segmentos: p.canvasSegmentos || '',
        custos: p.canvasCustos || '',
        receitas: p.canvasReceitas || ''
      });
    });

    wsCanvas.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: {style:'thin', color: {argb:'FFDDDDDD'}},
          left: {style:'thin', color: {argb:'FFDDDDDD'}},
          bottom: {style:'thin', color: {argb:'FFDDDDDD'}},
          right: {style:'thin', color: {argb:'FFDDDDDD'}}
        };
        if (rowNumber > 1) {
          cell.alignment = { vertical: 'top', wrapText: true };
        }
      });
      if (rowNumber > 1 && rowNumber % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F9F9' } };
      }
    });

    // Generate and save file
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Relatorio_Projetos_Firjan_SENAI_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'approved' && p.approvalProfessor) || 
                          (statusFilter === 'pending' && !p.approvalProfessor);
    return matchesSearch && matchesStatus;
  });

  const projectsByCourse = useMemo(() => {
    const courseData = projects.reduce((acc, p) => {
      if (!acc[p.curso]) {
        acc[p.curso] = { name: p.curso, value: 0, professors: new Set<string>() };
      }
      acc[p.curso].value += 1;
      acc[p.curso].professors.add(p.professorName || 'Desconhecido');
      return acc;
    }, {} as Record<string, { name: string, value: number, professors: Set<string> }>);
    
    return Object.values(courseData).map(d => ({
      ...d,
      professorsList: Array.from(d.professors).join(', ')
    }));
  }, [projects]);

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-dark-card border border-white/10 p-4 rounded-xl shadow-xl">
          <p className="font-bold text-white mb-2">{label}</p>
          <p className="text-sm text-gray-400 mb-1">
            <span className="font-bold text-neon-green">Quantidade:</span> {data.value}
          </p>
          <p className="text-sm text-gray-400">
            <span className="font-bold text-neon-purple">Professor(es):</span> {data.professorsList}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-dark-card border border-white/10 p-4 rounded-xl shadow-xl">
          <p className="font-bold text-white mb-1">{data.name}</p>
          <p className="text-sm text-gray-400">
            <span className="font-bold" style={{ color: payload[0].fill }}>Quantidade:</span> {data.value}
          </p>
          <p className="text-xs text-gray-500 mt-2 italic">Clique para filtrar</p>
        </div>
      );
    }
    return null;
  };

  const getDisplayName = (profile: any, email: string | undefined) => {
    if (profile?.preferredName) return profile.preferredName;
    
    let fullName = '';
    if (profile?.name) {
      fullName = profile.name;
    } else if (email === 'mmvsilva@firjan.com.br' || email === 'marcio.s@docente.firjan.senai.br' || email === 'marcio.v.silva@docente.firjan.senai.br') {
      fullName = 'Márcio Vinícius';
    } else if (email === 'vasouza@firjan.com.br') {
      fullName = 'Valéria Souza';
    } else {
      fullName = email?.split('@')[0] || 'Usuário';
    }
    
    const parts = fullName.trim().split(/\s+/);
    if (parts.length > 1) {
      return `${parts[0]} ${parts[parts.length - 1]}`;
    }
    return parts[0];
  };

  const getDisplayMatricula = (profile: any, email: string | undefined) => {
    if (profile?.matricula) return profile.matricula;
    if (email === 'mmvsilva@firjan.com.br' || email === 'marcio.s@docente.firjan.senai.br' || email === 'marcio.v.silva@docente.firjan.senai.br') return '00001';
    if (email === 'vasouza@firjan.com.br') return '00002';
    return 'N/A';
  };

  return (
    <div className="min-h-screen bg-dark-bg text-white p-6">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
        <div className="flex flex-col md:flex-row items-center gap-3 text-center md:text-left">
          <div className="bg-white px-3 py-1 rounded flex items-center justify-center h-10 w-24">
            <img src="/logo-senai.svg" alt="SENAI Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">
            Project Hub Educacional <br className="hidden md:block" />
            <span className="text-[#F26A21]">Senai - VR</span>
          </h1>
        </div>

        <div className="flex flex-wrap justify-center md:justify-end items-center gap-4">
          <div className="flex flex-col items-center gap-2 px-4 py-3 bg-dark-card rounded-2xl border border-white/10 relative group">
            <button 
              onClick={() => {
                setEditProfileData({
                  name: userProfile?.name || '',
                  preferredName: userProfile?.preferredName || '',
                  matricula: userProfile?.matricula || '',
                  telefone: userProfile?.telefone || '',
                  photoURL: userProfile?.photoURL || ''
                });
                setShowEditProfileModal(true);
              }}
              className="absolute top-2 right-2 p-1.5 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
              title="Editar Perfil"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-neon-purple shadow-[0_0_15px_rgba(0,80,153,0.3)]">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-neon-purple/20 flex items-center justify-center text-neon-purple text-xl font-bold uppercase">
                  {getDisplayName(userProfile, auth.currentUser?.email).charAt(0)}
                </div>
              )}
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-white leading-none">{getDisplayName(userProfile, auth.currentUser?.email)}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Mat: {getDisplayMatricula(userProfile, auth.currentUser?.email)}</span>
            </div>
          </div>
          {(auth.currentUser?.email === 'mmvsilva@firjan.com.br' || auth.currentUser?.email === 'vasouza@firjan.com.br' || auth.currentUser?.email === 'marcio.s@docente.firjan.senai.br') && (
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
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Professor Responsável</label>
                  <input 
                    type="text" 
                    value={professorName}
                    onChange={(e) => setProfessorName(e.target.value)}
                    placeholder="Ex: Márcio Vinícius"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-neon-purple transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 md:col-span-2">
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

        {/* Charts Section */}
        {projects.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-center md:text-left">Visão Geral</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-dark-card p-6 rounded-2xl border border-white/5 flex flex-col">
                <h3 className="text-lg font-bold mb-4 text-gray-400 text-center">Projetos por Curso</h3>
                <div className="h-[300px] w-full min-h-[300px] flex-1">
                  <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={100}>
                    <BarChart data={projectsByCourse} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="name" stroke="#888" tick={{fill: '#888', fontSize: 12}} />
                      <YAxis stroke="#888" tick={{fill: '#888', fontSize: 12}} allowDecimals={false} />
                      <Tooltip content={<CustomBarTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                      <Bar dataKey="value" fill="#00FF9D" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-dark-card p-6 rounded-2xl border border-white/5 flex flex-col">
                <h3 className="text-lg font-bold mb-4 text-gray-400 text-center">Status de Aprovação (Professor)</h3>
                <div className="h-[300px] w-full min-h-[300px] flex-1 relative">
                  <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={100}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Aprovados', value: projects.filter(p => p.approvalProfessor).length, id: 'approved' },
                          { name: 'Pendentes', value: projects.filter(p => !p.approvalProfessor).length, id: 'pending' }
                        ]}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        onClick={(data: any) => {
                          setStatusFilter(statusFilter === data.payload.id ? 'all' : data.payload.id);
                          // Scroll to projects list
                          document.getElementById('projects-list')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="cursor-pointer"
                      >
                        <Cell fill="#00FF9D" />
                        <Cell fill="#B026FF" />
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4">
                    <button 
                      onClick={() => setStatusFilter(statusFilter === 'approved' ? 'all' : 'approved')}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all ${statusFilter === 'approved' ? 'bg-neon-green/20' : 'hover:bg-white/5'}`}
                    >
                      <div className="w-3 h-3 rounded-full bg-neon-green"></div>
                      <span className="text-sm text-gray-400">Aprovados</span>
                    </button>
                    <button 
                      onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full transition-all ${statusFilter === 'pending' ? 'bg-neon-purple/20' : 'hover:bg-white/5'}`}
                    >
                      <div className="w-3 h-3 rounded-full bg-neon-purple"></div>
                      <span className="text-sm text-gray-400">Pendentes</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Projects List */}
        <section id="projects-list">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">
                {viewAll ? 'Todos os Projetos' : 'Seus Projetos'}
                {statusFilter === 'approved' && <span className="ml-2 text-sm font-normal text-neon-green bg-neon-green/10 px-2 py-1 rounded-full">Filtrado: Aprovados</span>}
                {statusFilter === 'pending' && <span className="ml-2 text-sm font-normal text-neon-purple bg-neon-purple/10 px-2 py-1 rounded-full">Filtrado: Pendentes</span>}
              </h2>
              {isAdmin && (
                <button
                  onClick={() => setViewAll(!viewAll)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  {viewAll ? 'Ver Apenas Meus Projetos' : 'Ver Todos os Projetos'}
                </button>
              )}
            </div>
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
                    <span>{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}</span>
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
          <div>© 2026 Project Hub Educacional - SENAI VR TODOS OS DIREITOS RESERVADOS</div>
        </footer>
      </main>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditProfileModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-dark-card border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-neon-purple" /> Editar Perfil
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Nome e Sobrenome</label>
                  <input
                    type="text"
                    value={editProfileData.name}
                    onChange={(e) => setEditProfileData({ ...editProfileData, name: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon-purple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Nome Preferido (Como aparecerá no perfil)</label>
                  <input
                    type="text"
                    value={editProfileData.preferredName}
                    onChange={(e) => setEditProfileData({ ...editProfileData, preferredName: e.target.value })}
                    placeholder="Ex: Prof. Márcio"
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon-purple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Matrícula</label>
                  <input
                    type="text"
                    value={editProfileData.matricula}
                    onChange={(e) => setEditProfileData({ ...editProfileData, matricula: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon-purple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Telefone (WhatsApp)</label>
                  <input
                    type="text"
                    value={editProfileData.telefone}
                    onChange={(e) => setEditProfileData({ ...editProfileData, telefone: e.target.value })}
                    placeholder="Ex: 24999999999"
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-neon-purple"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Foto de Perfil</label>
                  <div className="flex items-center gap-4">
                    {editProfileData.photoURL && (
                      <img src={editProfileData.photoURL} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-white/10" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-2 text-white focus:outline-none focus:border-neon-purple file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-purple/20 file:text-neon-purple hover:file:bg-neon-purple/30 transition-all cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowEditProfileModal(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-neon-purple text-white hover:bg-neon-purple/80 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
