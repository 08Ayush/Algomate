'use client';

export default function DashboardFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-200 py-6 px-6 mt-auto transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Left side - Copyright */}
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-600">
              © {currentYear} Algomate. All rights reserved.
            </p>
          </div>

          {/* Right side - Links */}
          <div className="flex items-center space-x-6">
            <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Architecture
            </button>
            <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Stack
            </button>
            <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Schema
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}