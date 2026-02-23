'use client';

import { Navigation } from '@/components/landing/Navigation';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { UserRolesSection } from '@/components/landing/UserRolesSection';
import { AboutSection } from '@/components/landing/AboutSection';
import { ContactSection } from '@/components/landing/ContactSection';
import { FooterSection } from '@/components/landing/FooterSection';

export default function Home() {
  return (
    <div className="w-full overflow-x-hidden">
      {/* Floating Background Shapes */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#B8E5E5] rounded-full opacity-20 blur-3xl animate-[float_6s_ease-in-out_infinite]"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-[#5FB3B3] rounded-full opacity-20 blur-3xl animate-[float_8s_ease-in-out_infinite_1s]"></div>
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-[#2563A3] rounded-full opacity-20 blur-3xl animate-[float_7s_ease-in-out_infinite_2s]"></div>
      </div>

      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <UserRolesSection />
        <AboutSection />
        <ContactSection />
      </main>

      {/* Footer */}
      <FooterSection />
    </div>
  );
}