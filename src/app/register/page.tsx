'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { 
  Lock, 
  Building2, 
  Users, 
  ShieldCheck, 
  ArrowRight,
  Info,
  HelpCircle
} from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <Header />
      
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Registration Access Required
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Academic Compass is an enterprise platform designed exclusively for educational institutions.
            </p>
          </div>

          {/* Info Card */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
            <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 py-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-800 dark:text-amber-300">
                    How Does Registration Work?
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    Individual users cannot register directly. Here's how our system works:
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* For Institutions */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    For Institutions
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Colleges and universities can request a demo. Upon approval, 
                    you'll receive a unique registration link to onboard your institution.
                  </p>
                  <Link 
                    href="/demo"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-sm mt-2"
                  >
                    Request a Demo <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* For Faculty/Staff */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    For Faculty & Staff
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Your College Administrator will create your account and provide 
                    you with login credentials (College UID and password).
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Contact your institution's IT department or Admin office.
                  </p>
                </div>
              </div>

              {/* For Students */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    For Students
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Student accounts are created by your college administration. 
                    You'll receive your login credentials from your college office.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Check with your class coordinator or academic office.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Already have credentials */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-gray-400" />
              Already have credentials?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              If your institution is already registered and you have received your login credentials, 
              you can sign in directly.
            </p>
            <Link 
              href="/login"
              className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Go to Login
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          {/* Contact Support */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Need help? Contact us at{' '}
              <a href="mailto:support@academiccompass.com" className="text-primary hover:underline">
                support@academiccompass.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
