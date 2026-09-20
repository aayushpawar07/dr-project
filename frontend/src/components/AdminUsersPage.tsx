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

  // Fetch Directory or Admins whenever activeTab or token changes
  useEffect(() => {
    if (!token) return;
    if (activeTab === 'admin') {
      fetchAdmins();
    } else {
      loadDirectory(activeTab);
    }
  }, [token, activeTab]);

  const loadDirectory = async (roleFilter?: string, query?: string) => {
    try {
      setLoadingDirectory(true);
      setError(null);
      const roleParam = roleFilter === 'all' || !roleFilter ? undefined : roleFilter.toUpperCase();
      const res = await fetchUserDirectory({
        role: roleParam,
        search: (query !== undefined ? query : searchTerm) || undefined,
      }, token);
      setDirectoryUsers(res.users || []);
    } catch (err: any) {
      console.error('Error fetching directory:', err);
      setError(err.message || 'Failed to load user directory');
    } finally {
      setLoadingDirectory(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

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
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          const text = await response.text();
          throw new Error(text || `Failed to fetch admins (${response.status})`);
        }
        throw new Error(errorData.message || errorData.error || `Failed to fetch admins (${response.status})`);
      }

      const data = await response.json();
      if (!data || !Array.isArray(data)) {
        setAdmins([]);
        return;
      }
      
      const mappedAdmins = data.map((user: any) => ({
        id: user.id ? (typeof user.id === 'string' ? user.id : String(user.id)) : '',
        name: (user.name !== null && user.name !== undefined) ? String(user.name).trim() : 'N/A',
        email: (user.email !== null && user.email !== undefined) ? String(user.email).trim() : 'N/A',
        phone: (user.phone !== null && user.phone !== undefined) ? String(user.phone).trim() : 'N/A',
        role: user.role || 'ADMIN',
        isActive: user.isActive !== undefined && user.isActive !== null ? Boolean(user.isActive) : true,
        isVerified: user.isVerified !== undefined && user.isVerified !== null ? Boolean(user.isVerified) : false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));
      setAdmins(mappedAdmins);
    } catch (err: any) {
      console.error('Error fetching admins:', err);
      setError(err.message || 'Failed to load admins');
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  // Impersonate User / HR / Employer
  const handleImpersonate = async (targetUser: { id: string; name?: string; email?: string; role?: string }) => {
    try {
      setImpersonatingId(targetUser.id);
      const res = await impersonateApi(targetUser.id, token);
      authImpersonate(res.user, res.token);
      toast.success(`Switched view to ${res.user.name || res.user.email} (${res.user.role})`);
      
      if (res.user.role?.toLowerCase() === 'employer') {
        onNavigate('dashboard/employer');
      } else if (res.user.role?.toLowerCase() === 'candidate') {
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
      await toggleUserStatus(userItem.id, nextStatus, token);
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
  const handleViewFullProfile = async (userId: string) => {
    try {
      setLoadingProfile(true);
      const profileData = await fetchUserFullProfile(userId, token);
      setViewingProfile(profileData);
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
        let errorData;
        try { errorData = await response.json(); } catch {
          const text = await response.text();
          throw new Error(text || `Failed to update admin (${response.status})`);
        }
        throw new Error(errorData.message || errorData.error || 'Failed to update admin');
      }

      const result = await response.json();
      setSuccessMessage(result.message || 'Admin updated successfully');
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
        let errorData;
        try { errorData = await response.json(); } catch { errorData = {}; }
        throw new Error(errorData.message || errorData.error || 'Failed to delete admin');
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
        let errorData;
        try { errorData = await response.json(); } catch {
          const text = await response.text();
          throw new Error(text || `Failed to reset password (${response.status})`);
        }
        throw new Error(errorData.message || errorData.error || 'Failed to reset password');
      }

      const result = await response.json();
      setSuccessMessage(result.message || 'Password reset successfully');
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

  // Client-side search filters
  const filteredAdmins = admins.filter(admin =>
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDirectory = directoryUsers.filter(user => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (user.name && user.name.toLowerCase().includes(term)) ||
      (user.email && user.email.toLowerCase().includes(term)) ||
      (user.phone && user.phone.includes(term)) ||
      (user.organization && user.organization.toLowerCase().includes(term)) ||
      (user.qualification && user.qualification.toLowerCase().includes(term)) ||
      (user.specialization && user.specialization.toLowerCase().includes(term)) ||
      (user.location && user.location.toLowerCase().includes(term))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => onNavigate('dashboard/admin')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-700 hover:text-teal-900 transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
                <Users className="w-5 h-5" />
              </div>
              User Directory & Impersonation
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Explore clinical candidate profiles, healthcare employer accounts, and switch to view the platform as any user with one click.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'admin') fetchAdmins();
                else loadDirectory(activeTab);
              }}
              disabled={loading || loadingDirectory}
              className="h-10 text-slate-700 hover:bg-slate-100"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading || loadingDirectory ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              className="h-10 bg-teal-700 hover:bg-teal-800 text-white shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Admin
            </Button>
          </div>
        </div>

        {/* Notifications / Alerts */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Metric Summary Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            onClick={() => setActiveTab('all')}
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
              activeTab === 'all'
                ? 'border-teal-600 ring-2 ring-teal-500/20 bg-white shadow-md'
                : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">All Accounts</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{directoryUsers.length || '—'}</div>
            <div className="text-xs text-slate-400 mt-1">Full platform directory</div>
          </Card>

          <Card
            onClick={() => setActiveTab('employer')}
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
              activeTab === 'employer'
                ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-white shadow-md'
                : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employers / HR</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              {directoryUsers.filter(u => u.role === 'EMPLOYER').length || '—'}
            </div>
            <div className="text-xs text-indigo-600 font-medium mt-1">Hospitals & Clinics</div>
          </Card>

          <Card
            onClick={() => setActiveTab('candidate')}
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
              activeTab === 'candidate'
                ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-white shadow-md'
                : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidates / Doctors</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              {directoryUsers.filter(u => u.role === 'CANDIDATE').length || '—'}
            </div>
            <div className="text-xs text-emerald-600 font-medium mt-1">Clinical talent pool</div>
          </Card>

          <Card
            onClick={() => setActiveTab('admin')}
            className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
              activeTab === 'admin'
                ? 'border-sky-600 ring-2 ring-sky-500/20 bg-white shadow-md'
                : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Administrators</span>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{admins.length || '—'}</div>
            <div className="text-xs text-sky-600 font-medium mt-1">Super & Staff access</div>
          </Card>
        </div>

        {/* Search & Tabs Toolbar */}
        <Card className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200/80 overflow-x-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Accounts
              </button>

              <button
                onClick={() => setActiveTab('employer')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'employer'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Healthcare Employers
              </button>

              <button
                onClick={() => setActiveTab('candidate')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'candidate'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                Clinical Candidates
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Administrators
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder={
                  activeTab === 'admin'
                    ? "Search admins by name or email..."
                    : "Search name, email, specialization, org..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs rounded-lg border-slate-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

          </div>
        </Card>

        {/* Content Area */}
        {activeTab !== 'admin' ? (
          /* Directory Users Table */
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {activeTab === 'all'
                    ? `Platform Directory (${filteredDirectory.length})`
                    : activeTab === 'employer'
                    ? `Healthcare Employers & Hospitals (${filteredDirectory.length})`
                    : `Clinical Candidates & Doctors (${filteredDirectory.length})`}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click <strong className="text-indigo-700 font-semibold">"View as HR / User"</strong> to seamlessly log in and inspect their portal.
                </p>
              </div>
            </div>

            {loadingDirectory ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                <p className="mt-3 text-sm text-slate-500">Loading directory accounts...</p>
              </div>
            ) : filteredDirectory.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-medium text-sm">No accounts found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or switch tabs</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Account Type</th>
                      <th className="py-3 px-4">Profile & Background</th>
                      <th className="py-3 px-4">CV Status</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredDirectory.map((userItem) => {
                      const isCandidate = userItem.role === 'CANDIDATE';
                      const isEmployer = userItem.role === 'EMPLOYER';
                      const isCurrentlyImpersonatingThis = impersonatingId === userItem.id;

                      return (
                        <tr
                          key={userItem.id}
                          className="hover:bg-slate-50/75 transition-colors group"
                        >
                          {/* User Avatar + Name + Contact */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-sm ${
                                  isEmployer
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : isCandidate
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-sky-100 text-sky-700'
                                }`}
                              >
                                {userItem.name
                                  ? userItem.name
                                      .split(' ')
                                      .slice(0, 2)
                                      .map((n) => n[0])
                                      .join('')
                                  : 'U'}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900 leading-tight">
                                  {userItem.name || 'Unnamed User'}
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span>{userItem.email}</span>
                                  {userItem.phone && (
                                    <>
                                      <span>•</span>
                                      <span>{userItem.phone}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            {isEmployer && (
                              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-medium gap-1 hover:bg-indigo-100">
                                <Building2 className="w-3 h-3" /> Healthcare HR
                              </Badge>
                            )}
                            {isCandidate && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-medium gap-1 hover:bg-emerald-100">
                                <Stethoscope className="w-3 h-3" /> Clinical Candidate
                              </Badge>
                            )}
                            {!isEmployer && !isCandidate && (
                              <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-xs font-medium gap-1 hover:bg-sky-100">
                                <ShieldCheck className="w-3 h-3" /> Admin Staff
                              </Badge>
                            )}
                          </td>

                          {/* Profile & Background */}
                          <td className="py-3.5 px-4">
                            {isCandidate && (
                              <div className="space-y-0.5">
                                <div className="text-xs font-medium text-slate-800">
                                  {userItem.qualification || 'Qualification not set'}
                                  {userItem.specialization ? ` • ${userItem.specialization}` : ''}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                  {userItem.experienceYears !== undefined && userItem.experienceYears > 0 && (
                                    <span>{userItem.experienceYears} yrs exp</span>
                                  )}
                                  {userItem.location && <span>📍 {userItem.location}</span>}
                                  {userItem.organization && <span>🏢 {userItem.organization}</span>}
                                </div>
                              </div>
                            )}

                            {isEmployer && (
                              <div className="space-y-0.5">
                                <div className="text-xs font-medium text-slate-800">
                                  {userItem.organization || 'Organization info pending'}
                                </div>
                                {userItem.location && (
                                  <div className="text-[11px] text-slate-500">📍 {userItem.location}</div>
                                )}
                              </div>
                            )}

                            {!isCandidate && !isEmployer && (
                              <span className="text-xs text-slate-400">System Admin</span>
                            )}
                          </td>

                          {/* CV Status */}
                          <td className="py-3.5 px-4">
                            {isCandidate ? (
                              userItem.hasResume ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold gap-1">
                                  <FileText className="w-3 h-3" /> CV Available
                                </Badge>
                              ) : (
                                <span className="text-xs text-slate-400">No CV</span>
                              )
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              {userItem.isActive !== false ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                  Inactive
                                </span>
                              )}
                              {userItem.isVerified && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                                  Verified
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions: Impersonate, Full Details, Toggle */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* View as User (Impersonate) */}
                              <Button
                                size="sm"
                                onClick={() => handleImpersonate(userItem)}
                                disabled={isCurrentlyImpersonatingThis}
                                className={`h-8 text-xs font-medium gap-1.5 shadow-sm ${
                                  isEmployer
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                                title={`Switch to view dashboard as ${userItem.name || 'this user'}`}
                              >
                                {isCurrentlyImpersonatingThis ? (
                                  <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                                <span>{isEmployer ? 'View as HR' : isCandidate ? 'View as Candidate' : 'View as User'}</span>
                              </Button>

                              {/* Full Profile modal trigger */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewFullProfile(userItem.id)}
                                className="h-8 text-xs font-medium gap-1 border-slate-200 text-slate-700 hover:bg-slate-100"
                                title="View complete clinical or organization details"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-500" />
                                Details
                              </Button>

                              {/* Toggle active switch */}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleStatus(userItem)}
                                className={`h-8 w-8 p-0 rounded-lg ${
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
          <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Administrator Accounts ({filteredAdmins.length})</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Accounts with privileged moderation and configuration access to the platform.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Admin
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                <p className="mt-3 text-sm text-slate-500">Loading administrators...</p>
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-medium text-sm">No administrators found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
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
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{admin.name || 'N/A'}</span>
                            {isCurrentUser(admin) && (
                              <Badge className="bg-teal-100 text-teal-800 text-[10px] font-semibold border-teal-200">
                                You
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{admin.email || 'N/A'}</td>
                        <td className="py-3 px-4 text-slate-600">{admin.phone || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {admin.isActive !== false ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                Inactive
                              </span>
                            )}
                          </div>
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
        <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
          {viewingProfile && (
            <div>
              <DialogHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      {viewingProfile.user?.name || 'User Profile'}
                      <Badge className="text-xs uppercase tracking-wider bg-slate-100 text-slate-700">
                        {viewingProfile.user?.role}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-1">
                      {viewingProfile.user?.email} {viewingProfile.user?.phone ? `• ${viewingProfile.user?.phone}` : ''}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="py-5 space-y-5">
                {/* If candidate clinical profile */}
                {viewingProfile.user?.role === 'CANDIDATE' && viewingProfile.profile && (
                  <>
                    {/* Clinical Credentials */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <GraduationCap className="w-4 h-4 text-emerald-600" /> Clinical Qualifications & Background
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">Medical Category</span>
                          <span className="font-semibold text-slate-800">{viewingProfile.profile.medicalCategory || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Qualification</span>
                          <span className="font-semibold text-slate-800">{viewingProfile.profile.qualification || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Specialization</span>
                          <span className="font-semibold text-slate-800">{viewingProfile.profile.specialization || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Clinical Experience</span>
                          <span className="font-semibold text-slate-800">
                            {viewingProfile.profile.experienceYears !== undefined
                              ? `${viewingProfile.profile.experienceYears} Years`
                              : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Current Organization</span>
                          <span className="font-semibold text-slate-800">{viewingProfile.profile.currentOrganization || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Current Location</span>
                          <span className="font-semibold text-slate-800">
                            {[viewingProfile.profile.city, viewingProfile.profile.state].filter(Boolean).join(', ') || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Career Preferences */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-indigo-600" /> Career Preferences
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">Preferred Job Role</span>
                          <span className="font-semibold text-slate-800">{viewingProfile.profile.preferredJobRole || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Preferred Location</span>
                          <span className="font-semibold text-slate-800">{viewingProfile.profile.preferredLocation || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Medical Registration */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-sky-600" /> Professional Council Registration
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">Registration Council</span>
                          <span className="font-semibold text-slate-800">{viewingProfile.profile.registrationCouncil || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Registration Number</span>
                          <span className="font-semibold text-slate-800">{viewingProfile.profile.registrationNumber || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Registration State</span>
                          <span className="font-semibold text-slate-800">{viewingProfile.profile.registrationState || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Registration Year</span>
                          <span className="font-semibold text-slate-800">{viewingProfile.profile.registrationYear || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Skills */}
                    {viewingProfile.profile.skills && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Key Clinical Skills & Competencies
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {viewingProfile.profile.skills.split(',').map((skill: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {skill.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CV Download / Preview */}
                    {viewingProfile.profile.resumeUrl ? (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-emerald-900">
                              {viewingProfile.profile.resumeFileName || 'Clinical CV Document'}
                            </div>
                            <div className="text-[11px] text-emerald-700">Uploaded candidate resume</div>
                          </div>
                        </div>
                        <a
                          href={viewingProfile.profile.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" /> Download CV
                        </a>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                        No CV document uploaded by this candidate yet.
                      </div>
                    )}
                  </>
                )}

                {/* If employer profile */}
                {viewingProfile.user?.role === 'EMPLOYER' && viewingProfile.profile && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600" /> Hospital / Healthcare Organization
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block">Organization Name</span>
                        <span className="font-semibold text-slate-800">{viewingProfile.profile.companyName || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Organization Type</span>
                        <span className="font-semibold text-slate-800">{viewingProfile.profile.companyType || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Location</span>
                        <span className="font-semibold text-slate-800">
                          {[viewingProfile.profile.city, viewingProfile.profile.state].filter(Boolean).join(', ') || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Verification Status</span>
                        <span className="font-semibold text-slate-800">
                          {viewingProfile.profile.isVerified ? 'Verified Hospital' : 'Pending Verification'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="border-t border-slate-100 pt-4 flex items-center justify-between sm:justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingProfile(null)}
                >
                  Close
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    const u = viewingProfile.user;
                    setViewingProfile(null);
                    handleImpersonate(u);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs font-semibold shadow-sm"
                >
                  <Eye className="w-4 h-4" /> View as this User
                </Button>
              </DialogFooter>
            </div>
          )}
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
              <Button type="submit" disabled={formLoading} className="bg-teal-700 hover:bg-teal-800 text-white">
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
              <Button type="submit" disabled={formLoading} className="bg-teal-700 hover:bg-teal-800 text-white">
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
              <Button type="submit" disabled={formLoading} className="bg-teal-700 hover:bg-teal-800 text-white">
                {formLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
