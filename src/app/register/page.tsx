'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Building2,
  Users,
  ShieldCheck,
  ArrowRight,
  Info,
  HelpCircle,
  Lock,
  GraduationCap
} from 'lucide-react';
import { Navigation } from '@/components/landing/Navigation';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 overflow-hidden bg-teal-50 min-h-screen flex flex-col justify-center">
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
          className="max-w-4xl mx-auto px-6 relative z-10"
        >
          {/* Header Section */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-24 h-24 bg-gradient-to-br from-[#4D869C] to-[#7AB2B2] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl rotate-3"
            >
              <Lock className="h-12 w-12 text-white" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6"
            >
              Registration Access
              <br />
              <span className="bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] bg-clip-text text-transparent">
                Restricted Area
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed"
            >
              Algomate is an enterprise platform designed for educational institutions.
              Direct registration is limited to protect data integrity.
            </motion.p>
          </div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 px-8 py-6">
              <div className="flex items-start gap-4">
                <Info className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-amber-900">
                    How Does Registration Work?
                  </h3>
                  <p className="text-amber-800/80 mt-1">
                    Individual users cannot register directly. Please follow the instructions below based on your role.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* For Institutions */}
              <div className="flex items-start gap-6 group hover:bg-gray-50 p-4 rounded-2xl transition-colors">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                  <Building2 className="h-7 w-7 text-[#4D869C]" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">
                    For Institutions
                  </h4>
                  <p className="text-gray-600 leading-relaxed mb-3">
                    Colleges and universities can request a demo. Upon approval,
                    you'll receive a unique registration link to onboard your institution.
                  </p>
                  <Link
                    href="/demo"
                    className="inline-flex items-center gap-2 text-[#4D869C] font-semibold hover:gap-3 transition-all"
                  >
                    Request a Demo <ArrowRight size={18} />
                  </Link>
                </div>
              </div>

              {/* For Faculty/Staff */}
              <div className="flex items-start gap-6 group hover:bg-gray-50 p-4 rounded-2xl transition-colors">
                <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-teal-100 transition-colors">
                  <ShieldCheck className="h-7 w-7 text-[#7AB2B2]" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">
                    For Faculty & Staff
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    Your College Administrator will create your account and provide
                    you with login credentials. Contact your IT department or Admin office.
                  </p>
                </div>
              </div>

              {/* For Students */}
              <div className="flex items-start gap-6 group hover:bg-gray-50 p-4 rounded-2xl transition-colors">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                  <Users className="h-7 w-7 text-indigo-500" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">
                    For Students
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    Student accounts are created by your college administration during the batch onboarding process.
                    You'll receive credentials from your college office.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Already have credentials */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 text-center"
          >
            <div className="inline-block bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/40 shadow-xl max-w-2xl w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
                <HelpCircle className="h-6 w-6 text-[#4D869C]" />
                Already have credentials?
              </h3>
              <p className="text-gray-600 mb-8">
                If your institution is already registered and you have received your login credentials,
                you can sign in directly.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#4D869C] to-[#7AB2B2] text-white rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all"
              >
                Go to Login
                <ArrowRight size={20} />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
