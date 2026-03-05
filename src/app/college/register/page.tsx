'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Users,
  Mail,
  Phone,
  Globe,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Shield,
  Lock,
  AlertCircle,
  Key,
  GraduationCap,
  Clock,
  Calendar,
  Eye,
  EyeOff
} from 'lucide-react';

interface CollegeFormData {
  // College Details
  collegeName: string;
  collegeCode: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  website: string;
  establishedYear: string;
  affiliatedUniversity: string;
  accreditation: string;

  // Principal/Head Details
  principalName: string;
  principalEmail: string;
  principalPhone: string;

  // College Admin Details (who will manage the system)
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  adminDesignation: string;
  adminPassword: string;
  confirmPassword: string;

  // Academic Configuration
  academicYear: string;
  workingDays: string[];
  startTime: string;
  endTime: string;

  // Agreement
  agreedToTerms: boolean;
}

const workingDayOptions = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

function CollegeRegistrationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registrationToken = searchParams.get('token');

  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [tokenData, setTokenData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adminCredentials, setAdminCredentials] = useState<{ uid: string; email: string } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const STORAGE_KEY = `college_reg_draft_${registrationToken || 'draft'}`;

  const [formData, setFormData] = useState<CollegeFormData>(() => {
    // Restore from sessionStorage if available
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(`college_reg_draft_${registrationToken || 'draft'}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Never restore password fields
          return { ...parsed, adminPassword: '', confirmPassword: '' };
        }
      } catch { /* ignore */ }
    }
    return {
      collegeName: '',
      collegeCode: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      website: '',
      establishedYear: '',
      affiliatedUniversity: '',
      accreditation: '',
      principalName: '',
      principalEmail: '',
      principalPhone: '',
      adminFirstName: '',
      adminLastName: '',
      adminEmail: '',
      adminPhone: '',
      adminDesignation: '',
      adminPassword: '',
      confirmPassword: '',
      academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(-2),
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      startTime: '09:00',
      endTime: '17:00',
      agreedToTerms: false
    };
  });

  // Restore step from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedStep = sessionStorage.getItem(`${STORAGE_KEY}_step`);
        if (savedStep) setCurrentStep(parseInt(savedStep, 10));
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist form data to sessionStorage on every change (exclude passwords)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const toSave = { ...formData, adminPassword: '', confirmPassword: '' };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        sessionStorage.setItem(`${STORAGE_KEY}_step`, String(currentStep));
      } catch { /* ignore */ }
    }
  }, [formData, currentStep, STORAGE_KEY]);

  // Validate registration token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!registrationToken) {
        setIsValidToken(false);
        return;
      }

      try {
        const response = await fetch(`/api/college/validate-token?token=${registrationToken}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setIsValidToken(true);
          setTokenData(data.tokenData);

          // Pre-fill form with token data if available
          if (data.tokenData) {
            setFormData(prev => ({
              ...prev,
              collegeName: data.tokenData.institutionName || '',
              city: data.tokenData.city || '',
              state: data.tokenData.state || '',
              adminEmail: data.tokenData.email || ''
              // adminPhone intentionally not pre-filled — admin enters their own
            }));
          }
        } else {
          setIsValidToken(false);
        }
      } catch (error) {
        console.error('Token validation error:', error);
        setIsValidToken(false);
      }
    };

    validateToken();
  }, [registrationToken]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleWorkingDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.collegeName.trim()) newErrors.collegeName = 'College name is required';
      if (!formData.collegeCode.trim()) newErrors.collegeCode = 'College code is required';
      else if (!/^[A-Z0-9]{3,10}$/i.test(formData.collegeCode)) {
        newErrors.collegeCode = 'Code should be 3-10 alphanumeric characters';
      }
      if (!formData.address.trim()) newErrors.address = 'Address is required';
      if (!formData.city.trim()) newErrors.city = 'City is required';
      if (!formData.state.trim()) newErrors.state = 'State is required';
      if (!formData.pincode.trim()) newErrors.pincode = 'Pincode is required';
      else if (!/^\d{6}$/.test(formData.pincode)) {
        newErrors.pincode = 'Please enter a valid 6-digit pincode';
      }
    }

    if (step === 2) {
      if (!formData.principalName.trim()) newErrors.principalName = 'Principal name is required';
      if (!formData.principalEmail.trim()) newErrors.principalEmail = 'Principal email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.principalEmail)) {
        newErrors.principalEmail = 'Please enter a valid email';
      }
    }

    if (step === 3) {
      if (!formData.adminFirstName.trim()) newErrors.adminFirstName = 'First name is required';
      if (!formData.adminLastName.trim()) newErrors.adminLastName = 'Last name is required';
      if (!formData.adminEmail.trim()) newErrors.adminEmail = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
        newErrors.adminEmail = 'Please enter a valid email';
      }
      if (!formData.adminPhone.trim()) newErrors.adminPhone = 'Phone is required';
      if (!formData.adminPassword) newErrors.adminPassword = 'Password is required';
      else if (formData.adminPassword.length < 8) {
        newErrors.adminPassword = 'Password must be at least 8 characters';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.adminPassword)) {
        newErrors.adminPassword = 'Password must contain uppercase, lowercase, and number';
      }
      if (formData.adminPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (step === 4) {
      if (formData.workingDays.length === 0) {
        newErrors.workingDays = 'Select at least one working day';
      }
      if (!formData.startTime) newErrors.startTime = 'Start time is required';
      if (!formData.endTime) newErrors.endTime = 'End time is required';
      if (!formData.agreedToTerms) {
        newErrors.agreedToTerms = 'You must agree to the terms and conditions';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/college/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          registrationToken
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store admin credentials for display
      if (data.admin) {
        setAdminCredentials({
          uid: data.admin.uid,
          email: data.admin.email
        });
      }

      setIsSuccess(true);
      // Clear saved draft on successful registration
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(`${STORAGE_KEY}_step`);
      } catch { /* ignore */ }
    } catch (error: any) {
      setErrors({ submit: error.message || 'Registration failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Invalid or missing token view
  if (isValidToken === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Restricted
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            This registration page requires a valid invitation link.
            If your institution has requested a demo, you'll receive a unique registration link
            after your account is approved.
          </p>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Need access?
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Request a demo and our team will provide you with registration credentials.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/demo"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Request a Demo
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Validating your access...</p>
        </div>
      </div>
    );
  }

  // Success view
  if (isSuccess) {
    const handleSendCredentialsEmail = async () => {
      setIsSendingEmail(true);
      try {
        const response = await fetch('/api/college/send-credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: adminCredentials?.email || formData.adminEmail,
            uid: adminCredentials?.uid,
            collegeName: formData.collegeName,
            adminName: `${formData.adminFirstName} ${formData.adminLastName}`
          })
        });

        if (response.ok) {
          setEmailSent(true);
        }
      } catch (error) {
        console.error('Failed to send email:', error);
      } finally {
        setIsSendingEmail(false);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Registration Complete!
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Your institution <span className="font-semibold text-primary">{formData.collegeName}</span> has
            been successfully registered on Algomate.
          </p>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Your Admin Login Credentials
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Admin UID:</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-white text-sm">
                  {adminCredentials?.uid || `${formData.collegeCode.toUpperCase()}-ADMIN-XXXXX`}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <span className="text-sm text-gray-600 dark:text-gray-400">Password:</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-white">
                  (The password you set during registration)
                </span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>Important:</strong> Use your Admin UID and password to log in. Please save these credentials securely.
              </p>
            </div>
          </div>

          {/* Send Credentials via Email */}
          <div className="mb-6">
            {emailSent ? (
              <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span>Credentials sent to {adminCredentials?.email || formData.adminEmail}</span>
              </div>
            ) : (
              <button
                onClick={handleSendCredentialsEmail}
                disabled={isSendingEmail}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
              >
                {isSendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send Credentials to Email
                  </>
                )}
              </button>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
            <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Next Steps:</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 text-left space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <span>Log in to your Admin Dashboard using your UID and password</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <span>Set up departments and courses</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <span>Create faculty and student accounts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                <span>Start generating timetables!</span>
              </li>
            </ul>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg font-medium hover:from-primary/90 hover:to-purple-600/90 transition-all"
          >
            Go to Login
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              College Registration
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Complete your institution's registration to get started with Algomate
            </p>
            {tokenData?.institutionName && (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Demo approved for: {tokenData.institutionName}
              </div>
            )}
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {[
                { step: 1, label: 'College Info' },
                { step: 2, label: 'Leadership' },
                { step: 3, label: 'Admin Setup' },
                { step: 4, label: 'Configuration' }
              ].map((item, index) => (
                <div key={item.step} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-medium
                    ${currentStep >= item.step
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    {currentStep > item.step ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      item.step
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium hidden md:inline
                    ${currentStep >= item.step
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500'
                    }`}
                  >
                    {item.label}
                  </span>
                  {index < 3 && (
                    <div className={`w-8 md:w-16 h-0.5 mx-2 md:mx-4
                      ${currentStep > item.step
                        ? 'bg-primary'
                        : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">

              {/* Step 1: College Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Institution Information
                  </h2>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        College/Institution Name *
                      </label>
                      <input
                        type="text"
                        name="collegeName"
                        value={formData.collegeName}
                        onChange={handleInputChange}
                        placeholder="Full name of the institution"
                        className={`w-full px-4 py-3 rounded-lg border ${errors.collegeName ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                      />
                      {errors.collegeName && (
                        <p className="mt-1 text-sm text-red-600">{errors.collegeName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        College Code * <span className="text-xs text-gray-500">(Unique identifier)</span>
                      </label>
                      <input
                        type="text"
                        name="collegeCode"
                        value={formData.collegeCode}
                        onChange={handleInputChange}
                        placeholder="e.g., SVPCET, GCOEJ"
                        className={`w-full px-4 py-3 rounded-lg border ${errors.collegeCode ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 uppercase`}
                      />
                      {errors.collegeCode && (
                        <p className="mt-1 text-sm text-red-600">{errors.collegeCode}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Established Year
                      </label>
                      <input
                        type="text"
                        name="establishedYear"
                        value={formData.establishedYear}
                        onChange={handleInputChange}
                        placeholder="e.g., 1990"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Address *
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Complete address including locality"
                      className={`w-full px-4 py-3 rounded-lg border ${errors.address ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none`}
                    />
                    {errors.address && (
                      <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="City"
                        className={`w-full px-4 py-3 rounded-lg border ${errors.city ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                      />
                      {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="State"
                        className={`w-full px-4 py-3 rounded-lg border ${errors.state ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                      />
                      {errors.state && <p className="mt-1 text-sm text-red-600">{errors.state}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        PIN Code *
                      </label>
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        placeholder="6-digit PIN"
                        maxLength={6}
                        className={`w-full px-4 py-3 rounded-lg border ${errors.pincode ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                      />
                      {errors.pincode && <p className="mt-1 text-sm text-red-600">{errors.pincode}</p>}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Website (Optional)
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="url"
                          name="website"
                          value={formData.website}
                          onChange={handleInputChange}
                          placeholder="https://www.college.edu"
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Affiliated University
                      </label>
                      <input
                        type="text"
                        name="affiliatedUniversity"
                        value={formData.affiliatedUniversity}
                        onChange={handleInputChange}
                        placeholder="e.g., RTMNU, Mumbai University"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Principal/Leadership */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Institution Leadership
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Principal/Head of Institution details (for official records)
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Principal/Head Name *
                      </label>
                      <input
                        type="text"
                        name="principalName"
                        value={formData.principalName}
                        onChange={handleInputChange}
                        placeholder="Dr. Full Name"
                        className={`w-full px-4 py-3 rounded-lg border ${errors.principalName ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                      />
                      {errors.principalName && (
                        <p className="mt-1 text-sm text-red-600">{errors.principalName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Principal's Email *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          name="principalEmail"
                          value={formData.principalEmail}
                          onChange={handleInputChange}
                          placeholder="principal@college.edu"
                          className={`w-full pl-10 pr-4 py-3 rounded-lg border ${errors.principalEmail ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                        />
                      </div>
                      {errors.principalEmail && (
                        <p className="mt-1 text-sm text-red-600">{errors.principalEmail}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Principal's Phone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          name="principalPhone"
                          value={formData.principalPhone}
                          onChange={handleInputChange}
                          placeholder="+91 9876543210"
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Accreditation Details
                    </label>
                    <input
                      type="text"
                      name="accreditation"
                      value={formData.accreditation}
                      onChange={handleInputChange}
                      placeholder="e.g., NAAC Grade A+, NBA Accredited"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Admin Account Setup */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    System Administrator Setup
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    This person will manage the Algomate system for your institution
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="adminFirstName"
                        value={formData.adminFirstName}
                        onChange={handleInputChange}
                        placeholder="First name"
                        className={`w-full px-4 py-3 rounded-lg border ${errors.adminFirstName ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                      />
                      {errors.adminFirstName && (
                        <p className="mt-1 text-sm text-red-600">{errors.adminFirstName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="adminLastName"
                        value={formData.adminLastName}
                        onChange={handleInputChange}
                        placeholder="Last name"
                        className={`w-full px-4 py-3 rounded-lg border ${errors.adminLastName ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                      />
                      {errors.adminLastName && (
                        <p className="mt-1 text-sm text-red-600">{errors.adminLastName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          name="adminEmail"
                          value={formData.adminEmail}
                          onChange={handleInputChange}
                          placeholder="admin@college.edu"
                          className={`w-full pl-10 pr-4 py-3 rounded-lg border ${errors.adminEmail ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                        />
                      </div>
                      {errors.adminEmail && (
                        <p className="mt-1 text-sm text-red-600">{errors.adminEmail}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          name="adminPhone"
                          autoComplete="off"
                          value={formData.adminPhone}
                          onChange={handleInputChange}
                          placeholder="+91 9876543210"
                          className={`w-full pl-10 pr-4 py-3 rounded-lg border ${errors.adminPhone ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                        />
                      </div>
                      {errors.adminPhone && (
                        <p className="mt-1 text-sm text-red-600">{errors.adminPhone}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Admin UID <span className="text-xs text-gray-500">(Auto-generated on registration)</span>
                      </label>
                      <div className="w-full px-4 py-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-mono text-sm flex items-center gap-2">
                        <Key className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        {formData.collegeCode ? `${formData.collegeCode.toUpperCase()}-ADMIN-XXXXXX` : 'COLLEGECODE-ADMIN-XXXXXX'}
                        <span className="ml-2 text-xs text-gray-400 font-sans">(Generated automatically)</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">This will be your unique login ID. You will receive it via email after registration.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Password *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="adminPassword"
                          autoComplete="new-password"
                          value={formData.adminPassword}
                          onChange={handleInputChange}
                          placeholder="Create a strong password"
                          className={`w-full pl-10 pr-12 py-3 rounded-lg border ${errors.adminPassword ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {errors.adminPassword && (
                        <p className="mt-1 text-sm text-red-600">{errors.adminPassword}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Min 8 chars, include uppercase, lowercase, and number
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          autoComplete="new-password"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          placeholder="Confirm your password"
                          className={`w-full pl-10 pr-4 py-3 rounded-lg border ${errors.confirmPassword ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                        />
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Academic Configuration */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Academic Configuration
                  </h2>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Academic Year
                      </label>
                      <input
                        type="text"
                        name="academicYear"
                        value={formData.academicYear}
                        onChange={handleInputChange}
                        placeholder="2025-26"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          College Start Time
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="time"
                            name="startTime"
                            value={formData.startTime}
                            onChange={handleInputChange}
                            title="College Start Time"
                            className={`w-full pl-10 pr-4 py-3 rounded-lg border ${errors.startTime ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          College End Time
                        </label>
                        <input
                          type="time"
                          name="endTime"
                          value={formData.endTime}
                          onChange={handleInputChange}
                          title="College End Time"
                          className={`w-full px-4 py-3 rounded-lg border ${errors.endTime ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Working Days *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {workingDayOptions.map(day => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleWorkingDayToggle(day)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${formData.workingDays.includes(day)
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                    {errors.workingDays && (
                      <p className="mt-1 text-sm text-red-600">{errors.workingDays}</p>
                    )}
                  </div>

                  {/* Terms Agreement */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="agreedToTerms"
                        checked={formData.agreedToTerms}
                        onChange={handleInputChange}
                        className="mt-1 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        I agree to the <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms of Service</Link> and{' '}
                        <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</Link>.
                        I understand that this platform will be used to manage academic data and I am
                        authorized to register on behalf of my institution.
                      </span>
                    </label>
                    {errors.agreedToTerms && (
                      <p className="mt-2 text-sm text-red-600">{errors.agreedToTerms}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {errors.submit && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-600 dark:text-red-400 text-sm">{errors.submit}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg font-medium hover:from-primary/90 hover:to-purple-600/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        Complete Registration
                        <CheckCircle2 className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CollegeRegistrationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4D869C]"></div></div>}>
      <CollegeRegistrationPageContent />
    </Suspense>
  );
}
