import Link from 'next/link';
import { GraduationCap, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Documentation – Algomate',
  description: 'Complete platform documentation for Algomate Smart Timetable Scheduler — roles, features, and step-by-step guides.',
};

const sections = [
  { id: 'overview', label: 'Platform Overview' },
  { id: 'roles', label: 'User Roles' },
  { id: 'super-admin', label: 'Super Admin' },
  { id: 'college-admin', label: 'College Admin' },
  { id: 'faculty-creator', label: 'Faculty Creator' },
  { id: 'faculty', label: 'Faculty' },
  { id: 'timetable', label: 'Timetable Generation' },
  { id: 'scheduling', label: 'Manual Scheduling' },
  { id: 'notifications', label: 'Notifications & Events' },
  { id: 'faq', label: 'FAQ' },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors">
            <GraduationCap className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-lg">Algomate</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 flex gap-8">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">Contents</p>
            <nav className="space-y-1">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12 space-y-14">

            {/* Platform Overview */}
            <section id="overview">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Algomate Documentation</h1>
              <p className="text-sm text-gray-400 mb-6">Version 1.0 — March 2026</p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Algomate</strong> is an intelligent academic ERP and timetable scheduling platform built
                for engineering and higher-education institutions. It automates the complex task of generating
                conflict-free timetables while giving administrators, faculty creators, and faculty members
                real-time visibility and control over their academic schedules.
              </p>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Core Capabilities</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 leading-relaxed">
                <li>AI-powered conflict-free timetable generation using a genetic algorithm scheduler</li>
                <li>Multi-tenant architecture: a single installation supports multiple colleges</li>
                <li>Role-based access control with four distinct user roles</li>
                <li>Department, batch, subject, and faculty management</li>
                <li>Manual schedule override and slot editing</li>
                <li>Faculty workload balancing and qualification enforcement</li>
                <li>Lab and theory session management with 1-hour and 2-hour slot support</li>
                <li>Real-time notifications, announcements, and academic calendar events</li>
                <li>PDF timetable export and sharing</li>
                <li>NEP 2020-compliant credit system support</li>
              </ul>
            </section>

            {/* User Roles */}
            <section id="roles">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">User Roles</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                Algomate uses four hierarchical roles. Each role has a dedicated dashboard and a specific set
                of permissions.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-gray-800">Role</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-800">Scope</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-800">Login ID Format</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 font-medium text-blue-700">Super Admin</td>
                      <td className="px-4 py-3 text-gray-600">Platform-wide (all colleges)</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">SA-ADMIN-XXXXXX</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-3 font-medium text-teal-700">College Admin</td>
                      <td className="px-4 py-3 text-gray-600">Single college (all departments)</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">COLLEGECODE-ADMIN-XXXXXX</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-purple-700">Faculty Creator</td>
                      <td className="px-4 py-3 text-gray-600">Single department (schedule creation)</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">COLLEGECODE-FC-XXXXXX</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-4 py-3 font-medium text-green-700">Faculty</td>
                      <td className="px-4 py-3 text-gray-600">Personal schedule view only</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">COLLEGECODE-FAC-XXXXXX</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Super Admin */}
            <section id="super-admin">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Super Admin</h2>
              <p className="text-gray-700 leading-relaxed mb-5">
                The Super Admin manages the entire Algomate platform across all institutions. This role is
                reserved for the platform operator (e.g., the Algomate team).
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">Features &amp; Use Cases</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                <li>View all registered colleges and their status</li>
                <li>Generate secure registration tokens to invite new colleges to self-register</li>
                <li>Monitor demo requests submitted from the landing page</li>
                <li>Platform-level analytics and system health overview</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">Step-by-Step: Onboarding a New College</h3>
              <ol className="list-decimal pl-6 space-y-3 text-gray-700">
                <li>Log in at <code className="bg-gray-100 px-1 rounded text-sm">/login</code> using the Super Admin UID and password.</li>
                <li>Navigate to <strong>Registration Tokens</strong> in the sidebar.</li>
                <li>Click <strong>Generate Token</strong>, enter the institution name and admin email, then click <strong>Generate</strong>.</li>
                <li>The system generates a secure token URL (e.g., <code className="bg-gray-100 px-1 rounded text-sm">/college/register?token=abc123</code>) and automatically emails it to the provided address.</li>
                <li>You can also copy the URL and share it manually or via the mailto button in the token list.</li>
                <li>Once the college admin completes registration using the token link, the college appears in the Colleges list.</li>
              </ol>
            </section>

            {/* College Admin */}
            <section id="college-admin">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">College Admin</h2>
              <p className="text-gray-700 leading-relaxed mb-5">
                The College Admin is responsible for setting up the entire academic structure of a college —
                departments, batches, subjects, classrooms, faculty, and time slots. They are the primary
                operator for the platform within their institution.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">Features &amp; Use Cases</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                <li><strong>College Profile:</strong> Set college name, code, logo, address, principal info, working days, and semester dates.</li>
                <li><strong>Departments:</strong> Create and manage academic departments.</li>
                <li><strong>Batches / Divisions:</strong> Define student batches per department and year (e.g., CSE-B-2024).</li>
                <li><strong>Subjects:</strong> Add subjects with credit hours, lab/theory type, and assign them to batches.</li>
                <li><strong>Classrooms &amp; Labs:</strong> Register rooms with capacity and type; used for automatic room allocation during scheduling.</li>
                <li><strong>Time Slots:</strong> Configure daily time slots with start/end times and durations (1-hour or 2-hour).</li>
                <li><strong>Faculty:</strong> Register faculty members, set their qualifications, max weekly hours, and assign them to departments.</li>
                <li><strong>Faculty Creators:</strong> Create Faculty Creator accounts for specific departments.</li>
                <li><strong>Elective Buckets:</strong> Define elective groups where one subject is chosen from a set.</li>
                <li><strong>Events &amp; Announcements:</strong> Post college-wide notifications visible to all users.</li>
                <li><strong>Timetable Overview:</strong> View all published timetables across all departments.</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">Step-by-Step: Setting Up a College</h3>
              <ol className="list-decimal pl-6 space-y-3 text-gray-700 mb-6">
                <li>Complete registration via the token link sent by the Super Admin at <code className="bg-gray-100 px-1 rounded text-sm">/college/register?token=…</code>.</li>
                <li>Log in. You land on the <strong>College Admin Dashboard</strong>.</li>
                <li>Go to <strong>Departments</strong> → Add your departments (e.g., CSE, ENTC, Civil).</li>
                <li>Go to <strong>Batches</strong> → Create batches per department and year with student count.</li>
                <li>Go to <strong>Subjects</strong> → Add subjects, link them to the correct batch, set credit hours and type (theory/lab).</li>
                <li>Go to <strong>Classrooms</strong> → Add rooms and labs (room number, type, capacity).</li>
                <li>Go to <strong>Time Slots</strong> → Define the daily schedule slots for your college.</li>
                <li>Go to <strong>Faculty</strong> → Register faculty members with qualifications.</li>
                <li>Go to <strong>Faculty Creators</strong> → Create accounts for department heads/coordinators who will generate timetables.</li>
                <li>The college is now ready for timetable generation by Faculty Creators.</li>
              </ol>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">Step-by-Step: Managing Notifications</h3>
              <ol className="list-decimal pl-6 space-y-3 text-gray-700">
                <li>Go to <strong>Notifications</strong> in the sidebar.</li>
                <li>Click <strong>New Notification</strong>, enter title and message.</li>
                <li>Select the target audience (all users, specific department, specific role).</li>
                <li>Submit. Users see the notification on their dashboard.</li>
              </ol>
            </section>

            {/* Faculty Creator */}
            <section id="faculty-creator">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Faculty Creator</h2>
              <p className="text-gray-700 leading-relaxed mb-5">
                The Faculty Creator (typically a department head or academic coordinator) is responsible for
                generating and managing timetables for their assigned department. They have the most
                scheduling-related functionality on the platform.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">Features &amp; Use Cases</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                <li><strong>Auto-Generate Timetable:</strong> Trigger the AI scheduler to build a conflict-free timetable in seconds.</li>
                <li><strong>View &amp; Edit Schedule:</strong> Open the timetable editor to manually adjust slots, rooms, and faculty assignments.</li>
                <li><strong>Manual Scheduling:</strong> Drag-and-drop or select-based interface to place subjects into specific time slots.</li>
                <li><strong>Publish / Unpublish:</strong> Control visibility of a timetable to faculty and others.</li>
                <li><strong>Assign Faculty to Batches:</strong> Map subjects of a batch to specific faculty members before generation.</li>
                <li><strong>Check Fitness Score:</strong> Review schedule quality score (0–100%) indicating how well all constraints are satisfied.</li>
                <li><strong>Conflict Detection:</strong> The system highlights any faculty double-booking or room conflicts.</li>
                <li><strong>Multiple Timetables:</strong> Create and maintain separate timetable versions (e.g., by semester).</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">Step-by-Step: Generating a Timetable</h3>
              <ol className="list-decimal pl-6 space-y-3 text-gray-700 mb-6">
                <li>Log in as a Faculty Creator. You land on the <strong>Faculty Creator Dashboard</strong>.</li>
                <li>Ensure the College Admin has set up all departments, batches, subjects, time slots, classrooms, and faculty.</li>
                <li>Go to <strong>Faculty Assignments</strong> → Assign faculty members to each subject for each batch.</li>
                <li>Go to <strong>Timetables</strong> → Click <strong>New Timetable</strong>.</li>
                <li>Select the target semester, department, and batch range.</li>
                <li>Click <strong>Generate</strong>. The AI scheduler runs and produces a conflict-free schedule within seconds.</li>
                <li>Review the generated timetable. The <strong>Fitness Score</strong> shows constraint satisfaction (higher is better).</li>
                <li>If needed, switch to the edit view to manually adjust individual slots.</li>
                <li>Once satisfied, click <strong>Publish</strong> to make the timetable visible to faculty and the college admin.</li>
              </ol>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">Step-by-Step: Manual Slot Editing</h3>
              <ol className="list-decimal pl-6 space-y-3 text-gray-700">
                <li>Open an existing timetable and click <strong>Edit</strong>.</li>
                <li>The editor shows a weekly grid (Monday–Saturday × time slots).</li>
                <li>Click on any slot to reassign the subject, faculty member, or classroom.</li>
                <li>The system validates in real-time for conflicts (same faculty or room at the same time).</li>
                <li>Save changes. The timetable fitness score updates automatically.</li>
                <li>Re-publish once edits are complete.</li>
              </ol>
            </section>

            {/* Faculty */}
            <section id="faculty">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Faculty</h2>
              <p className="text-gray-700 leading-relaxed mb-5">
                Faculty members have a read-only view of their personal timetable. Their credentials are
                created by the College Admin and sent automatically via email.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">Features &amp; Use Cases</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-6">
                <li><strong>Personal Timetable:</strong> View your weekly teaching schedule across all assigned batches.</li>
                <li><strong>Subjects Overview:</strong> See all subjects you are assigned to teach, with batch and credit details.</li>
                <li><strong>Notifications:</strong> Receive college-wide and department-specific announcements.</li>
                <li><strong>Profile &amp; Settings:</strong> Update your personal information and password.</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">Step-by-Step: Getting Started as Faculty</h3>
              <ol className="list-decimal pl-6 space-y-3 text-gray-700">
                <li>Receive your login credentials via email (College UID and temporary password).</li>
                <li>Go to <code className="bg-gray-100 px-1 rounded text-sm">/login</code> and sign in with your College UID and password.</li>
                <li>On first login, you may be prompted to change your password.</li>
                <li>From the dashboard, click <strong>My Timetable</strong> to view your weekly schedule.</li>
                <li>Click <strong>Notifications</strong> in the sidebar to read announcements from your college.</li>
                <li>To update your profile, go to <strong>Settings</strong>.</li>
              </ol>
            </section>

            {/* Timetable Generation */}
            <section id="timetable">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Timetable Generation Engine</h2>
              <p className="text-gray-700 leading-relaxed mb-5">
                Algomate's scheduler uses an AI genetic algorithm to produce optimal timetables. It considers
                dozens of hard and soft constraints automatically.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">Hard Constraints (Always Enforced)</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-5">
                <li>No faculty member scheduled in two places simultaneously</li>
                <li>No classroom or lab double-booked</li>
                <li>No batch assigned two subjects at the same time</li>
                <li>Each subject meets the required number of sessions per week (based on credit hours)</li>
                <li>Lab sessions occupy 2-hour consecutive slots only</li>
                <li>Maximum one lab session per batch per day</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">Soft Constraints (Optimized For)</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-5">
                <li>Faculty workload evenly distributed across the week</li>
                <li>Lab sessions preferred in the first or last session of the day</li>
                <li>Avoid consecutive heavy lecture loads for faculty</li>
                <li>Faculty preferences for specific days or time slots (if configured)</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">Fitness Score Explained</h3>
              <p className="text-gray-700 leading-relaxed">
                After generation, a <strong>Fitness Score</strong> (0–100%) is displayed. A score of 100%
                means all hard and soft constraints are perfectly satisfied. Scores above 80% are generally
                acceptable for publishing. If the score is low, try editing problematic slots manually or
                re-running generation with updated constraints.
              </p>
            </section>

            {/* Manual Scheduling */}
            <section id="scheduling">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Manual Scheduling</h2>
              <p className="text-gray-700 leading-relaxed mb-5">
                Faculty Creators can manually build or modify timetables slot-by-slot using the schedule editor.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Use Manual Scheduling</h3>
              <ol className="list-decimal pl-6 space-y-3 text-gray-700">
                <li>From the Timetables list, open a timetable and switch to the <strong>Edit</strong> view.</li>
                <li>The grid displays batches on one axis and time slots on the other.</li>
                <li>Click any empty slot cell to see available subjects and faculty for that batch.</li>
                <li>Select the subject and the faculty member to assign. The room is auto-suggested based on type (lab/theory) and availability.</li>
                <li>You can override the room suggestion if needed.</li>
                <li>Conflict warnings appear immediately if the faculty or room is already occupied at that time.</li>
                <li>Click <strong>Save</strong> after each assignment. Changes persist without re-generating.</li>
              </ol>
            </section>

            {/* Notifications & Events */}
            <section id="notifications">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Notifications &amp; Events</h2>
              <p className="text-gray-700 leading-relaxed mb-5">
                Algomate supports two types of in-platform communication: Notifications (push messages) and
                Calendar Events (scheduled occurrences).
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">Notifications</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-5">
                <li>Created by College Admin or Faculty Creator</li>
                <li>Target: all users, or filtered by department/role</li>
                <li>Appear in the Notifications panel in the user's dashboard</li>
                <li>Support title, body text, and priority level</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mb-3">Calendar Events</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>College Admin creates events (exams, holidays, seminars)</li>
                <li>Visible to all users in the college calendar view</li>
                <li>Events can include date, time, location, and description</li>
                <li>Integrates with timetable view to mark affected days</li>
              </ul>
            </section>

            {/* FAQ */}
            <section id="faq">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
              <div className="space-y-5">
                {[
                  {
                    q: 'How do I get access to the platform?',
                    a: 'Contact the Algomate team at pygramalgomate@gmail.com to request a registration link. Super Admin generates a secure token URL that is emailed to your institution.',
                  },
                  {
                    q: 'Can multiple Faculty Creators exist per college?',
                    a: 'Yes. A College Admin can create multiple Faculty Creator accounts, typically one per department.',
                  },
                  {
                    q: 'What if the auto-generated timetable has conflicts?',
                    a: 'The scheduler guarantees no hard conflicts. If a conflict appears post-edit (during manual changes), the editor highlights it in real-time. You can resolve it by selecting a different slot or faculty.',
                  },
                  {
                    q: 'Can I export a timetable to PDF?',
                    a: 'Yes. From the timetable view, click the Export / Download button to generate a printable PDF version for each batch or the full department.',
                  },
                  {
                    q: 'What happens if I forget my password?',
                    a: 'Use the "Forgot Password" link on the login page. An OTP is sent to your registered email to reset your password.',
                  },
                  {
                    q: 'Is student data stored on the platform?',
                    a: 'Algomate manages batch (division) level data, not individual student records. Personal student information is not required or stored.',
                  },
                  {
                    q: 'Can an institution have multiple campuses?',
                    a: 'Currently, each registration token creates one college entity. For multi-campus setups, contact support to discuss a custom configuration.',
                  },
                  {
                    q: 'How do I contact support?',
                    a: 'Email us at pygramalgomate@gmail.com or call +91 7058435485. We are based in Nagpur, Maharashtra, India.',
                  },
                ].map((item, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-5">
                    <h4 className="font-semibold text-gray-900 mb-2">{item.q}</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Contact CTA */}
            <section className="bg-blue-50 rounded-2xl p-8 text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Need more help?</h2>
              <p className="text-gray-600 mb-4">Our team is ready to assist you with onboarding and platform usage.</p>
              <a
                href="mailto:pygramalgomate@gmail.com"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Contact Support
              </a>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
}
