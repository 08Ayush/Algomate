import Link from 'next/link';
import { ArrowRight, Building2, Phone, Calendar, CheckCircle } from 'lucide-react';

export function CTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 rounded-3xl blur-2xl opacity-20"></div>
          <div className="relative bg-gradient-to-r from-primary to-purple-600 rounded-3xl p-8 sm:p-12 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative grid lg:grid-cols-2 gap-8 items-center">
              {/* Left Content */}
              <div className="text-left">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 text-white">
                  Ready to Transform Your Institution?
                </h2>
                <p className="text-lg sm:text-xl mb-6 text-white/90">
                  Join 500+ educational institutions that have streamlined their academic management 
                  with Academic Compass ERP.
                </p>
                
                <div className="space-y-3 mb-8">
                  {[
                    'Free personalized demo for your institution',
                    'No commitment required',
                    'Expert onboarding support',
                    'Custom pricing for your needs'
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-white/90">
                      <CheckCircle className="h-5 w-5 text-green-300 flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link 
                    href="/demo" 
                    className="group inline-flex items-center justify-center bg-white text-primary hover:bg-white/95 px-8 py-4 rounded-xl text-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    Schedule Free Demo
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link 
                    href="/login" 
                    className="inline-flex items-center justify-center border-2 border-white/80 text-white hover:bg-white/10 px-8 py-4 rounded-xl text-lg font-semibold transition-all"
                  >
                    <Building2 className="mr-2 h-5 w-5" />
                    Institution Login
                  </Link>
                </div>
              </div>
              
              {/* Right Content - Contact Card */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 lg:p-8 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Prefer to talk to us?
                </h3>
                <p className="text-white/80 mb-6">
                  Our education technology experts are ready to understand your needs and provide 
                  a tailored solution.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-white/70">Sales Hotline</p>
                      <p className="font-semibold">+91 XXXXXXXXXX</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-white">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-white/70">Email Us</p>
                      <p className="font-semibold">sales@academiccompass.com</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/20">
                  <p className="text-sm text-white/70">
                    Available Mon-Sat, 9 AM - 6 PM IST
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}