import { useState } from "react";
import { Link } from "wouter";
import { ZaabuPayLogo } from "@/components/ui/ZaabuPayLogo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap,
  Users,
  BookOpen,
  CreditCard,
  BarChart3,
  Smartphone,
  Shield,
  Cloud,
  Zap,
  CheckCircle,
  ArrowRight,
  Star,
  Phone,
  Mail,
  MapPin,
  Globe,
  TrendingUp,
  Lock,
  Wifi,
} from "lucide-react";

interface DemoRequestForm {
  schoolName: string;
  contactName: string;
  email: string;
  phone: string;
  numberOfStudents: string;
  message: string;
}

interface SignupForm {
  schoolName: string; contactName: string; email: string;
  phone: string; district: string; schoolType: string;
  numberOfStudents: string; message: string;
}

export const LandingOnly = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<DemoRequestForm>({
    schoolName: "", contactName: "", email: "", phone: "", numberOfStudents: "", message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // School signup (free trial / get started)
  const [showSignup, setShowSignup] = useState(false);
  const [signupDone, setSignupDone] = useState(false);
  const [signupSubmitting, setSignupSubmitting] = useState(false);
  const [signupForm, setSignupForm] = useState<SignupForm>({
    schoolName: "", contactName: "", email: "", phone: "",
    district: "", schoolType: "secondary", numberOfStudents: "", message: ""
  });

  const openSignup = (e?: React.MouseEvent) => { e?.preventDefault(); setShowSignup(true); setSignupDone(false); };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.schoolName || !signupForm.contactName || !signupForm.email)
      return toast({ variant: "destructive", title: "Please fill required fields" });
    setSignupSubmitting(true);
    try {
      const res = await fetch("/api/signup-request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...signupForm, numberOfStudents: signupForm.numberOfStudents || null, requestType: "trial" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSignupDone(true);
      toast({ title: "Request submitted!", description: data.message });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message || "Please try again." });
    } finally {
      setSignupSubmitting(false);
    }
  };

  const handleDemoRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      toast({ title: "Request Submitted!", description: data.message });
      setFormData({
        schoolName: "",
        contactName: "",
        email: "",
        phone: "",
        numberOfStudents: "",
        message: "",
      });
    } catch (_) {
      toast({
        variant: "destructive",
        title: "Failed",
        description: "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: Users,
      title: "Student Management",
      description:
        "Complete student profiles with auto-generated payment codes, academic records, guardian contacts, and class assignments.",
    },
    {
      icon: GraduationCap,
      title: "Academic Tracking",
      description:
        "Manage classes, subjects, exams, grades, and attendance with comprehensive report cards and analytics.",
    },
    {
      icon: CreditCard,
      title: "Fee & Payment Management",
      description:
        "Integrated mobile money payments (MTN, Airtel) with automated fee tracking, receipts, and payment history.",
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description:
        "Real-time dashboards, academic performance analytics, and automated PDF report generation for parents and management.",
    },
    {
      icon: Smartphone,
      title: "Mobile-First Design",
      description:
        "Works perfectly on all devices with offline capabilities for areas with limited connectivity.",
    },
    {
      icon: Shield,
      title: "Role-Based Access Control",
      description:
        "6 user roles with granular permissions: Admin, Director, Head Teacher, Class Teacher, Subject Teacher, Bursar.",
    },
    {
      icon: Wifi,
      title: "Offline Capabilities",
      description:
        "Continue working even without internet. Data syncs automatically when connection is restored.",
    },
    {
      icon: Lock,
      title: "Bank-Grade Security",
      description:
        "Your school data is encrypted and protected with enterprise-level security standards.",
    },
    {
      icon: TrendingUp,
      title: "Growth Analytics",
      description:
        "Track enrollment trends, fee collection performance, and academic outcomes over time.",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Nakato",
      role: "Head Teacher, Kampala Primary School",
      content:
        "ZaabuPay has transformed how we run our school. The mobile money integration alone has saved us countless hours every term.",
      rating: 5,
    },
    {
      name: "John Musoke",
      role: "Director, Bright Future Schools Network",
      content:
        "Managing our 8 schools is now effortless. The role-based access and centralized reporting are absolute game-changers.",
      rating: 5,
    },
    {
      name: "Grace Akello",
      role: "Bursar, St. Mary's Secondary",
      content:
        "Fee collection has never been easier. Parents pay via mobile money and we get instant notifications with full receipts.",
      rating: 5,
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "50,000",
      period: "per school/month",
      description: "Perfect for smaller schools just getting started",
      features: [
        "Up to 200 students",
        "Basic reporting",
        "Mobile money integration",
        "Email support",
        "3 user roles",
        "Attendance tracking",
      ],
      popular: false,
      cta: "Start Free Trial",
    },
    {
      name: "Professional",
      price: "120,000",
      period: "per school/month",
      description: "The complete solution for growing schools",
      features: [
        "Up to 800 students",
        "Advanced analytics",
        "PDF report generation",
        "Priority support",
        "All 6 user roles",
        "Offline capabilities",
        "Exam management",
        "Fee automation",
      ],
      popular: true,
      cta: "Get Started Now",
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact us",
      description: "For school networks and large institutions",
      features: [
        "Unlimited students",
        "Multi-school management",
        "Custom integrations",
        "Dedicated support",
        "White-label options",
        "API access",
        "Custom reporting",
        "SLA guarantee",
      ],
      popular: false,
      cta: "Contact Sales",
    },
  ];

  const stats = [
    { value: "6+", label: "Schools" },
    { value: "950+", label: "Students" },
    { value: "UGX 48M+", label: "Fees Collected" },
    { value: "99.7%", label: "Uptime" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/90 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <ZaabuPayLogo size={56} variant="light" />
          </div>
          <nav className="hidden md:flex space-x-8">
            <a
              href="#features"
              className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              Pricing
            </a>
            <a
              href="#testimonials"
              className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              Reviews
            </a>
            <a
              href="#demo"
              className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              Contact
            </a>
          </nav>
          <div className="flex gap-3">
            <Link href="/login">
              <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                Sign In
              </Button>
            </Link>
            <Button onClick={openSignup} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              Get Started
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-100 text-sm px-4 py-1">
            🇺🇬 Built for Ugandan Schools · Available Now
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 bg-clip-text text-transparent leading-tight">
            School Management,
            <br />
            Simplified for Uganda
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-4xl mx-auto leading-relaxed">
            ZaabuPay is the all-in-one school management platform designed for
            Ugandan schools. Manage students, collect fees via mobile money,
            track academic performance — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              size="lg"
              onClick={openSignup}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-10 py-6 rounded-xl shadow-lg"
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-10 py-6 rounded-xl border-2 border-blue-200 hover:border-blue-400"
            >
              <a href="#demo">Request Live Demo</a>
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 max-w-2xl mx-auto">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-indigo-100 text-indigo-800 hover:bg-indigo-100">
              Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything Your School Needs
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From student registration to fee collection, ZaabuPay handles every
              aspect of school administration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <Card
                key={i}
                className="border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-4">
                    <feature.icon className="w-7 h-7 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Get Started in Minutes
          </h2>
          <p className="text-xl text-blue-100 mb-16 max-w-2xl mx-auto">
            No complex setup. No IT team required. Just sign up and start
            managing your school.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                title: "Create Your Account",
                desc: "Sign up with your school details. Takes under 2 minutes.",
              },
              {
                step: "2",
                title: "Add Your School Data",
                desc: "Import students, classes, and staff. We guide you every step.",
              },
              {
                step: "3",
                title: "Start Managing",
                desc: "Collect fees, track attendance, and generate reports instantly.",
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-blue-100">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <Button
              size="lg"
              onClick={openSignup}
              className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-10 py-6 rounded-xl font-semibold"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <p className="text-blue-200 text-sm mt-3">30-day free trial · No credit card · No IT team needed</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-800 hover:bg-green-100">
              Testimonials
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              What School Leaders Say
            </h2>
            <p className="text-xl text-gray-600">
              Real feedback from real Ugandan schools using ZaabuPay.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <Card
                key={i}
                className="border-0 shadow-lg hover:shadow-xl transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star
                        key={j}
                        className="w-5 h-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 italic leading-relaxed">
                    "{t.content}"
                  </p>
                  <div>
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    <p className="text-sm text-gray-500">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="py-20 px-4 bg-gradient-to-r from-gray-50 to-blue-50"
      >
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-100">
              Pricing
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your school. All plans include a 30-day
              free trial.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <Card
                key={i}
                className={`relative border-0 shadow-lg ${plan.popular ? "ring-2 ring-blue-500 scale-105 shadow-2xl" : ""}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <p className="text-sm text-gray-500">{plan.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price === "Custom"
                        ? plan.price
                        : `UGX ${plan.price}`}
                    </span>
                    <span className="text-gray-500 ml-1 text-sm">
                      /{plan.period}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3 shrink-0" />
                        <span className="text-gray-700">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={openSignup}
                    className={`w-full ${plan.popular ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" : ""}`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Request */}
      <section id="demo" className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-orange-100 text-orange-800 hover:bg-orange-100">
                Get In Touch
              </Badge>
              <h2 className="text-4xl font-bold mb-4">
                Ready to Transform Your School?
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Request a free demo and see how ZaabuPay can revolutionize your
                school management. Our team will contact you within 24 hours.
              </p>
              <div className="space-y-4 text-gray-600">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span>Free 30-day trial, no credit card needed</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span>Personalized onboarding for your school</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span>Full staff training and support included</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span>Data migration from your current system</span>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-2">
                  Already have an account?
                </p>
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    Sign in to your dashboard
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">
                  Request Your Free Demo
                </CardTitle>
                <CardDescription>
                  Fill out the form and we'll contact you within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDemoRequest} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="schoolName">School Name *</Label>
                      <Input
                        id="schoolName"
                        value={formData.schoolName}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            schoolName: e.target.value,
                          }))
                        }
                        placeholder="Your school name"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="contactName">Contact Person *</Label>
                      <Input
                        id="contactName"
                        value={formData.contactName}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            contactName: e.target.value,
                          }))
                        }
                        placeholder="Your name"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, email: e.target.value }))
                        }
                        placeholder="your@school.com"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, phone: e.target.value }))
                        }
                        placeholder="+256 700 123 456"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="numberOfStudents">Number of Students</Label>
                    <Input
                      id="numberOfStudents"
                      value={formData.numberOfStudents}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          numberOfStudents: e.target.value,
                        }))
                      }
                      placeholder="Approx. number of students"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="message">Tell us about your school</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, message: e.target.value }))
                      }
                      placeholder="Current challenges or specific requirements..."
                      rows={3}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Request Free Demo"}
                    {!isSubmitting && <ArrowRight className="ml-2 w-5 h-5" />}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center mb-4">
                <ZaabuPayLogo size={52} variant="dark" />
              </div>
              <p className="text-gray-400 leading-relaxed text-sm">
                Empowering Ugandan schools with modern, efficient management
                tools designed for the local context.
              </p>
              <p className="text-gray-500 text-sm mt-3">zaabupayapp.com</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <a
                    href="#features"
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="hover:text-white transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#demo"
                    className="hover:text-white transition-colors"
                  >
                    Request Demo
                  </a>
                </li>
                <li>
                  <Link href="/login">
                    <span className="hover:text-white transition-colors cursor-pointer">
                      Sign In
                    </span>
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Training Videos
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Community Forum
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    System Status
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>0742 751 956</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>hello@zaabupayapp.com</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Kampala, Uganda</span>
                </li>
                <li className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span>zaabupayapp.com</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Built by SKYVALE */}
          <div className="border-t border-gray-800 pt-8 mb-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">SV</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">
                    SKYVALE Technologies Uganda Limited
                  </p>
                  <p className="text-gray-400 text-xs">
                    The team behind ZaabuPay
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Phone className="w-4 h-4" />
                <span>
                  Helpline:{" "}
                  <span className="text-white font-medium">0742 751 956</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-xs">
            <p>
              &copy; {new Date().getFullYear()} ZaabuPay by SKYVALE Technologies
              Uganda Limited. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Data Security
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* School Signup Modal */}
      <Dialog open={showSignup} onOpenChange={setShowSignup}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {signupDone ? "🎉 Request Submitted!" : "Start Your Free 30-Day Trial"}
            </DialogTitle>
          </DialogHeader>

          {signupDone ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">We've received your request!</h3>
                <p className="text-gray-600 text-sm">
                  Our team will review your details and set up your school on ZaabuPay within <strong>24 hours</strong>.
                  You'll receive an email with your login credentials.
                </p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-left text-sm space-y-2">
                <p className="font-semibold text-blue-800">What happens next?</p>
                <div className="flex items-start gap-2 text-blue-700"><span>1.</span><span>SKYVALE team reviews your request</span></div>
                <div className="flex items-start gap-2 text-blue-700"><span>2.</span><span>Your school account is created with 30-day free trial</span></div>
                <div className="flex items-start gap-2 text-blue-700"><span>3.</span><span>You receive login credentials via email/phone</span></div>
                <div className="flex items-start gap-2 text-blue-700"><span>4.</span><span>You start managing your school immediately!</span></div>
              </div>
              <p className="text-xs text-gray-500">Questions? Call us: <strong>0742 751 956</strong></p>
              <Button onClick={() => setShowSignup(false)} className="w-full bg-blue-600 hover:bg-blue-700">Close</Button>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 text-sm text-blue-800 flex items-center gap-2">
                <span className="text-lg">🎁</span>
                <span><strong>30-day free trial</strong> — No credit card required. Full access to all features.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>School Name *</Label>
                  <Input className="mt-1" value={signupForm.schoolName}
                    onChange={e => setSignupForm(f => ({ ...f, schoolName: e.target.value }))}
                    placeholder="e.g. St. Mary's College" required />
                </div>
                <div className="col-span-2">
                  <Label>Your Full Name *</Label>
                  <Input className="mt-1" value={signupForm.contactName}
                    onChange={e => setSignupForm(f => ({ ...f, contactName: e.target.value }))}
                    placeholder="Director / Head Teacher name" required />
                </div>
                <div>
                  <Label>Email Address *</Label>
                  <Input type="email" className="mt-1" value={signupForm.email}
                    onChange={e => setSignupForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="your@school.ug" required />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input className="mt-1" value={signupForm.phone}
                    onChange={e => setSignupForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="07XX XXX XXX" />
                </div>
                <div>
                  <Label>District</Label>
                  <Input className="mt-1" value={signupForm.district}
                    onChange={e => setSignupForm(f => ({ ...f, district: e.target.value }))}
                    placeholder="e.g. Kampala, Wakiso" />
                </div>
                <div>
                  <Label>School Type</Label>
                  <Select value={signupForm.schoolType} onValueChange={v => setSignupForm(f => ({ ...f, schoolType: v }))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary School</SelectItem>
                      <SelectItem value="secondary">Secondary School</SelectItem>
                      <SelectItem value="combined">Primary + Secondary</SelectItem>
                      <SelectItem value="vocational">Vocational/BTVET</SelectItem>
                      <SelectItem value="nursery">Nursery School</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Approximate Number of Students</Label>
                  <Input type="number" className="mt-1" value={signupForm.numberOfStudents}
                    onChange={e => setSignupForm(f => ({ ...f, numberOfStudents: e.target.value }))}
                    placeholder="e.g. 500" />
                </div>
                <div className="col-span-2">
                  <Label>Anything specific you'd like us to know? (optional)</Label>
                  <Textarea rows={2} className="mt-1" value={signupForm.message}
                    onChange={e => setSignupForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Any specific challenges or features you're looking for..." />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowSignup(false)}>Cancel</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={signupSubmitting}>
                  {signupSubmitting ? "Submitting..." : "Request Free Trial"}
                </Button>
              </div>
              <p className="text-xs text-center text-gray-500">
                By submitting, you agree to be contacted by SKYVALE Technologies · 0742 751 956
              </p>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
