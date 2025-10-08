import Link from 'next/link';

export function CTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="container mx-auto max-w-4xl">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur-2xl opacity-20"></div>
          <div className="relative bg-gradient-to-r from-primary to-purple-600 rounded-2xl p-8 sm:p-12 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-primary-foreground">
              Ready to Transform Your Academic Journey?
            </h2>
            <p className="text-xl mb-8 text-primary-foreground/90">
              Join thousands of students who have already discovered their path to success with Academic Compass.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/register" className="bg-background text-primary hover:bg-background/90 px-8 py-3 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 shadow-lg">
                Get Started Free
              </Link>
              <Link href="/login" className="border-2 border-primary-foreground/80 text-primary-foreground hover:bg-primary-foreground hover:text-primary px-8 py-3 rounded-lg text-lg font-semibold transition-all transform hover:scale-105">
                Sign In
              </Link>
            </div>
            
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/80">
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