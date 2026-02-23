'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  Video,
  Users,
  MapPin,
  ArrowRight,
  GraduationCap
} from 'lucide-react';
import { Navigation } from '@/components/landing/Navigation';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

interface FormData {
  name: string;
  email: string;
  phone: string;
  institution: string;
  institutionType: string; // Required by API
  studentCount: string;    // Required by API
  city: string;            // Required by API
  state: string;           // Required by API
  role: string;
  demoType: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
}

interface NavigationStep {
  id: number;
  title: string;
  icon: React.ReactNode;
}

interface Benefit {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface DemoStep {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
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

export default function DemoRequestPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    institution: '',
    institutionType: '',
    studentCount: '',
    city: '',
    state: '',
    role: '',
    demoType: 'virtual',
    preferredDate: '',
    preferredTime: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const requiredFields = [
      'name', 'email', 'phone', 'institution', 'institutionType',
      'studentCount', 'city', 'state', 'preferredDate'
    ];

    const missingFields = requiredFields.filter(field => !formData[field as keyof FormData]);

    if (missingFields.length > 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Map new form data to API expected format
      const apiPayload = {
        institutionName: formData.institution,
        institutionType: formData.institutionType,
        studentCount: formData.studentCount,
        contactName: formData.name,
        designation: formData.role,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        state: formData.state,
        country: 'India',
        challenges: [], // Not in new UI explicitly, sending empty or could add back
        preferredDate: formData.preferredDate,
        preferredTime: formData.preferredTime,
        additionalNotes: formData.message
      };

      const response = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      // Show success message
      toast.success('Demo request submitted successfully! We\'ll contact you shortly.');

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        institution: '',
        institutionType: '',
        studentCount: '',
        city: '',
        state: '',
        role: '',
        demoType: 'virtual',
        preferredDate: '',
        preferredTime: '',
        message: ''
      });

      setActiveStep(1);

      // Optional: Redirect to home after delay
      setTimeout(() => router.push('/'), 3000);

    } catch (error: any) {
      toast.error(error.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.institution && !!formData.institutionType && !!formData.studentCount && !!formData.role;
      case 2:
        return !!formData.name && !!formData.email && !!formData.phone && !!formData.city && !!formData.state;
      case 3:
        return !!formData.demoType && !!formData.preferredDate;
      default:
        return false;
    }
  };

  const navigationSteps: NavigationStep[] = [
    { id: 1, title: 'Institution', icon: <Building2 size={20} /> },
    { id: 2, title: 'Contact', icon: <User size={20} /> },
    { id: 3, title: 'Requirements', icon: <Calendar size={20} /> }
  ];

  const benefits: Benefit[] = [
    {
      icon: <Video size={32} />,
      title: 'Personalized Walkthrough',
      description: 'Get a customized demo tailored to your institution\'s specific needs and requirements.'
    },
    {
      icon: <Users size={32} />,
      title: 'Expert Guidance',
      description: 'Learn from our experienced team who understand academic administration challenges.'
    },
    {
      icon: <CheckCircle2 size={32} />,
      title: 'Q&A Session',
      description: 'Ask questions and get immediate answers about features, pricing, and implementation.'
    },
    {
      icon: <MapPin size={32} />,
      title: 'Flexible Options',
      description: 'Choose between virtual demos or on-site visits based on your convenience.'
    }
  ];

  const demoSteps: DemoStep[] = [
    {
      number: '01',
      title: 'Schedule Your Demo',
      description: 'Choose your preferred date and time slot that works best for you and your team.',
      icon: <Calendar size={32} />
    },
    {
      number: '02',
      title: 'Confirmation & Preparation',
      description: 'Receive email confirmation with meeting link and preparation materials for the demo.',
      icon: <Mail size={32} />
    },
    {
      number: '03',
      title: 'Live Demo Session',
      description: 'Join the personalized walkthrough with our expert and explore key features.',
      icon: <Video size={32} />
    },
    {
      number: '04',
      title: 'Q&A Discussion',
      description: 'Ask questions, discuss your needs, and learn how we can help your institution.',
      icon: <Users size={32} />
    },
    {
      number: '05',
      title: 'Customized Proposal',
      description: 'Receive a tailored implementation plan and pricing designed for your requirements.',
      icon: <CheckCircle2 size={32} />
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <Toaster position="top-center" />
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-32 overflow-hidden bg-teal-50">
        {/* Grid Background Pattern */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, #4D869C15 1px, transparent 1px),
              linear-gradient(to bottom, #4D869C15 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        ></div>

        {/* Floating Shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-blue-200/30 to-teal-200/30 -top-32 -left-32 blur-3xl"></div>
          <div className="absolute w-96 h-96 rounded-full bg-gradient-to-br from-teal-200/20 to-blue-200/20 top-1/2 -right-48 blur-3xl"></div>
          <div className="absolute w-72 h-72 rounded-full bg-gradient-to-br from-blue-100/30 to-teal-100/30 bottom-0 left-1/3 blur-3xl"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-7xl mx-auto px-6 relative z-10"
        >
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left Column - Hero Text */}
            <div className="text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4D869C]/10 to-[#7AB2B2]/10 rounded-full text-[#4D869C] font-semibold text-sm mb-6">
                  <Calendar size={16} />
                  Schedule Your Demo
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6"
              >
                Experience Academic Compass
                <br />
                <span className="bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] bg-clip-text text-transparent">
                  In Action
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-gray-600 mb-10 leading-relaxed"
              >
                See how Academic Compass can transform your institution's academic management.
                Schedule a personalized demo with our experts and discover the perfect solution
                for your needs.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-3 gap-6"
              >
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-lg">
                  <h3 className="text-3xl font-bold text-[#4D869C] mb-1">30 min</h3>
                  <p className="text-sm text-gray-600">Average Demo Duration</p>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-lg">
                  <h3 className="text-3xl font-bold text-[#4D869C] mb-1">500+</h3>
                  <p className="text-sm text-gray-600">Institutions Trust Us</p>
                </div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 shadow-lg">
                  <h3 className="text-3xl font-bold text-[#4D869C] mb-1">24/7</h3>
                  <p className="text-sm text-gray-600">Support Available</p>
                </div>
              </motion.div>
            </div>

            {/* Right Column - Demo Request Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="grid md:grid-cols-[200px_1fr]">
                  {/* Side Navigation */}
                  <div className="bg-gradient-to-b from-[#4D869C] to-[#7AB2B2] p-6 text-white">
                    <div className="mb-8">
                      <Calendar size={32} className="mb-3" />
                      <h3 className="text-xl font-bold">Get Started</h3>
                    </div>

                    <nav className="space-y-3">
                      {navigationSteps.map((step) => (
                        <button
                          key={step.id}
                          onClick={() => setActiveStep(step.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeStep === step.id
                            ? 'bg-white/20 shadow-lg'
                            : isStepComplete(step.id)
                              ? 'bg-white/10'
                              : 'hover:bg-white/5'
                            }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isStepComplete(step.id)
                            ? 'bg-green-400 text-white'
                            : 'bg-white/10'
                            }`}>
                            {isStepComplete(step.id) ? <CheckCircle2 size={20} /> : step.icon}
                          </div>
                          <span className="font-medium text-sm">{step.title}</span>
                        </button>
                      ))}
                    </nav>

                    <div className="mt-8 pt-8 border-t border-white/20">
                      <p className="text-sm text-white/80">Step {activeStep} of 3</p>
                    </div>
                  </div>

                  {/* Form Content */}
                  <div className="p-8">
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Your Free Demo</h2>
                      <p className="text-gray-600">Fill in your details and we'll get back to you within 24 hours</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                      {/* Step 1: Institution */}
                      {activeStep === 1 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-6"
                        >
                          <h3 className="text-lg font-bold text-gray-900 mb-4">Tell us about your institution</h3>

                          <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <Building2 size={16} />
                              Institution Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name="institution"
                              placeholder="Your institution name"
                              value={formData.institution}
                              onChange={handleChange}
                              required
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#4D869C] focus:outline-none transition-colors"
                            />
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <Building2 size={16} />
                                Institution Type <span className="text-red-500">*</span>
                              </label>
                              <select
                                name="institutionType"
                                value={formData.institutionType}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#4D869C] focus:outline-none transition-colors"
                              >
                                <option value="">Select type</option>
                                {institutionTypes.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <Users size={16} />
                                Student Count <span className="text-red-500">*</span>
                              </label>
                              <select
                                name="studentCount"
                                value={formData.studentCount}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#4D869C] focus:outline-none transition-colors"
                              >
                                <option value="">Select range</option>
                                {studentCountRanges.map(range => (
                                  <option key={range} value={range}>{range}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <Users size={16} />
                              Your Role <span className="text-red-500">*</span>
                            </label>
                            <select
                              name="role"
                              value={formData.role}
                              onChange={handleChange}
                              required
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#4D869C] focus:outline-none transition-colors"
                            >
                              <option value="">Select your role</option>
                              <option value="Admin">College Administrator</option>
                              <option value="Dean">Dean/Head of Department</option>
                              <option value="Faculty">Faculty Member</option>
                              <option value="IT Manager">IT Manager</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div className="flex justify-end pt-4">
                            <button
                              type="button"
                              onClick={() => setActiveStep(2)}
                              disabled={!isStepComplete(1)}
                              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                            >
                              Next <ArrowRight size={18} />
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 2: Contact */}
                      {activeStep === 2 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-6"
                        >
                          <h3 className="text-lg font-bold text-gray-900 mb-4">Your contact information</h3>

                          <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <User size={16} />
                              Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              name="name"
                              placeholder="Enter your full name"
                              value={formData.name}
                              onChange={handleChange}
                              required
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#4D869C] focus:outline-none transition-colors"
                            />
                          </div>

                          <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <Mail size={16} />
                              Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="email"
                              name="email"
                              placeholder="your.email@institution.edu"
                              value={formData.email}
                              onChange={handleChange}
                              required
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#4D869C] focus:outline-none transition-colors"
                            />
                          </div>

                          <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <Phone size={16} />
                              Phone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              placeholder="+1 234-567-8900"
                              value={formData.phone}
                              onChange={handleChange}
                              required
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#4D869C] focus:outline-none transition-colors"
                            />
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <MapPin size={16} />
                                City <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                name="city"
                                placeholder="City"
                                value={formData.city}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#4D869C] focus:outline-none transition-colors"
                              />
                            </div>
                            <div>
                              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <MapPin size={16} />
                                State <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                name="state"
                                placeholder="State"
                                value={formData.state}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#4D869C] focus:outline-none transition-colors"
                              />
                            </div>
                          </div>

                          <div className="flex justify-between pt-4">
                            <button
                              type="button"
                              onClick={() => setActiveStep(1)}
                              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveStep(3)}
                              disabled={!isStepComplete(2)}
                              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                            >
                              Next <ArrowRight size={18} />
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 3: Requirements */}
                      {activeStep === 3 && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="space-y-6"
                        >
                          <h3 className="text-lg font-bold text-gray-900 mb-4">Demo preferences</h3>

                          <div>
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                              <Video size={16} />
                              Demo Type <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-3">
                              <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-[#4D869C] transition-colors">
                                <input
                                  type="radio"
                                  name="demoType"
                                  value="virtual"
                                  checked={formData.demoType === 'virtual'}
                                  onChange={handleChange}
                                  className="w-5 h-5 text-[#4D869C]"
                                />
                                <span className="font-medium text-gray-900">Virtual Demo (Online)</span>
                              </label>
                              <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-[#4D869C] transition-colors">
                                <input
                                  type="radio"
                                  name="demoType"
                                  value="onsite"
                                  checked={formData.demoType === 'onsite'}
                                  onChange={handleChange}
                                  className="w-5 h-5 text-[#4D869C]"
                                />
                                <span className="font-medium text-gray-900">On-site Visit</span>
                              </label>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <Calendar size={16} />
                                Preferred Date <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="date"
                                name="preferredDate"
                                value={formData.preferredDate}
                                onChange={handleChange}
                                min={new Date().toISOString().split('T')[0]}
                                required
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#4D869C] focus:outline-none transition-colors"
                              />
                            </div>

                            <div>
                              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <Clock size={16} />
                                Preferred Time
                              </label>
                              <select
                                name="preferredTime"
                                value={formData.preferredTime}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#4D869C] focus:outline-none transition-colors"
                              >
                                <option value="">Select time slot</option>
                                <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
                                <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                                <option value="11:00 AM - 12:00 PM">11:00 AM - 12:00 PM</option>
                                <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</option>
                                <option value="03:00 PM - 04:00 PM">03:00 PM - 04:00 PM</option>
                                <option value="04:00 PM - 05:00 PM">04:00 PM - 05:00 PM</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">
                              Additional Information
                            </label>
                            <textarea
                              name="message"
                              placeholder="Tell us about your specific needs or questions..."
                              rows={4}
                              value={formData.message}
                              onChange={handleChange}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#4D869C] focus:outline-none transition-colors resize-none"
                            />
                          </div>

                          <div className="flex justify-between pt-4">
                            <button
                              type="button"
                              onClick={() => setActiveStep(2)}
                              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                            >
                              Back
                            </button>
                            <button
                              type="submit"
                              disabled={!isStepComplete(3) || isSubmitting}
                              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                            >
                              <span>{isSubmitting ? 'Scheduling...' : 'Schedule Demo'}</span>
                              <CheckCircle2 size={18} />
                            </button>
                          </div>
                        </motion.div>
                      )}

                      <p className="text-xs text-gray-500 text-center mt-6">
                        By submitting this form, you agree to our Terms of Service and Privacy Policy.
                      </p>
                    </form>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-teal-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Why Schedule a Demo?</h2>
            <p className="text-xl text-gray-600">Discover how Academic Compass can benefit your institution</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)' }}
                className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 transition-all"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4D869C] to-[#7AB2B2] flex items-center justify-center text-white mb-6">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What to Expect Section */}
      <section className="py-20 bg-teal-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">What to Expect</h2>
            <p className="text-xl text-gray-600">Simple steps to get started with your personalized demo</p>
          </motion.div>

          <div className="relative">
            {demoSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className={`flex items-center gap-8 mb-16 ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
              >
                <div className="flex-1">
                  <div className={`bg-white rounded-2xl p-8 shadow-xl border-2 border-gray-100 ${index % 2 === 0 ? 'ml-auto' : 'mr-auto'} max-w-lg`}>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#4D869C] to-[#7AB2B2] flex items-center justify-center text-white mb-6">
                      {step.icon}
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h4>
                    <p className="text-gray-600 leading-relaxed">{step.description}</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4D869C] to-[#7AB2B2] flex flex-col items-center justify-center text-white shadow-lg">
                    <span className="text-xs font-bold opacity-80">STEP</span>
                    <h3 className="text-2xl font-extrabold">{step.number}</h3>
                  </div>
                  {index < demoSteps.length - 1 && (
                    <div className="w-1 h-24 bg-gradient-to-b from-[#4D869C] to-[#7AB2B2] rounded-full"></div>
                  )}
                </div>
                <div className="flex-1"></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute w-96 h-96 rounded-full bg-white -top-48 -left-48"></div>
          <div className="absolute w-96 h-96 rounded-full bg-white -bottom-48 -right-48"></div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto px-6 text-center relative z-10"
        >
          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6">Ready to Transform Your Institution?</h2>
          <p className="text-xl text-white/90 mb-10">Join hundreds of institutions already using Academic Compass</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-[#4D869C] rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
          >
            <span>Schedule Your Demo Now</span>
            <ArrowRight size={20} />
          </button>
        </motion.div>
      </section>
    </div>
  );
}
