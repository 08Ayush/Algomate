import Link from 'next/link';

export function CTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-2xl opacity-20"></div>
          <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 sm:p-12 text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Transform Your Academic Journey?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of students who have already discovered their path to success with Academic Compass.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/register" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg text-lg font-semibold transition-colors transform hover:scale-105">
                Get Started Free
              </Link>
              <Link href="/login" className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold transition-colors transform hover:scale-105">
                Sign In
              </Link>
            </div>
            
            <div className="mt-8 flex items-center justify-center space-x-8 text-sm opacity-80">
              <div className="flex items-center space-x-2">
                <span>✓</span>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>✓</span>
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>✓</span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}