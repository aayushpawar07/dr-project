// AI assisted development
import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Edit, Trash2, Key, Mail, Phone, User } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useAuth } from '../contexts/AuthContext';

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
  const { token, user: currentUser } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Fetch admins
  useEffect(() => {
    if (token) {
      fetchAdmins();
    }
  }, [token]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      // Check if backend is reachable
      const apiUrl = `${API_BASE}/admin/users?t=${Date.now()}`;
      console.log('Fetching admins from:', apiUrl);
      console.log('Using token:', token ? 'Present' : 'Missing');

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        credentials: 'include',
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please login again.');
        }
        if (response.status === 403) {
          throw new Error('Access denied. Admin role required.');
        }
        if (response.status === 404) {
          throw new Error('API endpoint not found. Please check if backend server is running.');
        }
        if (response.status === 0 || response.status === 500) {
          throw new Error('Backend server is not reachable. Please ensure the backend is running on port 8081.');
        }
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          const text = await response.text();
          throw new Error(text || `Failed to fetch admins (${response.status} ${response.statusText})`);
        }
        throw new Error(errorData.message || errorData.error || `Failed to fetch admins (${response.status})`);
      }

      const data = await response.json();
      console.log('Fetched admins data:', data); // Debug log
      
      if (!data || !Array.isArray(data)) {
        console.warn('Invalid response format, expected array but got:', typeof data);
        setAdmins([]);
        setError('Invalid response format from server');
        return;
      }
      
      // Map backend AdminUserResponse to AdminUser interface
      const mappedAdmins = data.map((user: any) => {
        // Handle UUID conversion - backend returns UUID as string in JSON
        const adminId = user.id ? (typeof user.id === 'string' ? user.id : String(user.id)) : '';
        
        // Ensure all fields are properly extracted - handle null/undefined
        const adminName = (user.name !== null && user.name !== undefined) ? String(user.name).trim() : '';
        const adminEmail = (user.email !== null && user.email !== undefined) ? String(user.email).trim() : '';
        const adminPhone = (user.phone !== null && user.phone !== undefined) ? String(user.phone).trim() : '';
        
        const mapped = {
          id: adminId,
          name: adminName || 'N/A',
          email: adminEmail || 'N/A',
          phone: adminPhone || 'N/A',
          role: user.role || 'ADMIN',
          isActive: user.isActive !== undefined && user.isActive !== null ? Boolean(user.isActive) : true,
          isVerified: user.isVerified !== undefined && user.isVerified !== null ? Boolean(user.isVerified) : false,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        };
        console.log('Raw user from API:', user); // Debug: see what backend sends
        console.log('Mapped admin:', mapped); // Debug: see mapped result
        return mapped;
      });
      console.log('Total mapped admins:', mappedAdmins.length); // Debug log
      setAdmins(mappedAdmins);
      setError(null); // Clear any previous errors
    } catch (err: any) {
      console.error('Error fetching admins:', err);
      const errorMessage = err.message || 'Failed to load admins. Please check if backend server is running.';
      setError(errorMessage);
      setAdmins([]); // Clear admins on error
    } finally {
      setLoading(false);
    }
  };

  const filteredAdmins = admins.filter(admin =>
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);

    try {
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      console.log('Creating admin with data:', { ...formData, password: '***' });
      const response = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      console.log('Create admin response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          const text = await response.text();
          throw new Error(text || `Failed to create admin (${response.status})`);
        }
        let errorMessage = 'Failed to create admin';
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.errors) {
          const firstError = Object.values(errorData.errors)[0];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0] as string;
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Admin created successfully:', result);
      setSuccessMessage(result.message || 'Admin created successfully');
      setIsAddDialogOpen(false);
      setFormData({ name: '', email: '', phone: '', password: '' });
      setError(null);
      // Refresh the admin list
      await fetchAdmins();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error creating admin:', err);
      setError(err.message || 'Failed to create admin. Please check if backend server is running.');
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
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      };

      console.log('Updating admin:', selectedAdmin.id, 'with data:', updateData);
      const response = await fetch(`${API_BASE}/admin/users/${selectedAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      console.log('Update admin response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          const text = await response.text();
          throw new Error(text || `Failed to update admin (${response.status})`);
        }
        let errorMessage = 'Failed to update admin';
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.errors) {
          const firstError = Object.values(errorData.errors)[0];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0] as string;
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Edit successful, result:', result);
      setSuccessMessage(result.message || 'Admin updated successfully');
      setIsEditDialogOpen(false);
      setSelectedAdmin(null);
      setFormData({ name: '', email: '', phone: '', password: '' });
      setError(null);
      
      // Refresh the admin list
      console.log('Refreshing admin list after update...');
      await fetchAdmins();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error updating admin:', err);
      setError(err.message || 'Failed to update admin. Please check if backend server is running.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAdmin = async () => {
    console.log('🚀 handleDeleteAdmin called');
    console.log('Selected admin:', selectedAdmin);
    console.log('Token available:', !!token);
    
    if (!selectedAdmin) {
      console.error('❌ No admin selected for deletion');
      setError('No admin selected');
      return;
    }

    if (!token) {
      console.error('❌ No authentication token');
      setError('Authentication token not found. Please login again.');
      return;
    }

    console.log('✅ Starting delete operation for admin:', selectedAdmin);
    setFormLoading(true);
    setError(null);

    // Store admin ID for optimistic update
    const adminIdToDelete = selectedAdmin.id;
    const adminNameToDelete = selectedAdmin.name;

    try {
      const deleteUrl = `${API_BASE}/admin/users/${adminIdToDelete}`;
      console.log('🌐 Delete URL:', deleteUrl);
      console.log('🔑 Token present:', !!token);
      console.log('👤 Admin ID to delete:', adminIdToDelete);

      // Optimistic update: Remove from UI immediately
      console.log('🔄 Optimistically removing admin from UI...');
      setAdmins(prevAdmins => prevAdmins.filter(admin => admin.id !== adminIdToDelete));

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('📡 Delete response status:', response.status);
      console.log('✅ Delete response ok:', response.ok);

      if (!response.ok) {
        // Revert optimistic update on error
        console.log('❌ Delete failed, reverting optimistic update...');
        await fetchAdmins(); // Reload from server
        
        let errorData;
        try {
          const responseText = await response.text();
          console.log('📄 Error response text:', responseText);
          errorData = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
          console.error('❌ Failed to parse error response:', e);
          errorData = { message: `Server error: ${response.status} ${response.statusText}` };
        }
        console.error('❌ Delete error response:', errorData);
        let errorMessage = 'Failed to delete admin';
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        const responseText = await response.text();
        console.log('📄 Success response text:', responseText);
        result = responseText ? JSON.parse(responseText) : { message: 'Admin deleted successfully' };
      } catch (e) {
        // Some DELETE endpoints return empty body
        console.log('⚠️ Empty response body, using default success message');
        result = { message: 'Admin deleted successfully' };
      }
      
      console.log('✅ Delete successful, result:', result);
      setSuccessMessage(`${adminNameToDelete} deleted successfully`);
      
      // Close dialog and reset state
      setIsDeleteDialogOpen(false);
      setSelectedAdmin(null);
      setError(null);
      
      // Refresh the admin list to ensure consistency
      console.log('🔄 Refreshing admin list after deletion to ensure consistency...');
      await fetchAdmins();
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('❌ Delete operation failed:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      const errorMessage = err.message || 'Failed to delete admin. Please check if backend server is running on port 8081.';
      setError(errorMessage);
      // Don't close dialog on error so user can see the error message
    } finally {
      setFormLoading(false);
      console.log('🏁 Delete operation finished, formLoading set to false');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    if (!token) {
      setError('Authentication token not found. Please login again.');
      return;
    }

    setFormLoading(true);
    setError(null);

    try {
      console.log('Resetting password for admin:', selectedAdmin.id);
      const response = await fetch(`${API_BASE}/admin/users/${selectedAdmin.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
      });
      
      console.log('Password reset response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          const text = await response.text();
          throw new Error(text || `Failed to reset password (${response.status})`);
        }
        let errorMessage = 'Failed to reset password';
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.errors) {
          const firstError = Object.values(errorData.errors)[0];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = firstError[0] as string;
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Password reset successful, result:', result);
      setSuccessMessage(result.message || 'Password reset successfully');
      setIsPasswordDialogOpen(false);
      setSelectedAdmin(null);
      setNewPassword('');
      setError(null);
      
      // Refresh the admin list
      console.log('Refreshing admin list after password reset...');
      await fetchAdmins();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError(err.message || 'Failed to reset password. Please check if backend server is running.');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditDialog = (admin: AdminUser) => {
    try {
      console.log('Opening edit dialog for:', admin);
      setSelectedAdmin(admin);
      setFormData({
        name: admin.name || '',
        email: admin.email || '',
        phone: admin.phone || '',
        password: ''
      });
      setIsEditDialogOpen(true);
      setError(null);
    } catch (err: any) {
      console.error('Error opening edit dialog:', err);
      setError('Failed to open edit dialog');
    }
  };

  const openDeleteDialog = (admin: AdminUser) => {
    try {
      console.log('Opening delete dialog for:', admin);
      setSelectedAdmin(admin);
      setIsDeleteDialogOpen(true);
      setError(null);
    } catch (err: any) {
      console.error('Error opening delete dialog:', err);
      setError('Failed to open delete dialog');
    }
  };

  const openPasswordDialog = (admin: AdminUser) => {
    try {
      console.log('Opening password dialog for:', admin);
      setSelectedAdmin(admin);
      setNewPassword('');
      setIsPasswordDialogOpen(true);
      setError(null);
    } catch (err: any) {
      console.error('Error opening password dialog:', err);
      setError('Failed to open password dialog');
    }
  };

  const isCurrentUser = (admin: AdminUser) => {
    return currentUser?.id === admin.id || String(currentUser?.id) === String(admin.id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl text-gray-900 mb-2">Admin Management</h1>
            <p className="text-gray-600">Manage admin accounts</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Admin
            </Button>
          </div>
        </div>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 border border-green-200 rounded text-green-700">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {/* Search */}
        <Card className="p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search admins by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Admins Table */}
        <Card>
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Admins ({filteredAdmins.length})</h2>
            </div>
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-600">Loading admins...</p>
              </div>
            ) : error && admins.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-2">{error}</p>
                <Button 
                  onClick={() => fetchAdmins()} 
                  variant="outline"
                  size="sm"
                >
                  Retry
                </Button>
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No admins found matching your search' : 'No admins found'}
              </div>
            ) : (
              <div className="admin-users-table-scroll w-full overflow-x-auto" style={{ maxWidth: '100%' }}>
                <table className="admin-users-table w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-semibold whitespace-nowrap">Name</th>
                      <th className="text-left p-3 font-semibold whitespace-nowrap">Email</th>
                      <th className="text-left p-3 font-semibold whitespace-nowrap">Phone</th>
                      <th className="text-left p-3 font-semibold whitespace-nowrap">Status</th>
                      <th className="text-left p-3 font-semibold whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdmins.map((admin, index) => (
                      <tr key={admin.id || `admin-${index}`} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium" data-cell="title">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{admin.name || 'N/A'}</span>
                            {isCurrentUser(admin) && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs whitespace-nowrap">You</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-gray-700 break-words" data-label="Email">
                          <span className="break-all">{admin.email || 'N/A'}</span>
                        </td>
                        <td className="p-3 text-gray-700" data-label="Phone">{admin.phone || 'N/A'}</td>
                        <td className="p-3" data-label="Status">
                          <div className="flex gap-2 flex-wrap">
                            {admin.isActive !== false ? (
                              <Badge className="bg-green-100 text-green-800 whitespace-nowrap">Active</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800 whitespace-nowrap">Inactive</Badge>
                            )}
                            {admin.isVerified !== false && (
                              <Badge className="bg-blue-100 text-blue-800 whitespace-nowrap">Verified</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3" data-cell="actions">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('✅ Edit button clicked for:', admin);
                                try {
                                  openEditDialog(admin);
                                } catch (error) {
                                  console.error('❌ Error opening edit dialog:', error);
                                }
                              }}
                              title="Edit Admin"
                              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('✅ Password reset button clicked for:', admin);
                                try {
                                  openPasswordDialog(admin);
                                } catch (error) {
                                  console.error('❌ Error opening password dialog:', error);
                                }
                              }}
                              title="Reset Password"
                              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                            >
                              <Key className="w-4 h-4" />
                            </Button>
                            {!isCurrentUser(admin) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('✅ Delete button clicked for:', admin);
                                  try {
                                    openDeleteDialog(admin);
                                  } catch (error) {
                                    console.error('❌ Error opening delete dialog:', error);
                                  }
                                }}
                                className="text-red-600 hover:text-red-700"
                                title="Delete Admin"
                                style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                              >
                                <Trash2 className="w-4 h-4" />
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
          </div>
        </Card>

        {/* Add Admin Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Admin</DialogTitle>
              <DialogDescription>
                Create a new admin account. The admin will be able to login immediately.
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
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setFormData({ name: '', email: '', phone: '', password: '' });
                    setError(null);
                  }}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading}>
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
              <DialogDescription>
                Update admin information.
              </DialogDescription>
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
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedAdmin(null);
                    setFormData({ name: '', email: '', phone: '', password: '' });
                    setError(null);
                  }}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? 'Updating...' : 'Update Admin'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Admin Dialog */}
        <Dialog 
          open={isDeleteDialogOpen} 
          onOpenChange={(open) => {
            // Only allow closing if not loading
            if (!formLoading) {
              setIsDeleteDialogOpen(open);
              if (!open) {
                setSelectedAdmin(null);
                setError(null);
              }
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Admin</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{selectedAdmin?.name}</strong> ({selectedAdmin?.email})? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-100 border border-green-200 rounded text-green-700 text-sm">
                {successMessage}
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!formLoading) {
                    setIsDeleteDialogOpen(false);
                    setSelectedAdmin(null);
                    setError(null);
                  }
                }}
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  console.log('🗑️ Delete button clicked in dialog for:', selectedAdmin);
                  console.log('Selected admin ID:', selectedAdmin?.id);
                  console.log('Token available:', !!token);
                  console.log('Form loading state:', formLoading);
                  
                  if (!selectedAdmin) {
                    console.error('❌ No admin selected');
                    setError('No admin selected for deletion');
                    return;
                  }
                  
                  if (!token) {
                    console.error('❌ No token available');
                    setError('Authentication token not found. Please login again.');
                    return;
                  }
                  
                  // Call delete handler
                  await handleDeleteAdmin();
                }}
                disabled={formLoading || !selectedAdmin}
              >
                {formLoading ? (
                  <>
                    <span className="mr-2">Deleting...</span>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  </>
                ) : (
                  'Delete Admin'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for {selectedAdmin?.name}.
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
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsPasswordDialogOpen(false);
                    setSelectedAdmin(null);
                    setNewPassword('');
                    setError(null);
                  }}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
