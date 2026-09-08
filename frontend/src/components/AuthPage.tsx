// AI assisted development
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, Building2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { useAuth } from '../contexts/AuthContext';

interface AuthPageProps {
  mode: 'login' | 'register';
  onNavigate: (page: string, role?: string) => void;
}

export function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const navigate = useNavigate();
  const { login, register, forgotPassword, verifyOtp, resetPasswordWithOtp } = useAuth();
  const [userRole, setUserRole] = useState<'candidate' | 'employer'>('candidate');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(mode);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  // Debug: Log state changes
  useEffect(() => {
    console.log('forgotPasswordOpen state changed:', forgotPasswordOpen);
  }, [forgotPasswordOpen]);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'otp' | 'password'>('email');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordOtp, setForgotPasswordOtp] = useState('');
  const [forgotPasswordNewPassword, setForgotPasswordNewPassword] = useState('');
  const [forgotPasswordConfirmPassword, setForgotPasswordConfirmPassword] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const lastSubmitTimeRef = useRef<number>(0);

  useEffect(() => {
    // Update active tab when mode prop changes
    setActiveTab(mode);
    if (mode === 'login') {
      const flag = localStorage.getItem('registrationSuccess');
      if (flag) {
        setSuccessMessage('Registration successful! Please log in to continue.');
        localStorage.removeItem('registrationSuccess');
      }
    }
    // Reset submission ref when mode changes
    isSubmittingRef.current = false;
    setLoading(false);
  }, [mode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isSubmittingRef.current = false;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const now = Date.now();
    // Prevent double submission - check ref, loading state, and timestamp
    if (isSubmittingRef.current || loading) {
      return;
    }
    
    // Debounce: prevent submission if last submission was less than 500ms ago
    if (now - lastSubmitTimeRef.current < 500) {
      return;
    }
    
    lastSubmitTimeRef.current = now;
    isSubmittingRef.current = true;
    setLoading(true);
    setErrors({});

    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = (formData.get('email') as string)?.trim() || '';
    const password = (formData.get('password') as string)?.trim() || '';

    if (!email || !password) {
      setErrors({ form: 'Please enter both email and password.' });
      setLoading(false);
      isSubmittingRef.current = false;
      return;
    }

    try {
      const loggedInUser = await login(email, password);
      // Navigate directly based on the logged in user's role
      if (loggedInUser) {
        if (loggedInUser.role === 'admin') {
          navigate('/dashboard/admin');
        } else if (loggedInUser.role === 'employer') {
          navigate('/dashboard/employer');
        } else {
          navigate('/dashboard/candidate');
        }
      } else {
        // Fallback to generic dashboard
        onNavigate('dashboard');
      }
    } catch (err: any) {
      setErrors({ form: err.message || 'Login failed. Please check your credentials.' });
      isSubmittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const now = Date.now();
    // Prevent double submission - check ref, loading state, and timestamp
    if (isSubmittingRef.current || loading) {
      return;
    }
    
    // Debounce: prevent submission if last submission was less than 500ms ago
    if (now - lastSubmitTimeRef.current < 500) {
      return;
    }
    
    lastSubmitTimeRef.current = now;
    isSubmittingRef.current = true;
    setLoading(true);
    setErrors({});
    setSuccessMessage(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // Validate required fields
    const name = (formData.get('name') as string)?.trim() || '';
    const email = (formData.get('email') as string)?.trim() || '';
    const phone = (formData.get('phone') as string)?.trim() || '';
    const password = (formData.get('password') as string)?.trim() || '';
    const companyName = userRole === 'employer' ? (formData.get('company') as string)?.trim() : null;
    
    // Validation
    if (!name || !email || !phone || !password) {
      setErrors({ form: 'Please fill in all required fields.' });
      setLoading(false);
      isSubmittingRef.current = false;
      return;
    }
    
    if (userRole === 'employer' && !companyName) {
      setErrors({ form: 'Company name is required for employer registration.' });
      setLoading(false);
      isSubmittingRef.current = false;
      return;
    }
    
    const userData: any = {
      name,
      email,
      phone,
      password,
      role: userRole,
      ...(userRole === 'employer' && companyName ? { companyName } : {})
    };

    try {
      await register(userData);
      // Show success message
      setSuccessMessage('Registration successful! Please log in to continue.');
      // Clear form errors
      setErrors({});
      // Switch to login tab
      setActiveTab('login');
      // Update URL to login
      onNavigate('login');
    } catch (err: any) {
      if (err.errors) {
        setErrors(err.errors);
      } else {
        setErrors({ form: err.message || 'Registration failed. Please try again.' });
      }
      isSubmittingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordStep1 = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForgotPasswordError(null);

    if (!forgotPasswordEmail.trim()) {
      setForgotPasswordError('Please enter your email address');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      await forgotPassword(forgotPasswordEmail);
      setForgotPasswordStep('otp');
    } catch (err: any) {
      setForgotPasswordError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleForgotPasswordStep2 = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForgotPasswordError(null);

    if (!forgotPasswordOtp.trim() || forgotPasswordOtp.length !== 6) {
      setForgotPasswordError('Please enter a valid 6-digit OTP');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      await verifyOtp(forgotPasswordEmail, forgotPasswordOtp);
      setForgotPasswordStep('password');
    } catch (err: any) {
      setForgotPasswordError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleForgotPasswordStep3 = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForgotPasswordError(null);

    if (!forgotPasswordNewPassword.trim() || forgotPasswordNewPassword.length < 8) {
      setForgotPasswordError('Password must be at least 8 characters long');
      return;
    }

    if (forgotPasswordNewPassword !== forgotPasswordConfirmPassword) {
      setForgotPasswordError('Passwords do not match');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      await resetPasswordWithOtp(forgotPasswordEmail, forgotPasswordOtp, forgotPasswordNewPassword);
      // Success - close dialog and show success message
      setSuccessMessage('Password reset successfully! Please login with your new password.');
      handleCloseForgotPassword(false);
    } catch (err: any) {
      setForgotPasswordError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleCloseForgotPassword = (open: boolean) => {
    setForgotPasswordOpen(open);
    if (!open) {
      // Reset all states when dialog closes
      setForgotPasswordStep('email');
      setForgotPasswordEmail('');
      setForgotPasswordOtp('');
      setForgotPasswordNewPassword('');
      setForgotPasswordConfirmPassword('');
      setForgotPasswordError(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl text-blue-600 mb-2">MedExJob.com</h1>
          <p className="text-gray-600">
            {mode === 'login' ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value as 'login' | 'register');
          onNavigate(value);
        }} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-6">
            {successMessage && (
              <div className="text-green-700 bg-green-100 border border-green-200 rounded px-3 py-2 text-sm">
                {successMessage}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your.email@example.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {errors.form && <p className="text-red-500 text-sm">{errors.form}</p>}
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                disabled={loading || isSubmittingRef.current}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>

              <div className="text-center">
                <button 
                  type="button" 
                  className="text-sm text-blue-600 hover:underline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate('/forgot-password');
                  }}
                >
                  Forgot password?
                </button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-4 mt-6">
            {successMessage && (
              <div className="text-green-700 bg-green-100 border border-green-200 rounded px-3 py-2 text-sm flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {successMessage}
              </div>
            )}
            <form onSubmit={handleRegister} className="space-y-4" noValidate>
              <div>
                <Label>I want to register as</Label>
                <RadioGroup value={userRole} onValueChange={(value) => setUserRole(value as 'candidate' | 'employer')} className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="candidate" id="candidate-register" />
                    <Label htmlFor="candidate-register" className="cursor-pointer">
                      Candidate (Doctor/Nurse/Paramedic)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="employer" id="employer-register" />
                    <Label htmlFor="employer-register" className="cursor-pointer">
                      Employer (Hospital/Consultancy)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="name">Full Name {userRole === 'employer' && '/ Contact Person'}</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter your full name"
                    className="pl-10"
                    required
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
              </div>

              {userRole === 'employer' && (
                <div>
                  <Label htmlFor="company">Company/Hospital Name</Label>
                  <div className="relative mt-1">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="company"
                      name="company"
                      type="text"
                      placeholder="Enter company name"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    className="pl-10"
                    required
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="email-register">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email-register"
                    name="email"
                    type="email"
                    placeholder="your.email@example.com"
                    className="pl-10"
                    required
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="password-register">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password-register"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    required
                  />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
              </div>

              {errors.form && <p className="text-red-500 text-sm">{errors.form}</p>}
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700" 
                disabled={loading || isSubmittingRef.current}
                onClick={(e) => {
                  if (loading || isSubmittingRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <p className="text-xs text-center text-gray-500">
                By registering, you agree to our Terms & Conditions and Privacy Policy
              </p>
            </form>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Forgot Password Dialog - Multi-step */}
      <Dialog open={forgotPasswordOpen} onOpenChange={handleCloseForgotPassword}>
        <DialogContent className="sm:max-w-md z-[9999] bg-white">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              {forgotPasswordStep === 'email' && "Enter your email address and we'll send you an OTP to reset your password."}
              {forgotPasswordStep === 'otp' && "Enter the 6-digit OTP sent to your email."}
              {forgotPasswordStep === 'password' && "Enter your new password."}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Email */}
          {forgotPasswordStep === 'email' && (
            <form onSubmit={handleForgotPasswordStep1} className="space-y-4">
              <div>
                <Label htmlFor="forgot-email">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="your.email@example.com"
                    className="pl-10"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                    disabled={forgotPasswordLoading}
                  />
                </div>
              </div>
              {forgotPasswordError && (
                <p className="text-red-500 text-sm">{forgotPasswordError}</p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCloseForgotPassword(false)}
                  disabled={forgotPasswordLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={forgotPasswordLoading}
                >
                  {forgotPasswordLoading ? 'Sending...' : 'Send OTP'}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* Step 2: OTP */}
          {forgotPasswordStep === 'otp' && (
            <form onSubmit={handleForgotPasswordStep2} className="space-y-4">
              <div>
                <Label htmlFor="forgot-otp">OTP (6 digits)</Label>
                <div className="relative mt-1">
                  <Input
                    id="forgot-otp"
                    type="text"
                    placeholder="000000"
                    className="text-center text-2xl tracking-widest"
                    value={forgotPasswordOtp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setForgotPasswordOtp(value);
                    }}
                    maxLength={6}
                    required
                    disabled={forgotPasswordLoading}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  OTP sent to {forgotPasswordEmail}
                </p>
              </div>
              {forgotPasswordError && (
                <p className="text-red-500 text-sm">{forgotPasswordError}</p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForgotPasswordStep('email');
                    setForgotPasswordOtp('');
                    setForgotPasswordError(null);
                  }}
                  disabled={forgotPasswordLoading}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={forgotPasswordLoading || forgotPasswordOtp.length !== 6}
                >
                  {forgotPasswordLoading ? 'Verifying...' : 'Verify OTP'}
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* Step 3: New Password */}
          {forgotPasswordStep === 'password' && (
            <form onSubmit={handleForgotPasswordStep3} className="space-y-4">
              <div>
                <Label htmlFor="forgot-new-password">New Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="forgot-new-password"
                    type="password"
                    placeholder="Enter new password"
                    className="pl-10"
                    value={forgotPasswordNewPassword}
                    onChange={(e) => setForgotPasswordNewPassword(e.target.value)}
                    required
                    disabled={forgotPasswordLoading}
                    minLength={8}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="forgot-confirm-password">Confirm Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="forgot-confirm-password"
                    type="password"
                    placeholder="Confirm new password"
                    className="pl-10"
                    value={forgotPasswordConfirmPassword}
                    onChange={(e) => setForgotPasswordConfirmPassword(e.target.value)}
                    required
                    disabled={forgotPasswordLoading}
                    minLength={8}
                  />
                </div>
              </div>
              {forgotPasswordError && (
                <p className="text-red-500 text-sm">{forgotPasswordError}</p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForgotPasswordStep('otp');
                    setForgotPasswordNewPassword('');
                    setForgotPasswordConfirmPassword('');
                    setForgotPasswordError(null);
                  }}
                  disabled={forgotPasswordLoading}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={forgotPasswordLoading}
                >
                  {forgotPasswordLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
