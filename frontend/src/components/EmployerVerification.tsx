import { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Building2,
  MapPin,
  Globe,
  Mail,
  User,
  Phone,
  FileText,
  Upload,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Edit2,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchEmployer,
  submitEmployerVerification,
  uploadEmployerDocument,
  EmployerResponse,
} from '../api/employers';

interface EmployerVerificationProps {
  onNavigate: (page: string) => void;
}

export function EmployerVerification({ onNavigate }: EmployerVerificationProps) {
  const { user, token } = useAuth();
  const [employer, setEmployer] = useState<EmployerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // Form State with the 8 Minimal Required Details
  const [formData, setFormData] = useState({
    companyName: '',
    companyType: 'hospital' as 'hospital' | 'consultancy' | 'hr',
    address: '',
    city: '',
    state: '',
    pincode: '',
    website: '',
    contactPerson: '',
    designation: '',
    contactPhone: '',
    documentUrl: '',
  });
  const [selectedDoc, setSelectedDoc] = useState<File | null>(null);

  const loadEmployer = async () => {
    if (!user || !token) return;
    try {
      setLoading(true);
      const data = await fetchEmployer(user.id, token);
      setEmployer(data);
      setFormData({
        companyName: data.companyName || '',
        companyType: (data.companyType as any) || 'hospital',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        website: data.website || '',
        contactPerson: data.contactPerson || data.userName || '',
        designation: data.designation || '',
        contactPhone: data.contactPhone || (user as any).phone || '',
        documentUrl: data.documentUrl || '',
      });
      // If rejected or no verification request submitted yet, show form by default
      if (data.verificationStatus === 'rejected') {
        setShowEditForm(true);
      }
    } catch (err) {
      console.error('Failed to load employer data:', err);
      setError('Unable to load employer profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployer();
  }, [user, token]);

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setError('Document must be smaller than 15 MB.');
      return;
    }
    setSelectedDoc(file);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employer || !token) return;

    if (!formData.companyName.trim()) {
      setError('Please provide your Organisation / Hospital name.');
      return;
    }
    if (!formData.contactPerson.trim()) {
      setError('Please enter Contact Person Name.');
      return;
    }
    if (!formData.contactPhone.trim()) {
      setError('Please enter a valid Mobile Number.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);

      let docUrl = formData.documentUrl;
      if (selectedDoc) {
        setUploadingDoc(true);
        try {
          const docRes = await uploadEmployerDocument(employer.id, selectedDoc, token);
          if (docRes?.documentUrl) {
            docUrl = docRes.documentUrl;
          }
        } catch (uploadErr) {
          console.warn('Document upload warning:', uploadErr);
        } finally {
          setUploadingDoc(false);
        }
      }

      const updated = await submitEmployerVerification(
        employer.id,
        {
          ...formData,
          documentUrl: docUrl,
        },
        token
      );

      setEmployer(updated);
      setShowEditForm(false);
      setSelectedDoc(null);
      setSuccessMsg('Verification details submitted successfully! Our team will review within 24 hours.');
    } catch (err: any) {
      console.error('Failed to submit verification:', err);
      setError(err.message || 'Failed to submit verification request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-9 h-9 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 font-medium">Loading employer verification profile...</p>
        </div>
      </div>
    );
  }

  // STATUS 1: VERIFIED / APPROVED
  if (employer?.isVerified || employer?.verificationStatus === 'approved') {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center border-emerald-200 bg-white shadow-sm rounded-2xl">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-sm font-bold px-3 py-1 mb-3">
              ✓ Verified Employer
            </Badge>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{employer.companyName}</h1>
            <p className="text-gray-600 text-sm mb-6 max-w-md mx-auto">
              Your organization has been officially verified by MedExJob. Your job postings display the verified badge to attract premium medical talent.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 mb-6 text-xs text-gray-700">
              <div>
                <span className="text-gray-400 block">Organisation Type</span>
                <strong className="text-gray-900 capitalize">{employer.companyType || 'Hospital'}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Contact Person</span>
                <strong className="text-gray-900">{employer.contactPerson || employer.userName || '—'}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Official Work Email</span>
                <strong className="text-gray-900">{employer.userEmail}</strong>
              </div>
              <div>
                <span className="text-gray-400 block">Contact Phone</span>
                <strong className="text-gray-900">{employer.contactPhone || '—'}</strong>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                onClick={() => onNavigate('dashboard/employer')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6"
              >
                Employer Dashboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={() => onNavigate('post-job')}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Post a Job
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // STATUS 2: PENDING REVIEW (and not in edit mode)
  if (employer?.verificationStatus === 'pending' && !showEditForm) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="p-8 text-center border-amber-200 bg-white shadow-sm rounded-2xl">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-9 h-9" />
            </div>
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs font-bold px-3 py-1 mb-2">
              Verification Under Review
            </Badge>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Review in Progress</h1>
            <p className="text-gray-600 text-sm mb-6 max-w-lg mx-auto leading-relaxed">
              Your employer details have been submitted and are currently being reviewed by the MedExJob administration team to ensure trust and authenticity across medical hiring.
            </p>

            <div className="text-left bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 mb-6 text-xs text-slate-700">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-900 text-sm">Submitted Organisation Details</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowEditForm(true)}
                  className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Details
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-400 block">Organisation Name:</span>
                  <span className="font-semibold text-slate-900">{employer.companyName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Organisation Type:</span>
                  <span className="font-semibold text-slate-900 capitalize">{employer.companyType || 'Hospital'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Contact Person &amp; Role:</span>
                  <span className="font-semibold text-slate-900">
                    {employer.contactPerson || employer.userName || '—'}
                    {employer.designation ? ` (${employer.designation})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Mobile Phone:</span>
                  <span className="font-semibold text-slate-900">{employer.contactPhone || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Official Work Email:</span>
                  <span className="font-semibold text-slate-900">{employer.userEmail}</span>
                </div>
                {employer.website && (
                  <div>
                    <span className="text-slate-400 block">Website:</span>
                    <a
                      href={employer.website.startsWith('http') ? employer.website : `https://${employer.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline font-medium"
                    >
                      {employer.website}
                    </a>
                  </div>
                )}
                {employer.documentUrl && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 block">Uploaded Proof Document:</span>
                    <a
                      href={employer.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium underline mt-0.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Uploaded Document <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => onNavigate('dashboard/employer')}>
                Back to Dashboard
              </Button>
              <Button onClick={() => loadEmployer()} className="bg-blue-600 hover:bg-blue-700 text-white">
                Refresh Status
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // STATUS 3: VERIFICATION FORM (For initial submission, edits, or after rejection)
  return (
    <div className="min-h-[calc(100vh-200px)] bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            Employer Verification
          </h1>
          <p className="text-sm text-gray-600">
            Submit minimal details to verify your hospital, clinic, or medical organization. Fraud-free verification takes less than 2 minutes.
          </p>
        </div>

        {employer?.verificationStatus === 'rejected' && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-sm flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Previous Verification Request Not Approved</strong>
              <p className="mt-0.5 text-xs text-red-800">
                {employer.verificationNotes || 'Your submitted details or documents could not be verified. Please review and update the form below.'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <Card className="p-6 sm:p-8 bg-white border-gray-200 shadow-sm rounded-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-gray-100 pb-4">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" /> 1. Organisation Details
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Basic information about the healthcare establishment</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="companyName" className="text-xs font-semibold text-gray-700">
                  Organisation / Hospital Name *
                </Label>
                <Input
                  id="companyName"
                  required
                  placeholder="e.g. City Multi-Speciality Hospital"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="companyType" className="text-xs font-semibold text-gray-700">
                  Organisation Type *
                </Label>
                <select
                  id="companyType"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formData.companyType}
                  onChange={(e) => setFormData({ ...formData, companyType: e.target.value as any })}
                >
                  <option value="hospital">Hospital / Clinic / Medical College</option>
                  <option value="consultancy">Healthcare Consultancy / Placement Agency</option>
                  <option value="hr">HR Recruitment Firm</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="website" className="text-xs font-semibold text-gray-700">
                  Website / Official Social Profile (Optional)
                </Label>
                <Input
                  id="website"
                  placeholder="https://hospital.com or LinkedIn"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
            </div>

            <div className="border-b border-gray-100 pb-4 pt-2">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" /> 2. Official Address
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="address" className="text-xs font-semibold text-gray-700">
                  Street Address
                </Label>
                <Input
                  id="address"
                  placeholder="Building, Road, Landmark"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-xs font-semibold text-gray-700">
                  City
                </Label>
                <Input
                  id="city"
                  placeholder="e.g. Pune"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="state" className="text-xs font-semibold text-gray-700">
                  State
                </Label>
                <Input
                  id="state"
                  placeholder="e.g. Maharashtra"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pincode" className="text-xs font-semibold text-gray-700">
                  Pincode
                </Label>
                <Input
                  id="pincode"
                  placeholder="e.g. 411001"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                />
              </div>
            </div>

            <div className="border-b border-gray-100 pb-4 pt-2">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" /> 3. Authorized Contact Person
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Person responsible for recruitment communications</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contactPerson" className="text-xs font-semibold text-gray-700">
                  Contact Person Name *
                </Label>
                <Input
                  id="contactPerson"
                  required
                  placeholder="Dr. / Mr. / Ms. Name"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="designation" className="text-xs font-semibold text-gray-700">
                  Designation *
                </Label>
                <Input
                  id="designation"
                  required
                  placeholder="e.g. HR Manager / Medical Director"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contactPhone" className="text-xs font-semibold text-gray-700">
                  Official Mobile Number *
                </Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700">
                  Official Work Email (Account Email)
                </Label>
                <Input disabled value={employer?.userEmail || ''} className="bg-gray-100 text-gray-500" />
              </div>
            </div>

            <div className="border-b border-gray-100 pb-4 pt-2">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> 4. Proof Document (Optional)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Upload any 1 document (Hospital Registration / GST / Licence / Official Letterhead / ID Card) to speed up approval.
              </p>
            </div>

            <div className="border border-dashed border-gray-300 rounded-xl p-5 bg-gray-50/60 hover:bg-gray-50 transition text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-xs text-gray-600 mb-2">
                {selectedDoc ? (
                  <span className="font-semibold text-emerald-700">
                    Selected: {selectedDoc.name} ({(selectedDoc.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                ) : formData.documentUrl ? (
                  <span className="text-blue-600">
                    Previously uploaded document exists. Choose a new file to replace.
                  </span>
                ) : (
                  <span>Select PDF, PNG, or JPG document (Max 15 MB)</span>
                )}
              </div>
              <input
                id="docUpload"
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleDocChange}
              />
              <label
                htmlFor="docUpload"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-white border border-gray-300 px-3 py-1.5 rounded-lg cursor-pointer shadow-xs"
              >
                {selectedDoc ? 'Change Document' : 'Browse File'}
              </label>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100">
              {employer?.verificationStatus === 'pending' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditForm(false)}
                >
                  Cancel Edit
                </Button>
              )}
              <Button
                type="submit"
                disabled={submitting || uploadingDoc}
                className="ml-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 shadow-sm"
              >
                {submitting || uploadingDoc ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Submitting Verification…
                  </>
                ) : (
                  <>
                    Submit Verification Request <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
