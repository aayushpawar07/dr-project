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
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 hover:text-teal-900 transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Admin Dashboard
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/25">
                <Users className="w-6 h-6" />
              </div>
              User Directory &amp; Role Impersonator
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Explore candidate profiles, employer accounts (e.g. Max, Apollo, Aimss), and switch to view the platform as any user with 1-click passwordless access.
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
              className="h-10 text-slate-700 hover:bg-slate-100 border-slate-300"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading || loadingDirectory ? 'animate-spin' : ''}`} />
              Refresh Directory
            </Button>

            <Button
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              className="h-10 bg-teal-700 hover:bg-teal-800 text-white shadow-md font-semibold"
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

        {/* Metric Summary Ribbon with Live Clinical Counts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => setActiveTab('all')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
              activeTab === 'all'
                ? 'border-teal-500 ring-2 ring-teal-500/20 bg-white shadow-md'
                : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">All Accounts</span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">{totalCount}</div>
            <div className="text-xs text-slate-500 mt-0.5">Platform total directory</div>
          </div>

          <div
            onClick={() => setActiveTab('employer')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
              activeTab === 'employer'
                ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white shadow-md'
                : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Employers / HR</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-indigo-900 mt-2">{employerCount}</div>
            <div className="text-xs text-indigo-600 font-semibold mt-0.5">Hospitals &amp; Clinics</div>
          </div>

          <div
            onClick={() => setActiveTab('candidate')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
              activeTab === 'candidate'
                ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white shadow-md'
                : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Candidates / Doctors</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-900 mt-2">{candidateCount}</div>
            <div className="text-xs text-emerald-600 font-semibold mt-0.5">Medical Talent Pool</div>
          </div>

          <div
            onClick={() => setActiveTab('admin')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
              activeTab === 'admin'
                ? 'border-sky-500 ring-2 ring-sky-500/20 bg-white shadow-md'
                : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Administrators</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-sky-900 mt-2">{adminCount}</div>
            <div className="text-xs text-sky-600 font-semibold mt-0.5">Super &amp; Staff Access</div>
          </div>
        </div>

        {/* Search & Tabs Toolbar */}
        <div className="p-5 bg-white border border-slate-200 shadow-sm rounded-2xl space-y-4">
          {/* Top Row: Responsive Role Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-slate-500" />
                All Accounts
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {totalCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('employer')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'employer'
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Employers / HR
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === 'employer' ? 'bg-indigo-800 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                  {employerCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('candidate')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'candidate'
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                Candidates / Doctors
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === 'candidate' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                  {candidateCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Administrators
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === 'admin' ? 'bg-teal-900 text-white' : 'bg-teal-100 text-teal-800'}`}>
                  {adminCount}
                </span>
              </button>
            </div>

            {/* Quick helper tag */}
            <div className="text-xs text-slate-500 hidden xl:flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>One-click portal login &amp; clinical dossier</span>
            </div>
          </div>

          {/* Bottom Row: Search Box & Quick Status Filter Pills */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Box with explicit Search button */}
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
                  className="pl-10 pr-9 h-10 text-xs rounded-xl border-slate-300 focus-visible:ring-teal-500 bg-slate-50/50"
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
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-10 px-4 rounded-xl shadow-xs cursor-pointer"
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('hasResume')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  statusFilter === 'hasResume'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <FileText className="w-3 h-3" /> With CV
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('verified')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  statusFilter === 'verified'
                    ? 'bg-teal-600 text-white shadow-xs font-bold'
                    : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
                }`}
              >
                <ShieldCheck className="w-3 h-3" /> Verified
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === 'active'
                    ? 'bg-slate-800 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Active Only
              </button>
            </div>

          </div>
        </div>

        {/* Directory Listing */}
        {activeTab !== 'admin' ? (
          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {activeTab === 'all'
                    ? `Registered Users Directory (${filteredDirectory.length})`
                    : activeTab === 'employer'
                    ? `Healthcare Employers & Hospitals (${filteredDirectory.length})`
                    : `Clinical Doctors & Candidates (${filteredDirectory.length})`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click <strong className="text-indigo-700 font-bold">"View as HR"</strong> or <strong className="text-emerald-700 font-bold">"View as Candidate"</strong> to enter their portal with full permissions.
                </p>
              </div>
            </div>

            {loadingDirectory ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-9 w-9 border-3 border-teal-600 border-t-transparent"></div>
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
                  className="mt-3 text-xs"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600 font-bold">
                      <th className="py-3 px-4">User / Contact</th>
                      <th className="py-3 px-4">Role &amp; Organization</th>
                      <th className="py-3 px-4">Clinical Background / City</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions &amp; Impersonation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredDirectory.map((userItem) => {
                      const roleLower = String(userItem.role || '').toLowerCase();
                      const isCandidate = roleLower === 'candidate';
                      const isEmployer = roleLower === 'employer';
                      const isCurrentlyImpersonating = impersonatingId === userItem.id;
                      const isSpecialVIP = userItem.email === 'cricketloverayush9999@gmail.com';

                      return (
                        <tr
                          key={userItem.id}
                          className={`hover:bg-slate-50/90 transition-colors ${
                            isSpecialVIP ? 'bg-amber-50/40 border-l-4 border-l-amber-500' : ''
                          }`}
                        >
                          {/* User Avatar + Name + Contact */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3.5">
                              {userItem.profilePhotoUrl ? (
                                <img
                                  src={userItem.profilePhotoUrl}
                                  alt={userItem.name || 'User'}
                                  className="w-11 h-11 rounded-xl object-cover border-2 border-slate-200 shrink-0 shadow-xs"
                                />
                              ) : (
                                <div
                                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-extrabold text-sm uppercase shadow-xs shrink-0 ${
                                    isEmployer
                                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                      : isCandidate
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-sky-100 text-sky-800 border border-sky-200'
                                  }`}
                                >
                                  {userItem.name
                                    ? userItem.name.split(' ').slice(0, 2).map((n) => n[0]).join('')
                                    : 'U'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-extrabold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                                  <span className="truncate">{userItem.name || 'Unnamed Account'}</span>
                                  {isSpecialVIP && (
                                    <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] px-1.5 py-0">
                                      VIP Account
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-slate-600 font-mono mt-0.5 break-all flex items-center gap-1">
                                  <Mail size={11} className="text-slate-400 shrink-0" />
                                  <span>{userItem.email}</span>
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

                          {/* Role Badge & Organization */}
                          <td className="py-4 px-4">
                            {isEmployer && (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                  <Building2 className="w-3.5 h-3.5" /> Healthcare HR
                                </span>
                                {userItem.companyName ? (
                                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1 truncate max-w-[200px]">
                                    <span>🏥 {userItem.companyName}</span>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-400 italic">Hospital name not set</div>
                                )}
                              </div>
                            )}

                            {isCandidate && (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                  <Stethoscope className="w-3.5 h-3.5" /> Candidate / Doctor
                                </span>
                                {userItem.currentOrganization ? (
                                  <div className="text-xs font-medium text-slate-700 truncate max-w-[200px]">
                                    🏢 {userItem.currentOrganization}
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-400 italic">No hospital listed</div>
                                )}
                              </div>
                            )}

                            {!isEmployer && !isCandidate && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                <ShieldCheck className="w-3.5 h-3.5" /> System Admin
                              </span>
                            )}
                          </td>

                          {/* Profile & Location */}
                          <td className="py-4 px-4">
                            {isCandidate && (
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-slate-900">
                                  {[userItem.qualification, userItem.speciality].filter(Boolean).join(' • ') || 'Qualifications not added'}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                                  {userItem.yearsExperience != null && (
                                    <span className="font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px]">
                                      {userItem.yearsExperience} yrs exp
                                    </span>
                                  )}
                                  {[userItem.currentCity, userItem.state].filter(Boolean).join(', ') && (
                                    <span className="flex items-center gap-0.5 text-slate-600">
                                      <MapPin size={11} className="text-slate-400" />
                                      {[userItem.currentCity, userItem.state].filter(Boolean).join(', ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {isEmployer && (
                              <div className="space-y-1 text-xs text-slate-600">
                                <div className="flex items-center gap-1 text-slate-700 font-medium">
                                  <MapPin size={11} className="text-slate-400" />
                                  <span>{[userItem.city, userItem.state].filter(Boolean).join(', ') || 'Location not set'}</span>
                                </div>
                                {userItem.verificationStatus && (
                                  <span className="inline-block text-[10px] uppercase font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                                    {userItem.verificationStatus}
                                  </span>
                                )}
                              </div>
                            )}

                            {!isCandidate && !isEmployer && (
                              <span className="text-xs text-slate-400">System Administrator</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1 items-start">
                              <div className="flex items-center gap-1.5">
                                {userItem.isActive !== false ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    Inactive
                                  </span>
                                )}
                                {userItem.isVerified && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200" title="Account / Email Verified">
                                    Verified
                                  </span>
                                )}
                              </div>
                              {userItem.resumeUrl && (
                                <a
                                  href={userItem.resumeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                  title="Download candidate CV"
                                >
                                  <FileText size={10} /> CV Available
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Actions: View as HR / View as Candidate, Details, Toggle */}
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* VIEW AS USER / HR (IMPERSONATE) BUTTON */}
                              <Button
                                size="sm"
                                onClick={() => handleImpersonate(userItem)}
                                disabled={isCurrentlyImpersonating}
                                className={`h-8.5 px-3 text-xs font-bold gap-1.5 shadow-sm rounded-xl transition-all cursor-pointer ${
                                  isEmployer
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    : isCandidate
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-teal-700 hover:bg-teal-800 text-white'
                                }`}
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

                              {/* Full Profile Modal Trigger */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewFullProfile(userItem)}
                                className="h-8.5 px-3 text-xs font-bold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-xl cursor-pointer"
                                title="View complete clinical credentials, registration & CV"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                Details
                              </Button>

                              {/* Toggle active status */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleStatus(userItem)}
                                className={`h-8.5 w-8.5 p-0 rounded-xl cursor-pointer ${
                                  userItem.isActive !== false
                                    ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
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
          <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
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
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-8 font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Admin
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-teal-600 border-t-transparent"></div>
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
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600 font-bold">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredAdmins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{admin.name || 'N/A'}</span>
                            {isCurrentUser(admin) && (
                              <Badge className="bg-teal-100 text-teal-800 text-[10px] font-bold border-teal-200">
                                You
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-xs">{admin.email || 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-600 text-xs">{admin.phone || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
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
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-3.5 h-3.5 text-slate-600" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openPasswordDialog(admin)}
                              title="Reset Password"
                              className="h-8 w-8 p-0"
                            >
                              <Key className="w-3.5 h-3.5 text-slate-600" />
                            </Button>
                            {!isCurrentUser(admin) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(admin)}
                                className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-slate-200"
                                title="Delete Admin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

      </div>

      {/* FULL USER PROFILE / CV MODAL */}
      <Dialog open={!!viewingProfile} onOpenChange={(open) => { if (!open) setViewingProfile(null); }}>
        <DialogContent
          className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border border-slate-200 bg-white shadow-2xl"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 99999,
            maxHeight: 'min(90vh, 90dvh)',
            maxWidth: 'min(820px, 95vw)',
            overflowY: 'auto',
            margin: '0',
          }}
        >
          {viewingProfile && (() => {
            const u = viewingProfile.user || {};
            const isCandidate = String(u.role || '').toLowerCase() === 'candidate';
            const isEmployer = String(u.role || '').toLowerCase() === 'employer';
            const cp = viewingProfile.candidateProfile || viewingProfile.profile || {};
            const ep = viewingProfile.employerProfile || viewingProfile.employer || viewingProfile.profile || {};

            return (
              <div className="flex flex-col">
                {/* Header Banner */}
                <div className={`p-6 border-b ${
                  isCandidate 
                    ? 'bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white' 
                    : isEmployer
                    ? 'bg-gradient-to-r from-indigo-950 via-slate-900 to-teal-950 text-white'
                    : 'bg-gradient-to-r from-slate-900 to-teal-950 text-white'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {cp.profilePhotoUrl ? (
                        <img
                          src={cp.profilePhotoUrl}
                          alt={u.name || 'User'}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 shadow-md"
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-xl uppercase shadow-md ${
                          isCandidate ? 'bg-emerald-500 text-white' : isEmployer ? 'bg-indigo-500 text-white' : 'bg-teal-500 text-white'
                        }`}>
                          {u.name ? u.name.split(' ').slice(0, 2).map((n: string) => n[0]).join('') : 'U'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-extrabold text-white">
                            {u.name || 'User Account'}
                          </h3>
                          <Badge className={`text-[11px] font-bold uppercase tracking-wider ${
                            isCandidate ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                          }`}>
                            {isCandidate ? 'Doctor / Candidate' : isEmployer ? 'Healthcare HR / Employer' : 'Administrator'}
                          </Badge>
                          {u.isVerified && (
                            <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/40 text-[10px]">
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-1 flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1.5 font-mono">
                            <Mail className="w-3.5 h-3.5 text-teal-400" />
                            <a href={`mailto:${u.email}`} className="hover:underline hover:text-white">{u.email}</a>
                          </span>
                          {u.phone && (
                            <span className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-teal-400" />
                              <a href={`tel:${u.phone}`} className="hover:underline hover:text-white">{u.phone}</a>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setViewingProfile(null);
                          handleImpersonate(u);
                        }}
                        className={`h-9 text-xs font-bold gap-2 px-4 shadow-lg rounded-xl cursor-pointer ${
                          isCandidate 
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold' 
                            : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                        }`}
                      >
                        <Eye className="w-4 h-4" />
                        {isEmployer ? 'View as HR' : isCandidate ? 'View as Doctor' : 'View Portal'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-160px)]">
                  {/* If Candidate */}
                  {isCandidate && (
                    <>
                      {/* Clinical Credentials Card */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                          <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-emerald-600" /> Clinical Qualifications &amp; Specialization
                          </h4>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                            {cp.yearsExperience != null ? `${cp.yearsExperience} Years Clinical Practice` : 'Experience Not Specified'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs pt-1">
                          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Medical Domain</span>
                            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{cp.medicalCategory || 'General Medicine'}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Degree / Qualification</span>
                            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{cp.qualification || 'MBBS'}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Clinical Specialization</span>
                            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{cp.speciality || cp.specialization || 'Clinical Practitioner'}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Hospital / Practice</span>
                            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{cp.currentOrganization || 'Not specified'}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Current City / State</span>
                            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                              {[cp.currentCity || cp.city, cp.state].filter(Boolean).join(', ') || 'Not specified'}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Preferred Job Role</span>
                            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{cp.preferredJobRole || 'Any Clinical Role'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Professional Medical Council Registration */}
                      <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                        <div className="flex items-center justify-between border-b border-indigo-200/60 pb-2.5">
                          <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-indigo-600" /> Medical Council Registration Details
                          </h4>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                            Official Registry
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                          <div>
                            <span className="text-indigo-400 block text-[10px] uppercase font-semibold">Council Body</span>
                            <span className="font-bold text-indigo-950">{cp.registrationCouncil || '—'}</span>
                          </div>
                          <div>
                            <span className="text-indigo-400 block text-[10px] uppercase font-semibold">Registration Number</span>
                            <span className="font-bold text-indigo-950 font-mono">{cp.registrationNumber || '—'}</span>
                          </div>
                          <div>
                            <span className="text-indigo-400 block text-[10px] uppercase font-semibold">Registration State</span>
                            <span className="font-bold text-indigo-950">{cp.registrationState || '—'}</span>
                          </div>
                          <div>
                            <span className="text-indigo-400 block text-[10px] uppercase font-semibold">Year of Registration</span>
                            <span className="font-bold text-indigo-950">{cp.registrationYear || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Clinical Skills */}
                      {cp.skills && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Core Procedures &amp; Clinical Skills
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {String(cp.skills).split(',').map((skill: string, idx: number) => (
                              <span key={idx} className="bg-teal-50 text-teal-800 border border-teal-200 font-semibold px-2.5 py-1 rounded-lg text-xs">
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Profile Summary / CV Intro */}
                      {cp.profileSummary && (
                        <div className="space-y-1.5">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Candidate Bio &amp; Professional Summary
                          </h4>
                          <p className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans">
                            {cp.profileSummary}
                          </p>
                        </div>
                      )}

                      {/* Resume / CV Document */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-emerald-950">Official Candidate CV / Resume</div>
                            <div className="text-xs text-emerald-700 font-mono">
                              {cp.resumeFileName || (cp.resumeUrl ? 'Doctor_Resume.pdf' : 'No CV document uploaded yet')}
                            </div>
                          </div>
                        </div>
                        {cp.resumeUrl ? (
                          <a
                            href={cp.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                          >
                            <Download size={14} /> Download Official CV
                          </a>
                        ) : (
                          <span className="text-xs font-medium text-slate-500 italic">No CV Attached</span>
                        )}
                      </div>
                    </>
                  )}

                  {/* If Employer */}
                  {isEmployer && (
                    <div className="space-y-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-indigo-600" /> Healthcare Hospital / Clinic Profile
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Organization / Hospital Name</span>
                            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{ep.companyName || u.name || '—'}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Facility Type</span>
                            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{ep.companyType || 'Hospital'}</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
                            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                              {[ep.address, ep.city, ep.state, ep.pincode].filter(Boolean).join(', ') || '—'}
                            </span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">Verification Status</span>
                            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                              {ep.isVerified ? 'Verified Healthcare Provider' : 'Pending Verification'}
                            </span>
                          </div>
                          {ep.website && (
                            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs sm:col-span-2">
                              <span className="text-slate-400 block text-[10px] uppercase font-bold">Official Website</span>
                              <a href={ep.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline flex items-center gap-1 mt-0.5">
                                {ep.website} <ExternalLink size={12} />
                              </a>
                            </div>
                          )}
                        </div>

                        {ep.companyDescription && (
                          <div className="pt-2">
                            <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">About Facility</span>
                            <p className="p-3 bg-white rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                              {ep.companyDescription}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* If Admin */}
                  {!isCandidate && !isEmployer && (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200">
                      <ShieldCheck className="w-12 h-12 text-teal-600 mx-auto mb-2" />
                      <h4 className="text-base font-bold text-slate-900">System Administrator Account</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        This user holds administrative authority to manage platform jobs, user accounts, and system configuration.
                      </p>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingProfile(null)}
                    className="text-xs font-semibold text-slate-600 cursor-pointer"
                  >
                    Close
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      setViewingProfile(null);
                      handleImpersonate(u);
                    }}
                    className={`gap-1.5 text-xs font-bold shadow-md cursor-pointer ${
                      isCandidate ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    {isEmployer ? 'Enter Employer Portal' : isCandidate ? 'Enter Candidate Portal' : 'View Portal'}
                  </Button>
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
