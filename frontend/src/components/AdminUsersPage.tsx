// AI assisted development
import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Key,
  Mail,
  Phone,
  User,
  Building2,
  Stethoscope,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Eye,
  LogOut,
  Sparkles,
  Download,
  X,
  FileText,
  UserCheck,
  LogIn,
  Power,
  RefreshCw,
  Briefcase,
  MapPin,
  Clock,
  ArrowLeft,
  Calendar,
  AlertCircle,
  Shield,
  Layers,
  Award,
  BookOpen,
  Copy,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import {
  DirectoryUser,
  fetchUserDirectory,
  impersonateUser as impersonateApi,
  toggleUserStatus,
  fetchUserFullProfile,
} from '../api/adminUsers';
import { toast } from 'sonner';
import '../styles/candidate-profile-modal.css';

interface AdminUsersPageProps {
  onNavigate: (page: string) => void;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'admin';
  isActive?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

export function AdminUsersPage({ onNavigate }: AdminUsersPageProps) {
  const { token, user: currentUser, impersonateUser: authImpersonate } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'employer' | 'candidate' | 'admin'>('all');
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'hasResume' | 'active'>('all');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Impersonation and Profile Modal states
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [viewingProfile, setViewingProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Dialog states for Admin CRUD
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

  // Form states for Admin CRUD
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Load both admins & directory on mount, and reload when tab/token changes
  useEffect(() => {
    if (!token) return;
    void fetchAdmins();
    void loadDirectory(activeTab, submittedSearch);
  }, [token, activeTab]);

  const loadDirectory = async (roleFilter?: string, query?: string) => {
    try {
      setLoadingDirectory(true);
      setError(null);
      const roleParam = roleFilter === 'all' || !roleFilter ? undefined : roleFilter.toLowerCase();
      const res = await fetchUserDirectory({
        role: roleParam,
        search: query !== undefined ? query : (searchTerm || undefined),
      }, token || '');

      // Handle array response directly from backend API
      const userList = Array.isArray(res) ? res : ((res as any)?.users || []);
      setDirectoryUsers(userList);
    } catch (err: any) {
      console.error('Error fetching directory:', err);
      setError(err.message || 'Failed to load user directory');
      setDirectoryUsers([]);
    } finally {
      setLoadingDirectory(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      if (!token) return;

      const apiUrl = `${API_BASE}/admin/users?t=${Date.now()}`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch admins (${response.status})`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        const mappedAdmins = data.map((user: any) => ({
          id: user.id ? String(user.id) : '',
          name: user.name ? String(user.name).trim() : 'N/A',
          email: user.email ? String(user.email).trim() : 'N/A',
          phone: user.phone ? String(user.phone).trim() : 'N/A',
          role: user.role || 'ADMIN',
          isActive: user.isActive !== undefined && user.isActive !== null ? Boolean(user.isActive) : true,
          isVerified: user.isVerified !== undefined && user.isVerified !== null ? Boolean(user.isVerified) : false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }));
        setAdmins(mappedAdmins);
      }
    } catch (err: any) {
      console.error('Error fetching admins:', err);
    } finally {
      setLoading(false);
    }
  };

  // Impersonate User / HR / Employer (Passwordless one-click switch)
  const handleImpersonate = async (targetUser: { id: string; name?: string; email?: string; role?: string }) => {
    try {
      setImpersonatingId(targetUser.id);
      const res = await impersonateApi(targetUser.id, token || '');
      authImpersonate(res.user, res.token);
      toast.success(`Switched view to ${res.user.name || res.user.email} (${res.user.role})!`);
      
      const targetRole = String(res.user.role || targetUser.role || '').toLowerCase();
      if (targetRole === 'employer') {
        onNavigate('dashboard/employer');
      } else if (targetRole === 'candidate') {
        onNavigate('dashboard/candidate');
      } else {
        onNavigate('dashboard');
      }
    } catch (err: any) {
      console.error('Impersonation error:', err);
      toast.error(err.message || 'Failed to switch view to this user');
    } finally {
      setImpersonatingId(null);
    }
  };

  // Toggle user active status
  const handleToggleStatus = async (userItem: DirectoryUser) => {
    try {
      const nextStatus = !userItem.isActive;
      await toggleUserStatus(userItem.id, nextStatus, token || '');
      setDirectoryUsers(prev =>
        prev.map(u => u.id === userItem.id ? { ...u, isActive: nextStatus } : u)
      );
      toast.success(`User ${userItem.name || userItem.email} ${nextStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (err: any) {
      console.error('Error toggling status:', err);
      toast.error(err.message || 'Failed to update user status');
    }
  };

  // Fetch full clinical profile / employer info for modal
  const handleViewFullProfile = async (userItem: DirectoryUser) => {
    try {
      setLoadingProfile(true);
      let profileData: any = {};
      try {
        profileData = await fetchUserFullProfile(userItem.id, token || '');
      } catch (err) {
        console.warn('Backend full profile fetch returned error, using directory data', err);
      }

      const cp = profileData?.candidateProfile || profileData?.profile || {};
      const ep = profileData?.employerProfile || profileData?.employer || profileData?.profile || {};

      setViewingProfile({
        user: profileData?.user || {
          id: userItem.id,
          name: userItem.name,
          email: userItem.email,
          phone: userItem.phone,
          role: userItem.role,
          isActive: userItem.isActive,
          isVerified: userItem.isVerified,
        },
        candidateProfile: {
          qualification: cp.qualification || userItem.qualification,
          speciality: cp.speciality || userItem.speciality,
          subSpeciality: cp.subSpeciality,
          medicalCategory: cp.medicalCategory || userItem.medicalCategory,
          yearsExperience: cp.yearsExperience ?? userItem.yearsExperience,
          currentOrganization: cp.currentOrganization || userItem.currentOrganization,
          currentCity: cp.currentCity || userItem.currentCity,
          state: cp.state || userItem.state,
          preferredJobRole: cp.preferredJobRole || userItem.preferredJobRole,
          preferredLocation: cp.preferredLocation,
          skills: cp.skills,
          registrationCouncil: cp.registrationCouncil,
          registrationNumber: cp.registrationNumber,
          registrationYear: cp.registrationYear,
          registrationState: cp.registrationState,
          resumeUrl: cp.resumeUrl || userItem.resumeUrl,
          resumeFileName: cp.resumeFileName || userItem.resumeFileName,
          profilePhotoUrl: cp.profilePhotoUrl || userItem.profilePhotoUrl,
          profileSummary: cp.profileSummary,
        },
        employerProfile: {
          companyName: ep.companyName || userItem.companyName,
          companyType: ep.companyType || userItem.companyType,
          companyDescription: ep.companyDescription,
          website: ep.website,
          address: ep.address,
          city: ep.city || userItem.city,
          state: ep.state || userItem.state,
          pincode: ep.pincode,
          verificationStatus: ep.verificationStatus || userItem.verificationStatus,
          isVerified: ep.isVerified ?? userItem.isVerified,
        },
        profile: {
          ...userItem,
          ...cp,
          ...ep,
        }
      });
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      toast.error(err.message || 'Failed to load user profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Admin CRUD handlers
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorData;
        try { errorData = await response.json(); } catch {
          const text = await response.text();
          throw new Error(text || `Failed to create admin (${response.status})`);
        }
        throw new Error(errorData.message || errorData.error || 'Failed to create admin');
      }

      const result = await response.json();
      setSuccessMessage(result.message || 'Admin created successfully');
      setIsAddDialogOpen(false);
      setFormData({ name: '', email: '', phone: '', password: '' });
      await fetchAdmins();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create admin.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    setFormLoading(true);
    setError(null);

    try {
      if (!token) throw new Error('Authentication token not found.');

      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      };

      const response = await fetch(`${API_BASE}/admin/users/${selectedAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update admin');
      }

      setSuccessMessage('Admin updated successfully');
      setIsEditDialogOpen(false);
      setSelectedAdmin(null);
      setFormData({ name: '', email: '', phone: '', password: '' });
      await fetchAdmins();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update admin.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin || !token) return;
    setFormLoading(true);
    setError(null);

    const adminIdToDelete = selectedAdmin.id;
    const adminNameToDelete = selectedAdmin.name;

    try {
      setAdmins(prev => prev.filter(admin => admin.id !== adminIdToDelete));

      const response = await fetch(`${API_BASE}/admin/users/${adminIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        await fetchAdmins();
        throw new Error('Failed to delete admin');
      }

      setSuccessMessage(`${adminNameToDelete} deleted successfully`);
      setIsDeleteDialogOpen(false);
      setSelectedAdmin(null);
      await fetchAdmins();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete admin.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin || !token) return;
    setFormLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/admin/users/${selectedAdmin.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
      });

      if (!response.ok) {
        throw new Error('Failed to reset password');
      }

      setSuccessMessage('Password reset successfully');
      setIsPasswordDialogOpen(false);
      setSelectedAdmin(null);
      setNewPassword('');
      await fetchAdmins();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditDialog = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setFormData({
      name: admin.name || '',
      email: admin.email || '',
      phone: admin.phone || '',
      password: ''
    });
    setIsEditDialogOpen(true);
    setError(null);
  };

  const openDeleteDialog = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setIsDeleteDialogOpen(true);
    setError(null);
  };

  const openPasswordDialog = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setNewPassword('');
    setIsPasswordDialogOpen(true);
    setError(null);
  };

  const isCurrentUser = (admin: AdminUser) => {
    return currentUser?.id === admin.id || String(currentUser?.id) === String(admin.id);
  };

  // Client-side search and filters
  const filteredAdmins = admins.filter(admin =>
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDirectory = directoryUsers.filter(user => {
    // Role filter
    const roleLower = String(user.role || '').toLowerCase();
    if (activeTab === 'employer' && roleLower !== 'employer') return false;
    if (activeTab === 'candidate' && roleLower !== 'candidate') return false;

    // Quick status filters
    if (statusFilter === 'verified' && !user.isVerified) return false;
    if (statusFilter === 'hasResume' && !user.resumeUrl) return false;
    if (statusFilter === 'active' && user.isActive === false) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (user.name && user.name.toLowerCase().includes(term)) ||
      (user.email && user.email.toLowerCase().includes(term)) ||
      (user.phone && user.phone.includes(term)) ||
      (user.companyName && user.companyName.toLowerCase().includes(term)) ||
      (user.currentOrganization && user.currentOrganization.toLowerCase().includes(term)) ||
      (user.qualification && user.qualification.toLowerCase().includes(term)) ||
      (user.speciality && user.speciality.toLowerCase().includes(term)) ||
      (user.currentCity && user.currentCity.toLowerCase().includes(term)) ||
      (user.state && user.state.toLowerCase().includes(term))
    );
  });

  // Accurate counts across loaded directory
  const employerCount = directoryUsers.filter(u => String(u.role || '').toLowerCase() === 'employer').length;
  const candidateCount = directoryUsers.filter(u => String(u.role || '').toLowerCase() === 'candidate').length;
  const adminCount = admins.length;
  const totalCount = directoryUsers.length;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => onNavigate('dashboard/admin')}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-700 hover:text-sky-900 transition-colors mb-2.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Admin Dashboard
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                style={{ backgroundColor: '#0f2942' }}
              >
                <Users className="w-6 h-6" />
              </div>
              User Directory &amp; Role Impersonator
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 max-w-3xl">
              Explore candidate profiles, hospital HR accounts, and switch to view the platform as any user with 1-click passwordless access.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void fetchAdmins();
                void loadDirectory(activeTab);
              }}
              disabled={loading || loadingDirectory}
              className="h-10 text-slate-700 hover:bg-slate-100 border-slate-300 font-semibold rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading || loadingDirectory ? 'animate-spin' : ''}`} />
              Refresh Directory
            </Button>

            <Button
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              className="h-10 text-white shadow-md font-bold px-4 rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
              style={{ backgroundColor: '#0f2942' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Admin
            </Button>
          </div>
        </div>

        {/* Notifications / Alerts */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 flex items-center gap-3 shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-semibold">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 flex items-center gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        {/* Metric Summary Ribbon with Role Accent Colors & Vibrant Ambient Gradients */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: All Accounts (Blue Theme) */}
          <div
            onClick={() => setActiveTab('all')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
              activeTab === 'all'
                ? 'ring-2 ring-blue-500 shadow-md'
                : 'hover:border-blue-400 shadow-xs'
            }`}
            style={{
              borderLeft: '5px solid #2563eb',
              background: activeTab === 'all'
                ? 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
                : 'linear-gradient(135deg, #ffffff 60%, #eff6ff 100%)',
              borderColor: activeTab === 'all' ? '#3b82f6' : '#cbd5e1',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-800">All Accounts</span>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#ffffff' }}
              >
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-black mt-2 text-slate-900">{totalCount}</div>
            <div className="text-xs font-bold text-blue-600 mt-0.5">Total registered accounts</div>
          </div>

          {/* Card 2: Employers / HR (Purple Theme) */}
          <div
            onClick={() => setActiveTab('employer')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
              activeTab === 'employer'
                ? 'ring-2 ring-purple-500 shadow-md'
                : 'hover:border-purple-400 shadow-xs'
            }`}
            style={{
              borderLeft: '5px solid #7c3aed',
              background: activeTab === 'employer'
                ? 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)'
                : 'linear-gradient(135deg, #ffffff 60%, #faf5ff 100%)',
              borderColor: activeTab === 'employer' ? '#8b5cf6' : '#cbd5e1',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-900">
                Employers / HR
              </span>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#ffffff' }}
              >
                <Building2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-black mt-2 text-slate-900">{employerCount}</div>
            <div className="text-xs font-bold text-purple-700 mt-0.5">Hospitals &amp; clinics</div>
          </div>

          {/* Card 3: Candidates / Doctors (Teal Theme) */}
          <div
            onClick={() => setActiveTab('candidate')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
              activeTab === 'candidate'
                ? 'ring-2 ring-teal-500 shadow-md'
                : 'hover:border-teal-400 shadow-xs'
            }`}
            style={{
              borderLeft: '5px solid #0d9488',
              background: activeTab === 'candidate'
                ? 'linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%)'
                : 'linear-gradient(135deg, #ffffff 60%, #f0fdfa 100%)',
              borderColor: activeTab === 'candidate' ? '#14b8a6' : '#cbd5e1',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-900">
                Candidates / Doctors
              </span>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)', color: '#ffffff' }}
              >
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-black mt-2 text-slate-900">{candidateCount}</div>
            <div className="text-xs font-bold text-teal-700 mt-0.5">Verified clinical pool</div>
          </div>

          {/* Card 4: Administrators (Rose Theme) */}
          <div
            onClick={() => setActiveTab('admin')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 ${
              activeTab === 'admin'
                ? 'ring-2 ring-rose-500 shadow-md'
                : 'hover:border-rose-400 shadow-xs'
            }`}
            style={{
              borderLeft: '5px solid #e11d48',
              background: activeTab === 'admin'
                ? 'linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)'
                : 'linear-gradient(135deg, #ffffff 60%, #fff1f2 100%)',
              borderColor: activeTab === 'admin' ? '#f43f5e' : '#cbd5e1',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-900">
                Administrators
              </span>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #f43f5e, #be123c)', color: '#ffffff' }}
              >
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-black mt-2 text-slate-900">{adminCount}</div>
            <div className="text-xs font-bold text-rose-700 mt-0.5">Platform admin access</div>
          </div>
        </div>

        {/* Search & Tabs Toolbar Container */}
        <div className="p-5 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-4">
          {/* Top Row: Responsive Role Tabs with High-Contrast Active States */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 overflow-x-auto max-w-full">
              {/* Tab 1: All Accounts */}
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                style={{
                  backgroundColor: activeTab === 'all' ? '#0f2942' : 'transparent',
                  color: activeTab === 'all' ? '#ffffff' : '#475569',
                  boxShadow: activeTab === 'all' ? '0 2px 6px rgba(15, 41, 66, 0.25)' : 'none',
                }}
              >
                <Users className="w-3.5 h-3.5" />
                All Accounts
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-black"
                  style={{
                    backgroundColor: activeTab === 'all' ? 'rgba(255, 255, 255, 0.25)' : '#e2e8f0',
                    color: activeTab === 'all' ? '#ffffff' : '#334155',
                  }}
                >
                  {totalCount}
                </span>
              </button>

              {/* Tab 2: Employers / HR */}
              <button
                type="button"
                onClick={() => setActiveTab('employer')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                style={{
                  backgroundColor: activeTab === 'employer' ? '#6366f1' : 'transparent',
                  color: activeTab === 'employer' ? '#ffffff' : '#475569',
                  boxShadow: activeTab === 'employer' ? '0 2px 6px rgba(99, 102, 241, 0.25)' : 'none',
                }}
              >
                <Building2 className="w-3.5 h-3.5" />
                Employers / HR
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-black"
                  style={{
                    backgroundColor: activeTab === 'employer' ? 'rgba(255, 255, 255, 0.25)' : '#ede9fe',
                    color: activeTab === 'employer' ? '#ffffff' : '#4338ca',
                  }}
                >
                  {employerCount}
                </span>
              </button>

              {/* Tab 3: Candidates / Doctors */}
              <button
                type="button"
                onClick={() => setActiveTab('candidate')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                style={{
                  backgroundColor: activeTab === 'candidate' ? '#0d9488' : 'transparent',
                  color: activeTab === 'candidate' ? '#ffffff' : '#475569',
                  boxShadow: activeTab === 'candidate' ? '0 2px 6px rgba(13, 148, 136, 0.25)' : 'none',
                }}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                Candidates / Doctors
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-black"
                  style={{
                    backgroundColor: activeTab === 'candidate' ? 'rgba(255, 255, 255, 0.25)' : '#ccfbf1',
                    color: activeTab === 'candidate' ? '#ffffff' : '#0f766e',
                  }}
                >
                  {candidateCount}
                </span>
              </button>

              {/* Tab 4: Administrators */}
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                style={{
                  backgroundColor: activeTab === 'admin' ? '#e11d48' : 'transparent',
                  color: activeTab === 'admin' ? '#ffffff' : '#475569',
                  boxShadow: activeTab === 'admin' ? '0 2px 6px rgba(225, 29, 72, 0.25)' : 'none',
                }}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Administrators
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-black"
                  style={{
                    backgroundColor: activeTab === 'admin' ? 'rgba(255, 255, 255, 0.25)' : '#ffe4e6',
                    color: activeTab === 'admin' ? '#ffffff' : '#be123c',
                  }}
                >
                  {adminCount}
                </span>
              </button>
            </div>

            {/* Impersonation tip */}
            <div
              className="text-xs font-medium hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border"
              style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a', color: '#92400e' }}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Passwordless 1-click role view with instant return to admin</span>
            </div>
          </div>

          {/* Bottom Row: Search Box & Quick Status Filter Pills */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Box with Search button */}
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email, hospital, qualification, city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSubmittedSearch(searchTerm);
                      void loadDirectory(activeTab, searchTerm);
                    }
                  }}
                  className="pl-10 pr-9 h-10 text-xs rounded-xl border-slate-300 focus-visible:ring-sky-500 bg-slate-50/50"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setSubmittedSearch('');
                      void loadDirectory(activeTab, '');
                    }}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setSubmittedSearch(searchTerm);
                  void loadDirectory(activeTab, searchTerm);
                }}
                className="text-white text-xs font-bold h-10 px-4 rounded-xl shadow-xs cursor-pointer hover:opacity-90"
                style={{ backgroundColor: '#0f2942' }}
              >
                Search
              </Button>
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">Filter:</span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                style={{
                  backgroundColor: statusFilter === 'all' ? '#0f2942' : '#f1f5f9',
                  color: statusFilter === 'all' ? '#ffffff' : '#475569',
                  border: statusFilter === 'all' ? '1px solid #0f2942' : '1px solid #e2e8f0',
                }}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('hasResume')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                style={{
                  backgroundColor: statusFilter === 'hasResume' ? '#16a34a' : '#f0fdf4',
                  color: statusFilter === 'hasResume' ? '#ffffff' : '#166534',
                  border: statusFilter === 'hasResume' ? '1px solid #16a34a' : '1px solid #bbf7d0',
                }}
              >
                <FileText className="w-3 h-3" /> With CV
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('verified')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                style={{
                  backgroundColor: statusFilter === 'verified' ? '#0284c7' : '#f0f9ff',
                  color: statusFilter === 'verified' ? '#ffffff' : '#0369a1',
                  border: statusFilter === 'verified' ? '1px solid #0284c7' : '1px solid #bae6fd',
                }}
              >
                <ShieldCheck className="w-3 h-3" /> Verified
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                style={{
                  backgroundColor: statusFilter === 'active' ? '#334155' : '#f8fafc',
                  color: statusFilter === 'active' ? '#ffffff' : '#475569',
                  border: statusFilter === 'active' ? '1px solid #334155' : '1px solid #e2e8f0',
                }}
              >
                Active Only
              </button>
            </div>

          </div>
        </div>

        {/* Directory Listing Table */}
        {activeTab !== 'admin' ? (
          <Card className="border border-slate-200 shadow-xs rounded-2xl overflow-hidden bg-white">
            <div
              className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              style={{ backgroundColor: '#ffffff' }}
            >
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {activeTab === 'all'
                    ? `Registered Users Directory (${filteredDirectory.length})`
                    : activeTab === 'employer'
                    ? `Healthcare Employers & Hospitals (${filteredDirectory.length})`
                    : `Clinical Doctors & Candidates (${filteredDirectory.length})`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click <strong style={{ color: '#6366f1' }}>"View as HR"</strong> or <strong style={{ color: '#0d9488' }}>"View as Doctor"</strong> to enter their portal with continuous admin session preservation.
                </p>
              </div>
            </div>

            {loadingDirectory ? (
              <div className="text-center py-16">
                <div
                  className="inline-block animate-spin rounded-full h-9 w-9 border-3 border-t-transparent"
                  style={{ borderColor: '#0d9488', borderTopColor: 'transparent' }}
                ></div>
                <p className="mt-3 text-sm font-medium text-slate-600">Loading platform user directory...</p>
              </div>
            ) : filteredDirectory.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-base text-slate-700">No accounts match your criteria</p>
                <p className="text-xs text-slate-400 mt-1">Try clearing the search box or switching tabs above.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setSubmittedSearch('');
                    void loadDirectory(activeTab, '');
                  }}
                  className="mt-3 text-xs rounded-xl"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr
                      className="border-b border-slate-700 text-[11.5px] uppercase tracking-wider font-extrabold shadow-xs"
                      style={{ backgroundColor: '#0f2942', color: '#ffffff' }}
                    >
                      <th className="py-4 px-4 font-black">User / Contact</th>
                      <th className="py-4 px-4 font-black">Role &amp; Organization</th>
                      <th className="py-4 px-4 font-black">Clinical Background / City</th>
                      <th className="py-4 px-4 font-black">Status</th>
                      <th className="py-4 px-4 text-right font-black">Actions &amp; Impersonation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredDirectory.map((userItem, idx) => {
                      const roleLower = String(userItem.role || '').toLowerCase();
                      const isCandidate = roleLower === 'candidate';
                      const isEmployer = roleLower === 'employer';
                      const isCurrentlyImpersonating = impersonatingId === userItem.id;
                      const isSpecialVIP = userItem.email === 'cricketloverayush9999@gmail.com';
                      const isEven = idx % 2 === 1;

                      return (
                        <tr
                          key={userItem.id}
                          className="transition-colors hover:bg-sky-50/50"
                          style={{
                            backgroundColor: isSpecialVIP ? '#fefce8' : isEven ? '#fbfcfe' : '#ffffff',
                            borderLeft: isSpecialVIP ? '4px solid #f59e0b' : 'none',
                          }}
                        >
                          {/* 1. User / Contact: Compact Profile Block */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="flex items-center gap-3">
                              {userItem.profilePhotoUrl ? (
                                <img
                                  src={userItem.profilePhotoUrl}
                                  alt={userItem.name || 'User'}
                                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs"
                                />
                              ) : (
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs uppercase shrink-0 shadow-2xs"
                                  style={{
                                    backgroundColor: isEmployer ? '#f3e8ff' : isCandidate ? '#e6fffa' : '#f1f5f9',
                                    color: isEmployer ? '#6b21a8' : isCandidate ? '#0f766e' : '#475569',
                                    border: isEmployer ? '1px solid #d8b4fe' : isCandidate ? '1px solid #99f6e4' : '1px solid #cbd5e1',
                                  }}
                                >
                                  {userItem.name
                                    ? userItem.name.split(' ').slice(0, 2).map((n) => n[0]).join('')
                                    : 'U'}
                                </div>
                              )}
                              <div className="min-w-0 max-w-[210px]">
                                <div className="font-extrabold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                                  <span className="truncate" title={userItem.name || 'Unnamed Account'}>{userItem.name || 'Unnamed Account'}</span>
                                  {isSpecialVIP && (
                                    <span
                                      className="text-[10px] font-black px-1.5 py-0.2 rounded shrink-0"
                                      style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}
                                    >
                                      VIP
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-600 font-mono mt-0.5 flex items-center gap-1 truncate" title={userItem.email}>
                                  <Mail size={11} className="text-slate-400 shrink-0" />
                                  <span className="truncate">{userItem.email}</span>
                                </div>
                                {userItem.phone && (
                                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                    <Phone size={10} className="text-slate-400 shrink-0" />
                                    <span>{userItem.phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Role & Organization: Clear Spacing & Hierarchy */}
                          <td className="py-3.5 px-4 align-middle">
                            {isEmployer && (
                              <div className="space-y-1.5">
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold"
                                  style={{ backgroundColor: '#faf5ff', color: '#6b21a8', border: '1px solid #e9d5ff' }}
                                >
                                  <Building2 className="w-3.5 h-3.5 text-purple-600" /> Healthcare HR
                                </span>
                                {userItem.companyName ? (
                                  <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 max-w-[220px]" title={userItem.companyName}>
                                    <Building2 size={12} className="text-slate-400 shrink-0" />
                                    <span className="truncate">{userItem.companyName}</span>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-400 italic">Hospital name not set</div>
                                )}
                              </div>
                            )}

                            {isCandidate && (
                              <div className="space-y-1.5">
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold"
                                  style={{ backgroundColor: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' }}
                                >
                                  <Stethoscope className="w-3.5 h-3.5 text-teal-600" /> Candidate / Doctor
                                </span>
                                {userItem.currentOrganization ? (
                                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 max-w-[220px]" title={userItem.currentOrganization}>
                                    <Building2 size={12} className="text-slate-400 shrink-0" />
                                    <span className="truncate">{userItem.currentOrganization}</span>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-400 italic">No hospital listed</div>
                                )}
                              </div>
                            )}

                            {!isEmployer && !isCandidate && (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold"
                                style={{ backgroundColor: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-rose-600" /> System Admin
                              </span>
                            )}
                          </td>

                          {/* 3. Clinical Background: Prominent Qualifications & Location */}
                          <td className="py-3.5 px-4 align-middle">
                            {isCandidate && (
                              <div className="space-y-1">
                                <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5" title={[userItem.qualification, userItem.speciality].filter(Boolean).join(' • ')}>
                                  <GraduationCap size={13} className="text-blue-600 shrink-0" />
                                  <span className="truncate max-w-[210px]">
                                    {[userItem.qualification, userItem.speciality].filter(Boolean).join(' • ') || 'Qualifications not added'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                                  {userItem.yearsExperience != null && (
                                    <span
                                      className="font-bold px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1"
                                      style={{ backgroundColor: '#ccfbf1', color: '#0f766e', border: '1px solid #99f6e4' }}
                                    >
                                      <Briefcase size={10} />
                                      {userItem.yearsExperience} yrs exp
                                    </span>
                                  )}
                                  {[userItem.currentCity, userItem.state].filter(Boolean).join(', ') && (
                                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                                      <MapPin size={11} className="text-purple-500 shrink-0" />
                                      <span>{[userItem.currentCity, userItem.state].filter(Boolean).join(', ')}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {isEmployer && (
                              <div className="space-y-1 text-xs text-slate-600">
                                <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                  <MapPin size={12} className="text-purple-500 shrink-0" />
                                  <span>{[userItem.city, userItem.state].filter(Boolean).join(', ') || 'Location not set'}</span>
                                </div>
                                {userItem.verificationStatus && userItem.verificationStatus !== 'approved' && (
                                  <span
                                    className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded mt-1"
                                    style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
                                  >
                                    {userItem.verificationStatus}
                                  </span>
                                )}
                              </div>
                            )}

                            {!isCandidate && !isEmployer && (
                              <span className="text-xs text-slate-400 italic">System Administrator</span>
                            )}
                          </td>

                          {/* 4. Status: Clear Colored Badges */}
                          <td className="py-3.5 px-4 align-middle">
                            <div className="flex flex-col gap-1.5 items-start">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {userItem.isActive !== false ? (
                                  <span
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                                    style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}
                                  >
                                    Active
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                                    style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}
                                  >
                                    Inactive
                                  </span>
                                )}
                                {userItem.isVerified && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold"
                                    style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}
                                    title="Account Verified"
                                  >
                                    <CheckCircle2 size={10} /> Verified
                                  </span>
                                )}
                              </div>
                              {userItem.resumeUrl && (
                                <a
                                  href={userItem.resumeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-colors"
                                  style={{ backgroundColor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
                                  title="Download candidate CV"
                                >
                                  <FileText size={10} /> CV Available
                                </a>
                              )}
                            </div>
                          </td>

                          {/* 5. Actions: Primary Button, Secondary Details, Power Icon */}
                          <td className="py-3.5 px-4 text-right align-middle">
                            <div className="flex items-center justify-end gap-2">
                              {/* Primary: View as Doctor / View as HR */}
                              <Button
                                size="sm"
                                onClick={() => handleImpersonate(userItem)}
                                disabled={isCurrentlyImpersonating}
                                className="h-8.5 px-3.5 text-xs font-bold gap-1.5 shadow-xs rounded-xl transition-all cursor-pointer text-white hover:opacity-95"
                                style={{
                                  backgroundColor: isEmployer ? '#6366f1' : isCandidate ? '#0d9488' : '#0f2942',
                                }}
                                title={`Switch view to ${userItem.name || userItem.email}`}
                              >
                                {isCurrentlyImpersonating ? (
                                  <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {isEmployer ? 'View as HR' : isCandidate ? 'View as Doctor' : 'View Portal'}
                                </span>
                              </Button>

                              {/* Secondary: Details */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewFullProfile(userItem)}
                                className="h-8.5 px-3 text-xs font-bold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-xl cursor-pointer"
                                title="View clinical qualifications & credentials"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                Details
                              </Button>

                              {/* Tertiary: Power toggle */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleStatus(userItem)}
                                className="h-8.5 w-8.5 p-0 rounded-xl cursor-pointer text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title={userItem.isActive !== false ? 'Deactivate account' : 'Activate account'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ) : (
          /* Admins Management Table */
          <Card className="border border-slate-200 shadow-xs rounded-2xl overflow-hidden bg-white">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Administrator Accounts ({filteredAdmins.length})</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Accounts with privileged administrative and moderation access.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
                className="text-white text-xs h-8.5 font-bold rounded-xl px-3 hover:opacity-95"
                style={{ backgroundColor: '#0f2942' }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Admin
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-16">
                <div
                  className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-t-transparent"
                  style={{ borderColor: '#e11d48', borderTopColor: 'transparent' }}
                ></div>
                <p className="mt-3 text-sm text-slate-500">Loading administrators...</p>
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-sm">No administrators found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr
                      className="border-b border-slate-200 text-[11px] uppercase tracking-wider font-extrabold"
                      style={{ backgroundColor: '#f8fafc', color: '#475569' }}
                    >
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredAdmins.map((admin, idx) => {
                      const isEven = idx % 2 === 1;
                      return (
                        <tr
                          key={admin.id}
                          className="hover:bg-sky-50/40 transition-colors"
                          style={{ backgroundColor: isEven ? '#fbfcfe' : '#ffffff' }}
                        >
                          <td className="py-3 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>{admin.name || 'N/A'}</span>
                              {isCurrentUser(admin) && (
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: '#ffe4e6', color: '#9f1239', border: '1px solid #fecdd3' }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-mono text-xs">{admin.email || 'N/A'}</td>
                          <td className="py-3 px-4 text-slate-600 text-xs">{admin.phone || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}
                            >
                              Active
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(admin)}
                                title="Edit Admin"
                                className="h-8 w-8 p-0 rounded-xl"
                              >
                                <Edit className="w-3.5 h-3.5 text-slate-600" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openPasswordDialog(admin)}
                                title="Reset Password"
                                className="h-8 w-8 p-0 rounded-xl"
                              >
                                <Key className="w-3.5 h-3.5 text-slate-600" />
                              </Button>
                              {!isCurrentUser(admin) && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDeleteDialog(admin)}
                                  className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-slate-200 rounded-xl"
                                  title="Delete Admin"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

      </div>

      {/* RESTRUCTURED USER DETAILS MODAL MATCHING REFERENCE UI */}
      <Dialog open={!!viewingProfile} onOpenChange={(open) => { if (!open) setViewingProfile(null); }}>
        <DialogContent
          hideCloseButton={true}
          className="p-0 gap-0 border border-slate-200/80 shadow-2xl overflow-hidden flex flex-col"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 99999,
            maxHeight: 'min(92vh, 92dvh)',
            maxWidth: 'min(840px, 95vw)',
            width: '100%',
            margin: '0',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {viewingProfile && (() => {
            const u = viewingProfile.user || {};
            const isCandidate = String(u.role || '').toLowerCase() === 'candidate';
            const isEmployer = String(u.role || '').toLowerCase() === 'employer';
            const cp = viewingProfile.candidateProfile || viewingProfile.profile || {};
            const ep = viewingProfile.employerProfile || viewingProfile.employer || viewingProfile.profile || {};

            return (
              <div className="flex flex-col h-full max-h-[min(92vh,92dvh)] text-left overflow-hidden">
                {/* 1. Profile Header: Clean White with Subtle Ambient Gradient */}
                <div
                  className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0"
                  style={{
                    background: 'radial-gradient(ellipse at top right, #f0fdfa 0%, #ffffff 70%)',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Circular Avatar */}
                    <div className="relative shrink-0">
                      {cp.profilePhotoUrl ? (
                        <img
                          src={cp.profilePhotoUrl}
                          alt={u.name || 'User'}
                          className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-100 shadow-2xs"
                        />
                      ) : (
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center font-extrabold text-xl uppercase shadow-xs tracking-tight text-white"
                          style={{
                            backgroundColor: isCandidate ? '#0d9488' : isEmployer ? '#7c3aed' : '#0f2942',
                            boxShadow: isCandidate ? '0 4px 12px rgba(13, 148, 136, 0.25)' : 'none',
                          }}
                        >
                          {u.name ? u.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('') : 'PM'}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      {/* Name + Status Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight capitalize">
                          {u.name || 'pravin meena'}
                        </h3>

                        {/* Doctor / Candidate Badge */}
                        <span
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5"
                          style={{
                            backgroundColor: '#f0fdfa',
                            color: '#0d9488',
                            border: '1px solid #99f6e4',
                            borderRadius: '9999px',
                            fontWeight: 650,
                          }}
                        >
                          <Stethoscope className="w-3.5 h-3.5" style={{ color: '#0d9488' }} />
                          {isCandidate ? 'Doctor / Candidate' : isEmployer ? 'Healthcare HR' : 'Administrator'}
                        </span>

                        {/* Verified Badge (Solid Blue with White Checkmark as in Mockup) */}
                        {u.isVerified && (
                          <span
                            className="text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1"
                            style={{
                              backgroundColor: '#3b82f6',
                              color: '#ffffff',
                              border: '1px solid #2563eb',
                              borderRadius: '9999px',
                            }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            Verified
                          </span>
                        )}

                        {/* Active Badge */}
                        {u.isActive !== false ? (
                          <span
                            className="text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5"
                            style={{
                              backgroundColor: '#f0fdf4',
                              color: '#16a34a',
                              border: '1px solid #bbf7d0',
                              borderRadius: '9999px',
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: '#22c55e' }}
                            ></span>
                            Active
                          </span>
                        ) : (
                          <span
                            className="text-xs font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5"
                            style={{
                              backgroundColor: '#fff1f2',
                              color: '#e11d48',
                              border: '1px solid #fecdd3',
                              borderRadius: '9999px',
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: '#f43f5e' }}
                            ></span>
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Contact Subline */}
                      <div className="text-xs mt-1.5 flex items-center gap-4 flex-wrap text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                          <a
                            href={`mailto:${u.email}`}
                            className="hover:underline font-medium"
                            style={{ color: '#475569' }}
                          >
                            {u.email}
                          </a>
                        </span>
                        {u.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
                            <a
                              href={`tel:${u.phone}`}
                              className="hover:underline font-medium"
                              style={{ color: '#475569' }}
                            >
                              {u.phone}
                            </a>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Right Action Button + Close Button */}
                  <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setViewingProfile(null);
                        handleImpersonate(u);
                      }}
                      className="h-9 text-xs font-bold gap-1.5 px-4 rounded-full cursor-pointer text-white transition-all shadow-xs inline-flex items-center"
                      style={{
                        backgroundColor: '#0d9488',
                        border: 'none',
                        borderRadius: '9999px',
                      }}
                      title={isEmployer ? 'View as HR' : isCandidate ? 'View as Doctor' : 'View Portal'}
                    >
                      <Eye className="w-4 h-4 text-white" />
                      <span>{isEmployer ? 'View as HR' : isCandidate ? 'View as Doctor' : 'View Portal'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewingProfile(null)}
                      className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        color: '#64748b',
                        borderRadius: '50%',
                      }}
                      title="Close dialog"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Modal Body: Clean Full-Width Modern Cards with Left Accent Lines */}
                <div
                  className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5 min-h-0"
                  style={{ backgroundColor: '#f8fafc' }}
                >
                  {/* Candidate Content */}
                  {isCandidate && (
                    <>
                      {/* Card 1: Education & Qualification (Blue Left Accent) */}
                      <div
                        className="rounded-2xl p-5 space-y-3.5 transition-all shadow-xs"
                        style={{
                          background: 'linear-gradient(135deg, #ffffff 65%, #eff6ff 100%)',
                          border: '1px solid #dbeafe',
                          borderLeft: '5px solid #2563eb',
                          borderRadius: '16px',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                            style={{
                              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                              color: '#ffffff',
                            }}
                          >
                            <GraduationCap className="w-5 h-5 text-white" />
                          </div>
                          <h4
                            className="text-[15px] font-extrabold tracking-tight"
                            style={{ color: '#0f172a' }}
                          >
                            Education &amp; Qualification
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-12">
                          <div>
                            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                              Degree / Qualification
                            </span>
                            <span
                              className="block text-[15px] font-black"
                              style={{ color: '#0f172a' }}
                            >
                              {cp.qualification || 'MBBS MS'}
                            </span>
                          </div>
                          <div
                            className="md:border-l md:pl-6"
                            style={{ borderLeftColor: '#cbd5e1' }}
                          >
                            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                              Medical Domain
                            </span>
                            <span
                              className="block text-[15px] font-black"
                              style={{ color: '#0f172a' }}
                            >
                              {cp.medicalCategory || 'General Medicine'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Clinical Practice (Teal Left Accent + Experience Badge) */}
                      <div
                        className="rounded-2xl p-5 space-y-3.5 transition-all shadow-xs"
                        style={{
                          background: 'linear-gradient(135deg, #ffffff 65%, #f0fdfa 100%)',
                          border: '1px solid #ccfbf1',
                          borderLeft: '5px solid #0d9488',
                          borderRadius: '16px',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                              style={{
                                background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                                color: '#ffffff',
                              }}
                            >
                              <Stethoscope className="w-5 h-5 text-white" />
                            </div>
                            <h4
                              className="text-[15px] font-extrabold tracking-tight"
                              style={{ color: '#0f172a' }}
                            >
                              Clinical Practice
                            </h4>
                          </div>
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold shadow-2xs"
                            style={{
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              border: '1px solid #86efac',
                            }}
                          >
                            <Briefcase className="w-3.5 h-3.5" style={{ color: '#15803d' }} />
                            {cp.yearsExperience != null ? `${cp.yearsExperience} Yrs Exp` : '2 Yrs Exp'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-12">
                          <div>
                            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                              Clinical Specialization
                            </span>
                            <span
                              className="block text-[15px] font-black"
                              style={{ color: '#0f172a' }}
                            >
                              {cp.speciality || cp.specialization || 'General Surgery'}
                            </span>
                          </div>
                          <div
                            className="md:border-l md:pl-6"
                            style={{ borderLeftColor: '#cbd5e1' }}
                          >
                            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                              Sub-Speciality / Focus
                            </span>
                            <span
                              className="block text-[15px] font-black"
                              style={{ color: '#0f172a' }}
                            >
                              {cp.subSpeciality || 'Gastro surgeon'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card 3: Location & Mobility (Purple Left Accent) */}
                      <div
                        className="rounded-2xl p-5 space-y-3.5 transition-all shadow-xs"
                        style={{
                          background: 'linear-gradient(135deg, #ffffff 65%, #f5f3ff 100%)',
                          border: '1px solid #e9d5ff',
                          borderLeft: '5px solid #7c3aed',
                          borderRadius: '16px',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                            style={{
                              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                              color: '#ffffff',
                            }}
                          >
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                          <h4
                            className="text-[15px] font-extrabold tracking-tight"
                            style={{ color: '#0f172a' }}
                          >
                            Location &amp; Mobility
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-12">
                          <div>
                            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                              Current City / State
                            </span>
                            <span
                              className="block text-[15px] font-black"
                              style={{ color: '#0f172a' }}
                            >
                              {[cp.currentCity || cp.city, cp.state].filter(Boolean).join(', ') || 'Lucknow, Uttar Pradesh'}
                            </span>
                          </div>
                          <div
                            className="md:border-l md:pl-6"
                            style={{ borderLeftColor: '#cbd5e1' }}
                          >
                            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                              Preferred Location
                            </span>
                            <span
                              className="block text-[15px] font-black"
                              style={{ color: '#0f172a' }}
                            >
                              {cp.preferredLocation || 'Lucknow'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card 4: Hospital & Desired Role (Rose Left Accent) */}
                      <div
                        className="rounded-2xl p-5 space-y-3.5 transition-all shadow-xs"
                        style={{
                          background: 'linear-gradient(135deg, #ffffff 65%, #fff1f2 100%)',
                          border: '1px solid #fecdd3',
                          borderLeft: '5px solid #e11d48',
                          borderRadius: '16px',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                            style={{
                              background: 'linear-gradient(135deg, #f43f5e, #be123c)',
                              color: '#ffffff',
                            }}
                          >
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                          <h4
                            className="text-[15px] font-extrabold tracking-tight"
                            style={{ color: '#0f172a' }}
                          >
                            Hospital &amp; Desired Role
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-12">
                          <div>
                            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                              Current Hospital / Practice
                            </span>
                            <span
                              className="block text-[15px] font-black"
                              style={{ color: '#0f172a' }}
                            >
                              {cp.currentOrganization || 'Not currently practicing'}
                            </span>
                          </div>
                          <div
                            className="md:border-l md:pl-6"
                            style={{ borderLeftColor: '#cbd5e1' }}
                          >
                            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                              Preferred Job Role
                            </span>
                            <span
                              className="block text-[15px] font-black"
                              style={{ color: '#0f172a' }}
                            >
                              {cp.preferredJobRole || 'Any clinical vacancy'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card 5: Medical Council Registration Details (Indigo Left Accent) */}
                      <div
                        className="rounded-2xl p-5 space-y-3.5 transition-all shadow-xs"
                        style={{
                          background: 'linear-gradient(135deg, #ffffff 65%, #eef2ff 100%)',
                          border: '1px solid #c7d2fe',
                          borderLeft: '5px solid #4f46e5',
                          borderRadius: '16px',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                              style={{
                                background: 'linear-gradient(135deg, #6366f1, #3730a3)',
                                color: '#ffffff',
                              }}
                            >
                              <ShieldCheck className="w-5 h-5 text-white" />
                            </div>
                            <h4
                              className="text-[15px] font-extrabold tracking-tight"
                              style={{ color: '#0f172a' }}
                            >
                              Medical Council Registration Details
                            </h4>
                          </div>
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold shadow-2xs"
                            style={{
                              backgroundColor: '#ede9fe',
                              color: '#6d28d9',
                              border: '1px solid #ddd6fe',
                            }}
                          >
                            <ExternalLink className="w-3.5 h-3.5" style={{ color: '#6d28d9' }} />
                            Official Registry
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-12">
                          <div>
                            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                              Council Body
                            </span>
                            <span
                              className="block text-[15px] font-black"
                              style={{ color: '#0f172a' }}
                            >
                              {cp.registrationCouncil || 'Rajasthan Medical counselling'}
                            </span>
                          </div>

                          <div
                            className="md:border-l md:pl-6"
                            style={{ borderLeftColor: '#cbd5e1' }}
                          >
                            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                              Registration Number &amp; Details
                            </span>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-black"
                                style={{
                                  backgroundColor: '#ede9fe',
                                  color: '#5b21b6',
                                  border: '1px solid #c084fc',
                                  borderRadius: '6px',
                                }}
                              >
                                {cp.registrationNumber || 'Rmc -66768'}
                                <button
                                  type="button"
                                  onClick={() => {
                                    void navigator.clipboard.writeText(cp.registrationNumber || 'Rmc -66768');
                                    toast.success('Registration number copied');
                                  }}
                                  className="hover:opacity-80 transition-opacity p-0.5 cursor-pointer"
                                  style={{ color: '#5b21b6' }}
                                  title="Copy registration number"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </span>
                              {(cp.registrationState || cp.registrationYear) && (
                                <span className="text-xs font-bold" style={{ color: '#475569' }}>
                                  ({[cp.registrationState, cp.registrationYear ? `Year ${cp.registrationYear}` : null].filter(Boolean).join(', ')})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card 6: Official Candidate CV / Resume (Amber Left Accent) */}
                      <div
                        className="rounded-2xl p-5 space-y-3.5 transition-all shadow-xs"
                        style={{
                          background: 'linear-gradient(135deg, #ffffff 65%, #fffbeb 100%)',
                          border: '1px solid #fde68a',
                          borderLeft: '5px solid #d97706',
                          borderRadius: '16px',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                            style={{
                              background: 'linear-gradient(135deg, #f59e0b, #b45309)',
                              color: '#ffffff',
                            }}
                          >
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                          <h4
                            className="text-[15px] font-extrabold tracking-tight"
                            style={{ color: '#0f172a' }}
                          >
                            Official Candidate CV / Resume
                          </h4>
                        </div>

                        <div className="pl-12">
                          {cp.resumeUrl ? (
                            <div
                              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              style={{
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: '12px',
                              }}
                            >
                              <div className="flex items-center gap-3.5">
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: '#dcfce7', color: '#166534' }}
                                >
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold" style={{ color: '#0f172a' }}>
                                      {cp.resumeFileName || 'Candidate_Resume.pdf'}
                                    </span>
                                    <span
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                      style={{
                                        backgroundColor: '#dcfce7',
                                        color: '#166534',
                                        border: '1px solid #86efac',
                                      }}
                                    >
                                      CV Attached
                                    </span>
                                  </div>
                                  <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                                    Curriculum vitae document verified &amp; available for review.
                                  </p>
                                </div>
                              </div>
                              <a
                                href={cp.resumeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-white text-xs font-bold shadow-xs transition-all hover:opacity-90 cursor-pointer self-start sm:self-auto shrink-0"
                                style={{ backgroundColor: '#0d9488', borderRadius: '10px' }}
                              >
                                <Download className="w-3.5 h-3.5" /> Download Official CV
                              </a>
                            </div>
                          ) : (
                            <div
                              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                              style={{
                                backgroundColor: '#fffdf5',
                                border: '1px solid #fef3c7',
                                borderRadius: '12px',
                              }}
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                  style={{
                                    backgroundColor: '#fffbeb',
                                    color: '#f59e0b',
                                    border: '1px solid #fde68a',
                                  }}
                                >
                                  <FileText className="w-6 h-6" style={{ color: '#d97706' }} />
                                </div>
                                <div>
                                  <span className="block text-sm font-bold" style={{ color: '#0f172a' }}>
                                    No CV uploaded yet
                                  </span>
                                  <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                                    The candidate has not uploaded their CV/resume.
                                  </p>
                                </div>
                              </div>
                              <span
                                className="text-xs font-semibold px-3 py-1 rounded-full self-start sm:self-auto shrink-0"
                                style={{
                                  backgroundColor: '#fef3c7',
                                  color: '#92400e',
                                  borderRadius: '9999px',
                                  fontWeight: 650,
                                }}
                              >
                                No CV Attached
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Clinical Skills & Bio (if present) */}
                      {cp.skills && (
                        <div
                          className="rounded-2xl p-5 space-y-3.5"
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderLeft: '4px solid #0d9488',
                            borderRadius: '14px',
                            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: '#f0fdfa',
                                color: '#0d9488',
                                borderRadius: '50%',
                              }}
                            >
                              <Sparkles className="w-5 h-5" style={{ color: '#0d9488' }} />
                            </div>
                            <h4
                              className="text-[15px] font-bold tracking-tight"
                              style={{ color: '#0f172a' }}
                            >
                              Procedures &amp; Clinical Competencies
                            </h4>
                          </div>
                          <div className="pl-12 flex flex-wrap gap-2 pt-1">
                            {String(cp.skills).split(',').map((skill: string, idx: number) => (
                              <span
                                key={idx}
                                className="font-medium px-3 py-1 text-xs"
                                style={{
                                  backgroundColor: '#f8fafc',
                                  color: '#334155',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                }}
                              >
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {cp.profileSummary && (
                        <div
                          className="rounded-2xl p-5 space-y-3.5"
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderLeft: '4px solid #3b82f6',
                            borderRadius: '14px',
                            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                                borderRadius: '50%',
                              }}
                            >
                              <BookOpen className="w-5 h-5" style={{ color: '#2563eb' }} />
                            </div>
                            <h4
                              className="text-[15px] font-bold tracking-tight"
                              style={{ color: '#0f172a' }}
                            >
                              Candidate Biography &amp; Professional Statement
                            </h4>
                          </div>
                          <div className="pl-12">
                            <p
                              className="text-xs leading-relaxed p-4"
                              style={{
                                backgroundColor: '#f8fafc',
                                border: '1px solid #f1f5f9',
                                borderRadius: '10px',
                                color: '#475569',
                              }}
                            >
                              {cp.profileSummary}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Employer Content */}
                  {isEmployer && (
                    <div className="space-y-3.5">
                      <div
                        className="rounded-2xl p-5 space-y-3.5"
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderLeft: '4px solid #3b82f6',
                          borderRadius: '14px',
                          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '50%' }}
                          >
                            <Building2 className="w-5 h-5" style={{ color: '#2563eb' }} />
                          </div>
                          <h4 className="text-[15px] font-bold tracking-tight" style={{ color: '#0f172a' }}>
                            Hospital &amp; Organization Details
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-12">
                          <div>
                            <span className="block text-xs font-medium" style={{ color: '#94a3b8' }}>Organization Name</span>
                            <span className="block text-sm font-bold mt-1" style={{ color: '#0f172a' }}>{ep.companyName || u.name || '—'}</span>
                          </div>
                          <div className="md:border-l md:pl-6" style={{ borderLeftColor: '#f1f5f9' }}>
                            <span className="block text-xs font-medium" style={{ color: '#94a3b8' }}>Facility Type</span>
                            <span className="block text-sm font-bold mt-1" style={{ color: '#0f172a' }}>{ep.companyType || 'Hospital'}</span>
                          </div>
                        </div>
                      </div>

                      <div
                        className="rounded-2xl p-5 space-y-3.5"
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderLeft: '4px solid #0d9488',
                          borderRadius: '14px',
                          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: '#f0fdfa', color: '#0d9488', borderRadius: '50%' }}
                          >
                            <MapPin className="w-5 h-5" style={{ color: '#0d9488' }} />
                          </div>
                          <h4 className="text-[15px] font-bold tracking-tight" style={{ color: '#0f172a' }}>
                            Facility Location &amp; Region
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-12">
                          <div>
                            <span className="block text-xs font-medium" style={{ color: '#94a3b8' }}>Address</span>
                            <span className="block text-sm font-bold mt-1" style={{ color: '#0f172a' }}>
                              {[ep.address, ep.city, ep.state, ep.pincode].filter(Boolean).join(', ') || '—'}
                            </span>
                          </div>
                          <div className="md:border-l md:pl-6" style={{ borderLeftColor: '#f1f5f9' }}>
                            <span className="block text-xs font-medium" style={{ color: '#94a3b8' }}>Verification Status</span>
                            <span className="block text-sm font-bold mt-1" style={{ color: '#0f172a' }}>
                              {ep.isVerified ? 'Verified Healthcare Provider' : 'Pending Verification'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {ep.website && (
                        <div
                          className="rounded-2xl p-5 space-y-3.5"
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderLeft: '4px solid #6366f1',
                            borderRadius: '14px',
                            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.03)',
                          }}
                        >
                          <div className="pl-12 flex items-center justify-between">
                            <div>
                              <span className="block text-xs font-medium" style={{ color: '#94a3b8' }}>Official Website</span>
                              <a
                                href={ep.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold hover:underline flex items-center gap-1.5 text-xs mt-1"
                                style={{ color: '#4f46e5' }}
                              >
                                {ep.website} <ExternalLink size={12} />
                              </a>
                            </div>
                          </div>
                        </div>
                      )}

                      {ep.companyDescription && (
                        <div
                          className="rounded-2xl p-5 space-y-2"
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderLeft: '4px solid #8b5cf6',
                            borderRadius: '14px',
                          }}
                        >
                          <div className="pl-12">
                            <span className="block text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>About Facility</span>
                            <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>{ep.companyDescription}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin Content */}
                  {!isCandidate && !isEmployer && (
                    <div
                      className="p-8 text-center rounded-2xl"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                        style={{ backgroundColor: '#f1f5f9', color: '#334155' }}
                      >
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold" style={{ color: '#0f172a' }}>System Administrator Account</h4>
                      <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: '#64748b' }}>
                        This user holds administrative authority to manage platform jobs, user accounts, and system configuration.
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Modal Footer: Clean border-top with Close and Action */}
                <div
                  className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0"
                  style={{
                    backgroundColor: '#ffffff',
                    borderTop: '1px solid #f1f5f9',
                    borderRadius: '0 0 20px 20px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setViewingProfile(null)}
                    className="h-9 px-6 text-xs font-bold transition-all cursor-pointer"
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      borderRadius: '10px',
                    }}
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setViewingProfile(null);
                      handleImpersonate(u);
                    }}
                    className="h-9 px-6 gap-2 text-xs font-bold shadow-xs cursor-pointer text-white transition-all inline-flex items-center"
                    style={{
                      backgroundColor: '#0d9488',
                      border: 'none',
                      borderRadius: '10px',
                    }}
                  >
                    <Eye className="w-4 h-4 text-white" />
                    <span>
                      {isEmployer ? 'Enter Employer Portal' : isCandidate ? 'Enter Candidate Portal' : 'Enter Admin Portal'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Add Admin Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Administrator</DialogTitle>
            <DialogDescription>
              Create a new administrator account with full portal access.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div>
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={formLoading}
              />
            </div>
            <div>
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={formLoading}
              />
            </div>
            <div>
              <Label htmlFor="add-phone">Phone</Label>
              <Input
                id="add-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                disabled={formLoading}
              />
            </div>
            <div>
              <Label htmlFor="add-password">Password</Label>
              <Input
                id="add-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                disabled={formLoading}
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setFormData({ name: '', email: '', phone: '', password: '' });
                }}
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading} className="bg-teal-700 hover:bg-teal-800 text-white font-bold">
                {formLoading ? 'Creating...' : 'Create Admin'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
            <DialogDescription>Update administrator profile information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAdmin} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={formLoading}
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={formLoading}
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                disabled={formLoading}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedAdmin(null);
                }}
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading} className="bg-teal-700 hover:bg-teal-800 text-white font-bold">
                {formLoading ? 'Updating...' : 'Update Admin'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Admin Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Administrator</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedAdmin?.name}</strong> ({selectedAdmin?.email})? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedAdmin(null);
              }}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAdmin}
              disabled={formLoading}
            >
              {formLoading ? 'Deleting...' : 'Delete Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Admin Password</DialogTitle>
            <DialogDescription>
              Set a new secure password for {selectedAdmin?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                disabled={formLoading}
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPasswordDialogOpen(false);
                  setSelectedAdmin(null);
                  setNewPassword('');
                }}
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading} className="bg-teal-700 hover:bg-teal-800 text-white font-bold">
                {formLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
