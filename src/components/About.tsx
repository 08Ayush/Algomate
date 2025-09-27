export function About() {
  const stats = [
    { number: '50K+', label: 'Students Guided' },
    { number: '95%', label: 'Success Rate' },
    { number: '200+', label: 'Universities Partnered' },
    { number: '24/7', label: 'Support Available' }
  ];

  return (
    <section id="about" className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Empowering Students to Reach Their Full Potential
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              At Academic Compass, we believe every student deserves personalized guidance on their educational journey. 
              Our mission is to democratize access to quality academic counseling and career guidance through technology.
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Founded by educators and technologists, we combine deep academic expertise with cutting-edge AI to provide 
              students with the tools and insights they need to make informed decisions about their future.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-2xl"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 dark:text-blue-400">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Personalized Learning Paths</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Customized recommendations based on your unique profile</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 dark:text-purple-400">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Expert Mentorship</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Connect with industry professionals and academic advisors</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 dark:text-green-400">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Data-Driven Insights</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Make informed decisions with comprehensive analytics</p>
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