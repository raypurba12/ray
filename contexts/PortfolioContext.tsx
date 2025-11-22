
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Project, Certificate, Skill } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { mockSkills } from '../services/mockData';

interface PortfolioContextType {
  projects: Project[];
  certificates: Certificate[];
  skills: Skill[]; 
  addProject: (project: Omit<Project, 'id'>) => void;
  updateProject: (updatedProject: Project) => void;
  deleteProject: (projectId: number) => void;
  addCertificate: (certificate: Omit<Certificate, 'id'>) => void;
  updateCertificate: (updatedCertificate: Certificate) => void;
  deleteCertificate: (certificateId: number) => void;
  updateSkills: (newSkills: Skill[]) => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const PortfolioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [skills, setSkills] = useState<Skill[]>(mockSkills);

  // Ambil data saat login.
  // PENTING: Jangan masukkan 'user' ke dependency array agar tidak fetch ulang (dan reset) 
  // saat user hanya update bio atau avatar.
  useEffect(() => {
      if (isAuthenticated) {
          const userId = (user as any)?.id || 1; 
          api.getPortfolio(userId).then(data => {
              setProjects(data.projects);
              setCertificates(data.certificates);
          }).catch(err => console.error("Failed to load portfolio data", err));
      } else {
          setProjects([]);
          setCertificates([]);
          setSkills(mockSkills);
      }
  }, [isAuthenticated]); // Removed 'user' dependency

  const addProject = async (project: Omit<Project, 'id'>) => {
    const userId = (user as any)?.id || 1;
    try {
        const newProject = await api.addProject(userId, project);
        setProjects(prev => [newProject, ...prev]);
    } catch (err) {
        console.error("Error adding project", err);
    }
  };

  const updateProject = async (updatedProject: Project) => {
    // Update state optimistik
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    // Sync ke API/Storage
    try {
        // @ts-ignore - ignore typing if updateProject isn't fully typed in mock api yet
        await api.updateProject(updatedProject); 
    } catch (e) {
        console.error("Failed to sync project update", e);
    }
  };

  const deleteProject = async (projectId: number) => {
    try {
        await api.deleteProject(projectId);
        setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
        console.error("Error deleting project", err);
    }
  };

  const addCertificate = async (certificate: Omit<Certificate, 'id'>) => {
    const userId = (user as any)?.id || 1;
    try {
        const newCert = await api.addCertificate(userId, certificate);
        setCertificates(prev => [newCert, ...prev]);
    } catch (err) {
        console.error("Error adding certificate", err);
    }
  };

  const updateCertificate = async (updatedCertificate: Certificate) => {
    setCertificates(prev => prev.map(c => c.id === updatedCertificate.id ? updatedCertificate : c));
    try {
        // @ts-ignore
        await api.updateCertificate(updatedCertificate);
    } catch (e) {
        console.error("Failed to sync cert update", e);
    }
  };

  const deleteCertificate = async (certificateId: number) => {
    try {
        await api.deleteCertificate(certificateId);
        setCertificates(prev => prev.filter(c => c.id !== certificateId));
    } catch (err) {
        console.error("Error deleting certificate", err);
    }
  };

  const updateSkills = (newSkills: Skill[]) => {
      setSkills(newSkills);
  };

  return (
    <PortfolioContext.Provider value={{ 
      projects, 
      certificates,
      skills,
      addProject, 
      updateProject, 
      deleteProject, 
      addCertificate,
      updateCertificate,
      deleteCertificate,
      updateSkills
    }}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};
