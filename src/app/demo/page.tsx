'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { 
  Building2, 
  Users, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  CheckCircle2, 
  ArrowRight,
  GraduationCap,
  Shield,
  Calendar,
  Clock,
  Sparkles,
  Star
} from 'lucide-react';

interface DemoFormData {
  // Institution Details
  institutionName: string;
  institutionType: string;
  website: string;
  studentCount: string;
  facultyCount: string;
  
  // Contact Person Details
  contactName: string;
  designation: string;
  email: string;
  phone: string;
  
  // Address
  city: string;
  state: string;
  country: string;
  
  // Requirements
  currentSystem: string;
  challenges: string[];
  preferredDate: string;
  preferredTime: string;
  additionalNotes: string;
}

const institutionTypes = [
  'Engineering College',
  'Arts & Science College',
  'Medical College',
  'Law College',
  'Management Institute',
  'Polytechnic',
  'University',
  'School (K-12)',
  'Other'
];

const studentCountRanges = [
  'Less than 500',
  '500 - 1,000',
  '1,000 - 2,500',
  '2,500 - 5,000',
  '5,000 - 10,000',
  'More than 10,000'
];

const challengeOptions = [
  'Manual timetable scheduling',
  'Faculty workload management',
  'Classroom allocation',
  'NEP 2020 compliance',
  'Student attendance tracking',
  'Resource optimization',
  'Multi-campus management',
  'Reporting & analytics'
];

const timeSlots = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM'
];

export default function DemoRequestPage() {
  const [formData, setFormData] = useState<DemoFormData>({
    institutionName: '',
    institutionType: '',
    website: '',
    studentCount: '',
    facultyCount: '',
    contactName: '',
    designation: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    country: 'India',
    currentSystem: '',
    challenges: [],
    preferredDate: '',
    preferredTime: '',
    additionalNotes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleChallengeToggle = (challenge: string) => {
    setFormData(prev => ({
      ...prev,
      challenges: prev.challenges.includes(challenge)
        ? prev.challenges.filter(c => c !== challenge)
        : [...prev.challenges, challenge]
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.institutionName.trim()) {
        newErrors.institutionName = 'Institution name is required';
      }
      if (!formData.institutionType) {
        newErrors.institutionType = 'Please select institution type';
      }
      if (!formData.studentCount) {
        newErrors.studentCount = 'Please select student count range';
      }
    }

    if (step === 2) {
      if (!formData.contactName.trim()) {
        newErrors.contactName = 'Contact person name is required';
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (!/^[+]?[\d\s-]{10,}$/.test(formData.phone)) {
        newErrors.phone = 'Please enter a valid phone number';
      }
      if (!formData.city.trim()) {
        newErrors.city = 'City is required';
      }
      if (!formData.state.trim()) {
        newErrors.state = 'State is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      setIsSuccess(true);
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to submit. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: GraduationCap,
      title: 'NEP 2020 Compliant',
      description: 'Full support for MAJOR/MINOR elective system'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Role-based access control & data encryption'
    },
    {
      icon: Calendar,
      title: 'AI-Powered Scheduling',
      description: 'Intelligent conflict-free timetable generation'
    },
    {
      icon: Users,
      title: 'Multi-Role Support',
      description: 'Admin, Faculty, Student dashboards'
    }
  ];

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <Header />
        <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Demo Request Submitted Successfully!
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Thank you for your interest in Academic Compass ERP. Our team will review your request 
              and contact you within <span className="font-semibold text-primary">24-48 hours</span> to 
              schedule your personalized demo.
            </p>
            
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">What happens next?</h3>
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Our team will review your institution's requirements
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    We'll reach out to confirm your preferred demo date and time
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    You'll receive demo credentials to explore the platform
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Back to Home
              </Link>
              <Link 
                href="/login"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Already have credentials? Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <Header />
      
      <div className="pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              Enterprise ERP for Educational Institutions
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Schedule Your Free Demo
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Experience how Academic Compass can transform your institution's 
              academic management with a personalized demo
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left Side - Benefits */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Why Choose Academic Compass?
                </h3>
                <div className="space-y-4">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {feature.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Testimonial */}
              <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-2xl p-6 border border-primary/20">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic mb-4">
                  "Academic Compass revolutionized our timetable management. What used to take 
                  weeks now happens in minutes with zero conflicts."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-primary font-bold">DR</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Dr. Rajesh Kumar</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Principal, ABC Engineering College</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
                  <div className="text-2xl font-bold text-primary">500+</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Institutions</div>
                </div>
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
                  <div className="text-2xl font-bold text-primary">50K+</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Students</div>
                </div>
              </div>
            </div>

            {/* Right Side - Form */}
            <div className="lg:col-span-3">
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Progress Steps */}
                <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    {[
                      { step: 1, label: 'Institution' },
                      { step: 2, label: 'Contact' },
                      { step: 3, label: 'Requirements' }
                    ].map((item, index) => (
                      <div key={item.step} className="flex items-center">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm
                          ${currentStep >= item.step 
                            ? 'bg-primary text-white' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {currentStep > item.step ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            item.step
                          )}
                        </div>
                        <span className={`ml-2 text-sm font-medium hidden sm:inline
                          ${currentStep >= item.step 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {item.label}
                        </span>
                        {index < 2 && (
                          <div className={`w-12 sm:w-20 h-0.5 mx-2 sm:mx-4
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

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {/* Step 1: Institution Details */}
                  {currentStep === 1 && (
                    <div className="space-y-5">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Institution Details
                      </h2>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Institution Name *
                        </label>
                        <input
                          type="text"
                          name="institutionName"
                          value={formData.institutionName}
                          onChange={handleInputChange}
                          placeholder="Enter your institution's full name"
                          className={`w-full px-4 py-3 rounded-lg border ${
                            errors.institutionName 
                              ? 'border-red-300 focus:border-red-500' 
                              : 'border-gray-300 dark:border-gray-600 focus:border-primary'
                          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                        />
                        {errors.institutionName && (
                          <p className="mt-1 text-sm text-red-600">{errors.institutionName}</p>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Institution Type *
                          </label>
                          <select
                            name="institutionType"
                            value={formData.institutionType}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-3 rounded-lg border ${
                              errors.institutionType 
                                ? 'border-red-300' 
                                : 'border-gray-300 dark:border-gray-600'
                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                          >
                            <option value="">Select type</option>
                            {institutionTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          {errors.institutionType && (
                            <p className="mt-1 text-sm text-red-600">{errors.institutionType}</p>
                          )}
                        </div>

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
                              placeholder="https://www.example.edu"
                              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Number of Students *
                          </label>
                          <select
                            name="studentCount"
                            value={formData.studentCount}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-3 rounded-lg border ${
                              errors.studentCount 
                                ? 'border-red-300' 
                                : 'border-gray-300 dark:border-gray-600'
                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                          >
                            <option value="">Select range</option>
                            {studentCountRanges.map(range => (
                              <option key={range} value={range}>{range}</option>
                            ))}
                          </select>
                          {errors.studentCount && (
                            <p className="mt-1 text-sm text-red-600">{errors.studentCount}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Number of Faculty (Optional)
                          </label>
                          <input
                            type="text"
                            name="facultyCount"
                            value={formData.facultyCount}
                            onChange={handleInputChange}
                            placeholder="e.g., 150"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Contact Details */}
                  {currentStep === 2 && (
                    <div className="space-y-5">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Contact Information
                      </h2>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Contact Person Name *
                          </label>
                          <input
                            type="text"
                            name="contactName"
                            value={formData.contactName}
                            onChange={handleInputChange}
                            placeholder="Full name"
                            className={`w-full px-4 py-3 rounded-lg border ${
                              errors.contactName 
                                ? 'border-red-300' 
                                : 'border-gray-300 dark:border-gray-600'
                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                          />
                          {errors.contactName && (
                            <p className="mt-1 text-sm text-red-600">{errors.contactName}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Designation (Optional)
                          </label>
                          <input
                            type="text"
                            name="designation"
                            value={formData.designation}
                            onChange={handleInputChange}
                            placeholder="e.g., Principal, Dean, IT Head"
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email Address *
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleInputChange}
                              placeholder="official@institution.edu"
                              className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                                errors.email 
                                  ? 'border-red-300' 
                                  : 'border-gray-300 dark:border-gray-600'
                              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                            />
                          </div>
                          {errors.email && (
                            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
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
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              placeholder="+91 9876543210"
                              className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                                errors.phone 
                                  ? 'border-red-300' 
                                  : 'border-gray-300 dark:border-gray-600'
                              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                            />
                          </div>
                          {errors.phone && (
                            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            City *
                          </label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="text"
                              name="city"
                              value={formData.city}
                              onChange={handleInputChange}
                              placeholder="City"
                              className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                                errors.city 
                                  ? 'border-red-300' 
                                  : 'border-gray-300 dark:border-gray-600'
                              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                            />
                          </div>
                          {errors.city && (
                            <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                          )}
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
                            className={`w-full px-4 py-3 rounded-lg border ${
                              errors.state 
                                ? 'border-red-300' 
                                : 'border-gray-300 dark:border-gray-600'
                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20`}
                          />
                          {errors.state && (
                            <p className="mt-1 text-sm text-red-600">{errors.state}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Country
                          </label>
                          <input
                            type="text"
                            name="country"
                            value={formData.country}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Requirements */}
                  {currentStep === 3 && (
                    <div className="space-y-5">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Requirements & Scheduling
                      </h2>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Current System (Optional)
                        </label>
                        <input
                          type="text"
                          name="currentSystem"
                          value={formData.currentSystem}
                          onChange={handleInputChange}
                          placeholder="e.g., Excel sheets, Manual, Other ERP"
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Key Challenges You're Facing (Select all that apply)
                        </label>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {challengeOptions.map(challenge => (
                            <label
                              key={challenge}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                formData.challenges.includes(challenge)
                                  ? 'border-primary bg-primary/5 text-primary'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.challenges.includes(challenge)}
                                onChange={() => handleChallengeToggle(challenge)}
                                className="sr-only"
                              />
                              <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                formData.challenges.includes(challenge)
                                  ? 'bg-primary border-primary'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {formData.challenges.includes(challenge) && (
                                  <CheckCircle2 className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{challenge}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Preferred Demo Date (Optional)
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type="date"
                              name="preferredDate"
                              value={formData.preferredDate}
                              onChange={handleInputChange}
                              min={new Date().toISOString().split('T')[0]}
                              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Preferred Time Slot (Optional)
                          </label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <select
                              name="preferredTime"
                              value={formData.preferredTime}
                              onChange={handleInputChange}
                              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                              <option value="">Select time slot</option>
                              {timeSlots.map(slot => (
                                <option key={slot} value={slot}>{slot}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Additional Notes (Optional)
                        </label>
                        <textarea
                          name="additionalNotes"
                          value={formData.additionalNotes}
                          onChange={handleInputChange}
                          rows={3}
                          placeholder="Any specific requirements or questions?"
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Error Display */}
                  {errors.submit && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <p className="text-red-600 dark:text-red-400 text-sm">{errors.submit}</p>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
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

                    {currentStep < 3 ? (
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
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit Demo Request
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  <span>Secure & Encrypted</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>No Obligation</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Response within 24 hrs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
