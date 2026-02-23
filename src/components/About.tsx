export function About() {
  const stats = [
    { number: '50K+', label: 'Students Guided' },
    { number: '95%', label: 'Success Rate' },
    { number: '200+', label: 'Universities Partnered' },
    { number: '24/7', label: 'Support Available' }
  ];

  return (
    <section id="about" className="py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
              Empowering Students to Reach Their Full Potential
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              At Academic Compass, we believe every student deserves personalized guidance on their educational journey. 
              Our mission is to democratize access to quality academic counseling and career guidance through technology, 
              fully aligned with the National Education Policy (NEP) 2020.
            </p>
            <p className="text-lg text-muted-foreground mb-8">
              Founded by educators and technologists, we combine deep academic expertise with cutting-edge AI to provide 
              students with the tools and insights they need to make informed decisions about their future. Our platform 
              implements NEP 2020's Choice-Based Credit System (CBCS) and supports multidisciplinary learning approaches.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {stat.number}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-2xl blur-2xl"></div>
            <div className="relative bg-card rounded-2xl p-8 shadow-2xl border border-border">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-card-foreground mb-1">Personalized Learning Paths</h4>
                    <p className="text-muted-foreground text-sm">Customized recommendations based on your unique profile</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 dark:text-purple-400">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-card-foreground mb-1">Expert Mentorship</h4>
                    <p className="text-muted-foreground text-sm">Connect with industry professionals and academic advisors</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-accent">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-card-foreground mb-1">Data-Driven Insights</h4>
                    <p className="text-muted-foreground text-sm">Make informed decisions with comprehensive analytics</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}