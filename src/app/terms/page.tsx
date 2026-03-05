import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { GoBackButton } from '@/components/GoBackButton';

export const metadata = {
  title: 'Terms of Service – Algomate',
  description: 'Terms of Service for Algomate Smart Timetable Scheduler',
};

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last updated: March 5, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700">

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p className="leading-relaxed">
                By accessing or using the Algomate platform ("Service"), you agree to be bound by these Terms of
                Service ("Terms"). If you are registering on behalf of an educational institution, you represent
                and warrant that you have the authority to bind that institution to these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
              <p className="leading-relaxed">
                Algomate is an enterprise ERP and AI-powered timetable scheduling platform designed exclusively
                for educational institutions. The Service includes academic scheduling, faculty management,
                student batch assignment, and related administrative tools.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Access and Registration</h2>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Access to the platform is granted only to registered educational institutions via an approved
                  registration token issued by Algomate.</li>
                <li>Individual self-registration is not permitted. All users must be created by their institution's
                  designated College Administrator.</li>
                <li>You are responsible for maintaining the confidentiality of your login credentials and for all
                  activities that occur under your account.</li>
                <li>You must notify us immediately of any unauthorized use of your account.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Acceptable Use</h2>
              <p className="leading-relaxed mb-3">You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2 leading-relaxed">
                <li>Use the Service for any unlawful purpose or in violation of any applicable laws or regulations.</li>
                <li>Attempt to gain unauthorized access to any part of the Service or its related systems.</li>
                <li>Transmit any harmful, offensive, or disruptive content through the Service.</li>
                <li>Reverse engineer, decompile, or attempt to extract the source code of the Service.</li>
                <li>Use the Service to store or transmit malicious code or malware.</li>
                <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Institutional Data</h2>
              <p className="leading-relaxed">
                You retain ownership of all academic data, faculty records, and student information you upload to
                the platform ("Institutional Data"). By using the Service, you grant Algomate a limited license to
                process this data solely for the purpose of providing and improving the Service. We do not sell
                your Institutional Data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Intellectual Property</h2>
              <p className="leading-relaxed">
                The Algomate platform, including its AI algorithms, UI design, and software, is the exclusive
                intellectual property of Algomate. Nothing in these Terms grants you any right to use our
                trademarks, logos, or proprietary technology outside the scope of using the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Service Availability</h2>
              <p className="leading-relaxed">
                We strive to maintain high availability of the Service but do not guarantee uninterrupted access.
                Scheduled maintenance, updates, or events beyond our control may temporarily affect availability.
                We will endeavor to provide advance notice of planned downtime where possible.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Limitation of Liability</h2>
              <p className="leading-relaxed">
                To the maximum extent permitted by law, Algomate shall not be liable for any indirect, incidental,
                special, consequential, or punitive damages, including loss of data or profits, arising from your
                use of or inability to use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Termination</h2>
              <p className="leading-relaxed">
                We reserve the right to suspend or terminate your institution's access to the Service at any time
                for violation of these Terms. Upon termination, you may request an export of your Institutional
                Data within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to Terms</h2>
              <p className="leading-relaxed">
                We may update these Terms from time to time. We will notify registered institutions of material
                changes via email. Continued use of the Service after changes constitutes acceptance of the
                revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact</h2>
              <p className="leading-relaxed">
                For questions about these Terms, please contact us at{' '}
                <a href="mailto:support@algomate.io" className="text-primary hover:underline">
                  support@algomate.io
                </a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
