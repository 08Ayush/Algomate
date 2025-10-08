import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "@/lib/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";
import { 
  Calendar, 
  Clock, 
  Users, 
  BookOpen, 
  Building2, 
  Zap,
  Bot,
  Shield,
  CheckCircle,
  ArrowRight,
  Star,
  Target,
  TrendingUp,
  Sparkles,
  GraduationCap,
  ChevronRight,
  MonitorSpeaker,
  Wifi,
  Camera,
  Volume2,
  Laptop,
  BarChart3,
  Database,
  Brain,
  Settings,
  Globe,
  Award
} from "lucide-react";

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  
  console.log('🏠 Landing Page Rendered:', {
    currentPath: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
    currentTheme: theme,
    timestamp: new Date().toISOString()
  });

  // Debug function to clear authentication for testing
  const clearAuth = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
      window.location.reload();
    }
  };

  // Simple theme toggle function
  const toggleTheme = () => {
    const currentTheme = theme === 'system' ? 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 
      theme;
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  const features = [
    {
      icon: Calendar,
      title: "AI-Powered Timetable Generation",
      description: "Advanced algorithms automatically create conflict-free schedules with optimal resource allocation and faculty workload balancing.",
      color: "text-blue-600"
    },
    {
      icon: MonitorSpeaker,
      title: "Smart Classroom Management",
      description: "Integrated IoT equipment control with real-time monitoring of interactive boards, projectors, and audio systems.",
      color: "text-green-600"
    },
    {
      icon: Bot,
      title: "Telegram Bot Integration",
      description: "Real-time notifications, schedule updates, and interactive commands through our intelligent Telegram bot system.",
      color: "text-purple-600"
    },
    {
      icon: Shield,
      title: "Department Security & Isolation",
      description: "Multi-tenant architecture with role-based access control ensuring complete data security and department privacy.",
      color: "text-orange-600"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics Dashboard",
      description: "Comprehensive insights into room utilization, faculty workload, and scheduling efficiency with predictive analytics.",
      color: "text-cyan-600"
    },
    {
      icon: Database,
      title: "Comprehensive Academic Management",
      description: "Complete student, faculty, subject, and batch management with automated conflict detection and resolution.",
      color: "text-pink-600"
    }
  ];

  const smartClassroomFeatures = [
    {
      icon: MonitorSpeaker,
      title: "Interactive Smart Boards",
      description: "4K touch-enabled displays with wireless connectivity"
    },
    {
      icon: Camera,
      title: "HD Recording & Streaming",
      description: "Automated lecture recording with live streaming capabilities"
    },
    {
      icon: Volume2,
      title: "Premium Audio Systems",
      description: "Crystal clear sound with voice amplification technology"
    },
    {
      icon: Wifi,
      title: "Smart IoT Integration",
      description: "Automated climate control and equipment management"
    }
  ];

  const benefits = [
    {
      icon: Clock,
      title: "90% Time Reduction",
      description: "Generate complete timetables in minutes instead of days"
    },
    {
      icon: Target,
      title: "Zero Conflicts Guaranteed",
      description: "Advanced AI prevents all scheduling conflicts automatically"
    },
    {
      icon: Award,
      title: "98% Quality Score",
      description: "Industry-leading optimization with quality metrics"
    },
    {
      icon: TrendingUp,
      title: "Smart Resource Optimization",
      description: "Maximize classroom and faculty utilization efficiency"
    }
  ];

  const stats = [
    { number: "500+", label: "Educational Institutions" },
    { number: "50,000+", label: "Students Managed" },
    { number: "2,000+", label: "Smart Classrooms" },
    { number: "99.9%", label: "System Uptime" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <GraduationCap className="h-8 w-8 text-primary" />
              
            </div>
            <span className="text-2xl font-bold text-foreground">
              The Academic Campass 
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleTheme}
              className="relative"
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/signin">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-grid" />
        <div className="container relative">
          <div className="mx-auto max-w-5xl text-center">
            <Badge variant="secondary" className="mb-6 text-sm font-medium animate-pulse">
              <Sparkles className="mr-2 h-4 w-4" />
              Next-Generation Smart Timetable Management System
            </Badge>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Transform Your{" "}
              <span className="bg-gradient-to-r from-primary via-purple-600 to-purple-600 bg-clip-text text-transparent">
                Educational Institution
              </span>
              {" "}With Us
            </h1>
            <p className="mb-8 text-xl text-muted-foreground sm:text-2xl max-w-3xl mx-auto">
              The most advanced Smart Timetable Scheduling System. 
              Powered by automation, designed for excellence, built for the future of education.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row mb-12">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90" asChild>
                <Link href="/register">
                  Start Your Free Trial Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="/signin">
                  Access Dashboard
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-primary">{stat.number}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50 relative">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Complete Smart Classroom Ecosystem
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to manage modern educational institutions with AI-powered automation and smart technology integration
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="relative overflow-hidden border-0 bg-background/80 backdrop-blur hover:bg-background/90 transition-all duration-300 hover:shadow-lg group">
                <CardHeader>
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-background to-muted ${feature.color} group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Smart Classroom Features */}
      <section className="py-20">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20 items-center">
            <div>
              <Badge variant="outline" className="mb-4">
                <MonitorSpeaker className="mr-2 h-4 w-4" />
                Smart Classroom Technology
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                Next-Generation Learning Environments
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Transform traditional classrooms into intelligent learning spaces with integrated IoT devices, 
                automated controls, and real-time monitoring capabilities.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {smartClassroomFeatures.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <Card className="p-8 bg-gradient-to-br from-primary/5 via-blue-50/50 to-purple-50/50 dark:from-primary/5 dark:via-blue-950/20 dark:to-purple-950/20 border-primary/20">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">AI Timetable Generation</span>
                    <Badge variant="secondary" className="animate-pulse">
                      <Brain className="mr-1 h-3 w-3" />
                      AI Processing
                    </Badge>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Analyzing 2,500+ constraints</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Optimizing 847 schedules</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Smart classroom allocation</span>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Validating conflicts</span>
                      <Clock className="h-5 w-5 text-primary animate-spin" />
                    </div>
                  </div>
                  <div className="bg-background rounded-xl p-6 border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Overall Quality Score</span>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-2xl font-bold text-primary">98.7%</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div className="bg-gradient-to-r from-primary to-blue-600 h-3 rounded-full w-[98.7%] transition-all duration-1000"></div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>Faculty Satisfaction: 96%</span>
                      <span>Room Optimization: 99%</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Why Leading Institutions Choose Us
            </h2>
            <p className="text-lg text-muted-foreground">
              Join the educational revolution with proven results and measurable improvements
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center p-6 bg-background/80 backdrop-blur border-0 hover:shadow-lg transition-all duration-300 group">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <benefit.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary via-blue-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.1] bg-grid" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl mb-6">
              Ready to Revolutionize Your Institution?
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-8">
              Join over 500+ educational institutions already transforming their scheduling and classroom management with our AI-powered platform
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto bg-white text-primary hover:bg-white/90" asChild>
                <Link href="/register">
                  Start Your Free Trial Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-white/30 text-primary hover:bg-white/10" asChild>
                <Link href="/signin">
                  Access Existing Account
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
            <p className="text-sm text-primary-foreground/70 mt-6">
              ✓ No credit card required ✓ 30-day free trial ✓ Full feature access
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur">
        <div className="container py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">The Academic Campass </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                The world's most advanced Smart Classroom and Timetable Scheduling System for modern educational institutions.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <div className="space-y-2 text-sm">
                <Link href="/features" className="block text-muted-foreground hover:text-primary">Features</Link>
                <Link href="/pricing" className="block text-muted-foreground hover:text-primary">Pricing</Link>
                <Link href="/demo" className="block text-muted-foreground hover:text-primary">Live Demo</Link>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <div className="space-y-2 text-sm">
                <Link href="/docs" className="block text-muted-foreground hover:text-primary">Documentation</Link>
                <Link href="/support" className="block text-muted-foreground hover:text-primary">Help Center</Link>
                <Link href="/contact" className="block text-muted-foreground hover:text-primary">Contact Us</Link>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <div className="space-y-2 text-sm">
                <Link href="/about" className="block text-muted-foreground hover:text-primary">About Us</Link>
                <Link href="/careers" className="block text-muted-foreground hover:text-primary">Careers</Link>
                <Link href="/privacy" className="block text-muted-foreground hover:text-primary">Privacy Policy</Link>
              </div>
            </div>
          </div>
          <div className="border-t pt-8 mt-8">
            <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
              <p className="text-sm text-muted-foreground">
                © 2025 The Academic Campass . All rights reserved. Transforming education with technology.
              </p>
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="text-xs">
                  <Globe className="mr-1 h-3 w-3" />
                  500+ Institutions
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Award className="mr-1 h-3 w-3" />
                  Award Winning
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}