export function Features() {
  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Recommendations',
      description: 'Get intelligent course and career suggestions based on your interests, skills, and goals using advanced AI algorithms.',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: '📅',
      title: 'Smart Planning Tools',
      description: 'Create and manage your academic schedule with intelligent planning tools that adapt to your learning style.',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: '🎓',
      title: 'Career Path Mapping',
      description: 'Explore different career paths and understand the educational requirements for your dream job.',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: '📊',
      title: 'Progress Analytics',
      description: 'Detailed insights into your academic performance with actionable recommendations for improvement.',
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: '🤝',
      title: 'Mentorship Network',
      description: 'Connect with experienced professionals and peers in your field for guidance and networking.',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      icon: '💡',
      title: 'Study Resources',
      description: 'Access curated study materials, practice tests, and learning resources tailored to your subjects.',
      color: 'from-teal-500 to-green-500'
    }
  ];

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Powerful Features for Academic Success
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Everything you need to plan, track, and achieve your educational goals in one comprehensive platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 dark:border-gray-700"
            >
              <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <span className="text-2xl">{feature.icon}</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105">
            Explore All Features
          </button>
        </div>
      </div>
    </section>
  );
}