import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDepartment } from "@/contexts/DepartmentContext";
import DepartmentDashboard, { DepartmentIsolationDemo } from "@/components/dashboard/DepartmentDashboard";
import { 
  Sparkles, 
  Clock, 
  Users, 
  Calendar, 
  TrendingUp, 
  Zap,
  Bot,
  Shield,
  CheckCircle,
  ArrowRight,
  PlusCircle,
  Eye,
  Building2,
  Crown
} from "lucide-react";
import TimetableCard from "@/components/timetable/TimetableCard";
import WorkflowStatus from "@/components/workflow/WorkflowStatus";

export default function Index() {
  const { user, isCreatorMentor, isPublisherMentor } = useAuth();
  const { activeDepartment, userDepartments } = useDepartment();

  // If user has department context, show department dashboard
  if (activeDepartment && (user?.role as any) !== 'admin') {
    return (
      <div className="space-y-6">
        <DepartmentDashboard />
        {(user?.role as any) === 'admin' && <DepartmentIsolationDemo />}
      </div>
    );
  }

  // Admin dashboard or fallback for users without departments

  // Mock data for demonstration
  const recentTimetables = [
    {
      id: 1,
      title: "CS Third Semester - Fall 2024",
      department: "Computer Science",
      semester: "Fall 2024",
      status: "published" as const,
      workflow_stage: "published" as const,
      creator: { name: "Dr. Smith", role: "Creator Mentor" },
      publisher: { name: "Prof. Johnson", role: "Publisher Mentor" },
      qualityScore: 0.94,
      lastUpdated: "2024-01-15T10:30:00Z",
      subjectCount: 7,
      conflictCount: 0,
      isLive: true,
      canEdit: isCreatorMentor(),
      canReview: isPublisherMentor()
    },
    {
      id: 2,
      title: "CS Fourth Semester - Spring 2024",
      department: "Computer Science", 
      semester: "Spring 2024",
      status: "pending_review" as const,
      workflow_stage: "review" as const,
      creator: { name: "Dr. Wilson", role: "Creator Mentor" },
      qualityScore: 0.89,
      lastUpdated: "2024-01-14T15:45:00Z",
      subjectCount: 8,
      conflictCount: 2,
      canEdit: isCreatorMentor(),
      canReview: isPublisherMentor()
    }
  ];

  const stats = [
    { label: "Active Timetables", value: "12", icon: Calendar, color: "text-blue-600" },
    { label: "Quality Score", value: "94%", icon: TrendingUp, color: "text-green-600" },
    { label: "Faculty Members", value: "24", icon: Users, color: "text-purple-600" },
    { label: "Avg. Generation Time", value: "3.2s", icon: Clock, color: "text-orange-600" }
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/5 via-blue-50/50 to-indigo-50/50 dark:from-primary/10 dark:via-blue-950/20 dark:to-indigo-950/20 p-8 md:p-12">
        <div className="relative z-10 max-w-4xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <Badge className="gradient-primary text-white px-4 py-1 rounded-full">
              AI-Powered
            </Badge>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Py-Gram 2k25
          </h1>
          <p className="mt-6 text-xl text-muted-foreground leading-relaxed">
            Revolutionary AI-powered timetable generation with ChatGPT-style interface. 
            Create, review, and publish optimized schedules through intelligent workflows.
          </p>
          
          <div className="mt-8 flex flex-wrap gap-4">
            {user && isCreatorMentor() && (
              <Button asChild size="lg" className="rounded-2xl gradient-primary text-white font-semibold hover:scale-105 transition-transform">
                <Link to="/timetables/create">
                  <Bot className="h-5 w-5 mr-2" />
                  Create with AI Assistant
                </Link>
              </Button>
            )}
            
            {user && isPublisherMentor() && (
              <>
                <Button asChild size="lg" className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold hover:scale-105 transition-transform">
                  <Link to="/timetables/review">
                    <Shield className="h-5 w-5 mr-2" />
                    Review Queue
                  </Link>
                </Button>
                
                <Button 
                  size="lg" 
                  className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold hover:scale-105 transition-transform"
                  onClick={() => window.open('/principle-chat-gpt.html', '_blank')}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Chat with Principal
                </Button>
              </>
            )}
            
            <Button asChild size="lg" variant="outline" className="rounded-2xl border-2 hover:scale-105 transition-transform">
              <Link to="/timetables">
                <Eye className="h-5 w-5 mr-2" />
                View Timetables
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-3xl" />
      </section>

      {user && (
        <>
          {/* Stats Section */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="modern-card text-center">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold">{stat.value}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          {/* Quick Actions */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <Zap className="h-6 w-6 text-primary" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {isCreatorMentor() && (
                <Card className="modern-card group cursor-pointer">
                  <Link to="/timetables/create">
                    <CardContent className="p-6 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Bot className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">AI Timetable Creator</h3>
                      <p className="text-sm text-muted-foreground">Create timetables from scratch with AI guidance and drag-and-drop</p>
                      <ArrowRight className="h-4 w-4 mt-4 mx-auto text-primary group-hover:translate-x-1 transition-transform" />
                    </CardContent>
                  </Link>
                </Card>
              )}

              {isPublisherMentor() && (
                <>
                  <Card className="modern-card group cursor-pointer">
                    <Link to="/timetables/review">
                      <CardContent className="p-6 text-center">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                          <Shield className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Review Pending</h3>
                        <p className="text-sm text-muted-foreground">Approve or provide feedback on submitted timetables</p>
                        <ArrowRight className="h-4 w-4 mt-4 mx-auto text-green-600 group-hover:translate-x-1 transition-transform" />
                      </CardContent>
                    </Link>
                  </Card>

                  <Card className="modern-card group cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Crown className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Principle Ask</h3>
                      <p className="text-sm text-muted-foreground mb-4">Direct communication channel to the Principal via Telegram</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full border-blue-200 hover:bg-blue-50 text-blue-700 hover:text-blue-800"
                        onClick={() => window.open('/principle-chat-gpt.html', '_blank')}
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}

              {isPublisherMentor() && !(isCreatorMentor()) && (
                <Card className="modern-card group cursor-pointer">
                  <Link to="/timetables">
                    <CardContent className="p-6 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Calendar className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">View All Timetables</h3>
                      <p className="text-sm text-muted-foreground">Browse and manage existing timetables</p>
                      <ArrowRight className="h-4 w-4 mt-4 mx-auto text-purple-600 group-hover:translate-x-1 transition-transform" />
                    </CardContent>
                  </Link>
                </Card>
              )}

              {!isPublisherMentor() && (
                <Card className="modern-card group cursor-pointer">
                  <Link to="/timetables">
                    <CardContent className="p-6 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Calendar className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">View All Timetables</h3>
                      <p className="text-sm text-muted-foreground">Browse and manage existing timetables</p>
                      <ArrowRight className="h-4 w-4 mt-4 mx-auto text-purple-600 group-hover:translate-x-1 transition-transform" />
                    </CardContent>
                  </Link>
                </Card>
              )}
            </div>
          </section>

          {/* Recent Timetables */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Calendar className="h-6 w-6 text-primary" />
                Recent Timetables
              </h2>
              <Button asChild variant="outline" className="rounded-xl">
                <Link to="/timetables">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {recentTimetables.map((timetable) => (
                <TimetableCard key={timetable.id} {...timetable} />
              ))}
            </div>
          </section>

          {/* Workflow Status Example */}
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-primary" />
              Live Workflow Status
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WorkflowStatus
                stage="published"
                status="published"
                creatorName="Dr. Smith"
                publisherName="Prof. Johnson"
                lastUpdated="2024-01-15T10:30:00Z"
                qualityScore={0.94}
                isLive={true}
              />
              <WorkflowStatus
                stage="review"
                status="pending_review"
                creatorName="Dr. Wilson"
                publisherName="Prof. Johnson"
                lastUpdated="2024-01-14T15:45:00Z"
                qualityScore={0.89}
                isLive={true}
              />
            </div>
          </section>
        </>
      )}

      {/* Features Section */}
      <section id="features" className="mt-16">
        <h2 className="text-3xl font-bold text-center mb-12">Powered by Advanced Technology</h2>
        <div className="grid gap-8 md:grid-cols-3">
          <FeatureCard 
            title="AI-Powered Generation" 
            subtitle="ChatGPT-style Interface"
            icon={Bot}
            color="from-blue-500 to-indigo-600"
          >
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>Natural language timetable creation</li>
              <li>Intelligent constraint optimization</li>
              <li>Real-time conflict resolution</li>
            </ul>
          </FeatureCard>
          
          <FeatureCard 
            title="Hybrid CSP + GA" 
            subtitle="Optimal Scheduling Algorithm"
            icon={Zap}
            color="from-green-500 to-emerald-600"
          >
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>Phase 1: OR-Tools CP-SAT for feasibility</li>
              <li>Phase 2: Genetic Algorithm optimization</li>
              <li>Continuous validity checks</li>
            </ul>
          </FeatureCard>
          
          <FeatureCard 
            title="Smart Workflow" 
            subtitle="Creator → Publisher Process"
            icon={Shield}
            color="from-purple-500 to-pink-600"
          >
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>Role-based access control</li>
              <li>Real-time status tracking</li>
              <li>Collaborative editing & approval</li>
            </ul>
          </FeatureCard>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ 
  title, 
  subtitle, 
  children, 
  icon: Icon,
  color
}: { 
  title: string; 
  subtitle?: string; 
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card className="modern-card text-center">
      <CardHeader>
        <div className="flex items-center justify-center mb-4">
          <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center`}>
            <Icon className="h-8 w-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
