import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { GoBackButton } from '@/components/GoBackButton';

export const metadata = {
  title: 'Privacy Policy – Algomate',
  description: 'Privacy Policy for Algomate Smart Timetable Scheduler',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">Algomate</span>
          </Link>
          <GoBackButton />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: March 5, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700">

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
              <p className="leading-relaxed">
                Algomate ("we", "us", or "our") is committed to protecting the privacy of educational
                institutions and their users. This Privacy Policy explains how we collect, use, store, and
                protect information when you use our platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
              <h3 className="text-base font-semibold text-gray-800 mb-2">2.1 Institutional Registration Data</h3>
              <ul className="list-disc pl-6 space-y-1 leading-relaxed mb-4">
                <li>Institution name, college code, address, and contact details</li>
                <li>Principal and administrative staff information</li>
                <li>Academic configuration (year, working days, timings)</li>
              </ul>
              <h3 className="text-base font-semibold text-gray-800 mb-2">2.2 User Account Data</h3>
              <ul className="list-disc pl-6 space-y-1 leading-relaxed mb-4">
                <li>Name, email address, phone number, and role</li>
                <li>College UID (auto-generated login identifier)</li>
                <li>Encrypted password (we never store passwords in plain text)</li>
              </ul>
              <h3 className="text-base font-semibold text-gray-800 mb-2">2.3 Academic / Operational Data</h3>
              <ul className="list-disc pl-6 space-y-1 leading-relaxed mb-4">
                <li>Department, batch, and course information</li>
                <li>Subject assignments and faculty allocations</li>
                <li>Generated timetable data</li>
              </ul>
              <h3 className="text-base font-semibold text-gray-800 mb-2">2.4 Usage Data</h3>
              <ul className="list-disc pl-6 space-y-1 leading-relaxed">
                <li>Log data including IP addresses, browser type, and pages visited</li>
                <li>Feature usage patterns to improve the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li><strong>Service Delivery:</strong> To operate the timetable scheduling and ERP features.</li>
                <li><strong>Account Management:</strong> To create and manage institutional user accounts.</li>
                <li><strong>Communications:</strong> To send credential emails, registration links, and important
                  service notifications.</li>
                <li><strong>Security:</strong> To detect and prevent unauthorized access and abuse.</li>
                <li><strong>Improvement:</strong> To analyze usage patterns and enhance the platform.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Storage and Security</h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>All data is stored in a secure, encrypted database hosted on enterprise-grade cloud
                  infrastructure.</li>
                <li>Passwords are hashed using bcrypt and are never stored or transmitted in plain text.</li>
                <li>Access to data is restricted to authenticated users within your institution.</li>
                <li>We implement row-level security and role-based access control to ensure data isolation
                  between institutions.</li>
                <li>Regular backups are performed to prevent data loss.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Sharing</h2>
              <p className="leading-relaxed mb-3">
                We do not sell, rent, or share your Institutional Data with third parties except:
              </p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li><strong>Service Providers:</strong> Trusted infrastructure providers (e.g., database hosting,
                  email delivery) who process data only on our behalf and under strict confidentiality agreements.</li>
                <li><strong>Legal Requirements:</strong> When required by law or to respond to valid legal processes.</li>
                <li><strong>Safety:</strong> To protect the rights, property, or safety of Algomate, our users, or the public.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Cookies and Local Storage</h2>
              <p className="leading-relaxed">
                We use session cookies and browser storage (sessionStorage/localStorage) strictly for
                authentication, session management, and to preserve your form progress within the platform.
                We do not use tracking cookies or advertiser cookies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Data Retention</h2>
              <p className="leading-relaxed">
                Institutional and user data is retained for the duration of your active subscription. Upon
                termination of your account, you may request a data export. Data is permanently deleted from
                our systems within 90 days of account termination unless legally required to retain it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Your Rights</h2>
              <p className="leading-relaxed mb-3">As an institution administrator, you have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Access and review all data associated with your institution</li>
                <li>Correct inaccurate data via the admin dashboard</li>
                <li>Request deletion of your institution's data</li>
                <li>Export your data in a portable format</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Children's Privacy</h2>
              <p className="leading-relaxed">
                The platform is intended for use by educational institutions and their authorized staff. While
                student records may be managed within the platform, we do not knowingly collect personal
                information directly from individuals under the age of 13.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
              <p className="leading-relaxed">
                We may update this Privacy Policy periodically. We will notify registered institutions of
                material changes via email. The "Last updated" date at the top reflects the most recent revision.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact Us</h2>
              <p className="leading-relaxed">
                For privacy-related questions or to exercise your data rights, please contact:{' '}
                <a href="mailto:support@algomate.io" className="text-primary hover:underline">
                  support@algomate.io
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
