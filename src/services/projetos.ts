import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, updateDoc, deleteDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const createProject = async (name: string, description: string, turma: string, curso: string, startDate: string, endDate: string, professorPhoto: string = '') => {
  const path = 'projects';
  try {
    if (!auth.currentUser) throw new Error('Usuário não autenticado');
    const docRef = await addDoc(collection(db, path), {
      name,
      description,
      turma,
      curso,
      startDate,
      endDate,
      professorPhoto,
      userId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
      status: 'active',
      approvalProfessor: false,
      approvalBiblioteca: false,
      bmCanvas: '',
      relatorio: '',
      banner: '',
      prototipo: '',
      pitch: ''
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateProject = async (projectId: string, data: any) => {
  const path = `projects/${projectId}`;
  try {
    await updateDoc(doc(db, 'projects', projectId), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const getAllProjects = async () => {
  const path = 'projects';
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const getProjects = (callback: (projects: any[]) => void) => {
  const path = 'projects';
  if (!auth.currentUser) return () => {};
  
  const adminEmails = ['mmvsilva@firjan.com.br', 'vasouza@firjan.com.br', 'marcio.s@docente.firjan.senai.br', 'marcio.v.silva@docente.firjan.senai.br'];
  let q;
  
  if (auth.currentUser.email && adminEmails.includes(auth.currentUser.email)) {
    q = query(collection(db, path));
  } else {
    q = query(collection(db, path), where('userId', '==', auth.currentUser.uid));
  }
  
  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(projects);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const deleteProject = async (projectId: string) => {
  const path = `projects/${projectId}`;
  try {
    await deleteDoc(doc(db, 'projects', projectId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
