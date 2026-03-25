import { useState } from "react";
import { useLocation } from "wouter";
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
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap,
  Users,
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
} from "lucide-react";

interface DemoRequestForm {
  schoolName: string;
  contactName: string;
  email: string;
  phone: string;
  numberOfStudents: string;
  message: string;
}

export const Landing = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState<DemoRequestForm>({
    schoolName: "",
    contactName: "",
    email: "",
    phone: "",
    numberOfStudents: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof DemoRequestForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDemoRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast({
        title: "Demo Request Submitted!",
        description:
          "Thank you for your interest. We'll contact you within 24 hours.",
      });

      setFormData({
        schoolName: "",
        contactName: "",
        email: "",
        phone: "",
        numberOfStudents: "",
        message: "",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit demo request. Please try again.",
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
        "Complete student profiles with auto-generated payment codes, academic records, and guardian information.",
    },
    {
      icon: GraduationCap,
      title: "Academic Tracking",
      description:
        "Manage classes, subjects, exams, grades, and attendance with comprehensive reporting.",
    },
    {
      icon: CreditCard,
      title: "Fee Management",
      description:
        "Integrated mobile money payments (MTN, Airtel) with automated fee tracking and receipts.",
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description:
        "Real-time dashboards, academic performance analytics, and automated PDF report generation.",
    },
    {
      icon: Smartphone,
      title: "Mobile-First Design",
      description:
        "Works perfectly on all devices with offline capabilities for areas with poor connectivity.",
    },
    {
      icon: Shield,
      title: "Role-Based Access",
      description:
        "6 user roles with granular permissions: Admin, Director, Head Teacher, Class Teacher, Subject Teacher, Bursar.",
    },
  ];

  const benefits = [
    {
      icon: Zap,
      title: "Increase Efficiency",
      description:
        "Reduce administrative workload by 70% with automated processes and digital workflows.",
    },
    {
      icon: Cloud,
      title: "Cloud-Based Solution",
      description:
        "Access your school data from anywhere with secure cloud storage and automatic backups.",
    },
    {
      icon: Globe,
      title: "Multi-School Support",
      description:
        "Perfect for school networks - manage multiple schools from a single admin dashboard.",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Nakato",
      role: "Head Teacher, Kampala Primary School",
      content:
        "ZaabuPay has transformed how we run our school. The mobile money integration alone has saved us countless hours.",
      rating: 5,
    },
    {
      name: "John Musoke",
      role: "Director, Bright Future Schools Network",
      content:
        "Managing our 8 schools is now effortless. The role-based access and centralized reporting are game-changers.",
      rating: 5,
    },
    {
      name: "Grace Akello",
      role: "Bursar, St. Mary's Secondary",
      content:
        "Fee collection has never been easier. Parents can pay through mobile money and we get instant notifications.",
      rating: 5,
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "50,000",
      period: "per school/month",
      features: [
        "Up to 200 students",
        "Basic reporting",
        "Mobile money integration",
        "Email support",
        "2 user roles",
      ],
      popular: false,
    },
    {
      name: "Professional",
      price: "120,000",
      period: "per school/month",
      features: [
        "Up to 800 students",
        "Advanced analytics",
        "PDF report generation",
        "Priority support",
        "All 6 user roles",
        "Offline capabilities",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact us",
      features: [
        "Unlimited students",
        "Multi-school management",
        "Custom integrations",
        "Dedicated support",
        "White-label options",
        "API access",
      ],
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ZaabuPay
            </span>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a
              href="#features"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Features
            </a>
            <a
              href="#benefits"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Benefits
            </a>
            <a
              href="#pricing"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Pricing
            </a>
            <a
              href="#testimonials"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Reviews
            </a>
          </nav>
          <Button onClick={() => setLocation("/login")} variant="outline">
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-100">
            🚀 Now Available for Ugandan Schools
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
            Modern School Management for Rural Uganda
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
            Transform your school with our comprehensive SaaS platform designed
            specifically for Ugandan schools. Manage students, track fees,
            generate reports, and accept mobile money payments - all in one
            place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-4"
            >
              <a href="#demo">Request Free Demo</a>
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4">
              <a href="#features">See Features</a>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Bank-Grade Security</span>
            </div>
            <div className="flex items-center space-x-2">
              <Cloud className="w-5 h-5" />
              <span className="text-sm">99.9% Uptime</span>
            </div>
            <div className="flex items-center space-x-2">
              <Smartphone className="w-5 h-5" />
              <span className="text-sm">Mobile Optimized</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything Your School Needs
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From student registration to fee collection, our platform handles
              every aspect of school management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <CardHeader>
                  <feature.icon className="w-12 h-12 text-blue-600 mb-4" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section
        id="benefits"
        className="py-20 px-4 bg-gradient-to-r from-blue-50 to-purple-50"
      >
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Why Schools Choose ZaabuPay
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join hundreds of schools that have transformed their operations
              with our platform.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="bg-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <benefit.icon className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              What School Leaders Say
            </h2>
            <p className="text-xl text-gray-600">
              Real feedback from real schools using ZaabuPay.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 italic leading-relaxed">
                    "{testimonial.content}"
                  </p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="py-20 px-4 bg-gradient-to-r from-purple-50 to-blue-50"
      >
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your school's size and needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card
                key={index}
                className={`relative border-0 shadow-lg ${plan.popular ? "ring-2 ring-blue-500 transform scale-105" : ""}`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">UGX {plan.price}</span>
                    <span className="text-gray-500 ml-2">/{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full mt-6 ${plan.popular ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    <a href="#demo">Get Started</a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Request Section */}
      <section id="demo" className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Ready to Transform Your School?
            </h2>
            <p className="text-xl text-gray-600">
              Request a free demo and see how ZaabuPay can revolutionize your
              school management.
            </p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                Request Your Free Demo
              </CardTitle>
              <CardDescription className="text-center">
                Fill out the form below and we'll contact you within 24 hours to
                schedule your personalized demo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDemoRequest} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="schoolName">School Name *</Label>
                    <Input
                      id="schoolName"
                      value={formData.schoolName}
                      onChange={(e) =>
                        handleInputChange("schoolName", e.target.value)
                      }
                      placeholder="Enter your school name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Person *</Label>
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) =>
                        handleInputChange("contactName", e.target.value)
                      }
                      placeholder="Your full name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      placeholder="your.email@school.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      placeholder="+256 700 123 456"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numberOfStudents">Number of Students</Label>
                  <Input
                    id="numberOfStudents"
                    value={formData.numberOfStudents}
                    onChange={(e) =>
                      handleInputChange("numberOfStudents", e.target.value)
                    }
                    placeholder="Approximate number of students"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Additional Information</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) =>
                      handleInputChange("message", e.target.value)
                    }
                    placeholder="Tell us about your current challenges or specific needs..."
                    rows={4}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Request Free Demo"}
                  {!isSubmitting && <ArrowRight className="ml-2 w-5 h-5" />}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <GraduationCap className="w-8 h-8 text-blue-400" />
                <span className="text-2xl font-bold">ZaabuPay</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Empowering Ugandan schools with modern, efficient management
                tools designed for the local context.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
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
                    Demo
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    API
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Training
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Community
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Status
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  <span>+256 700 123 456</span>
                </li>
                <li className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  <span>hello@edumanage.ug</span>
                </li>
                <li className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>Kampala, Uganda</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>
              © 2025 ZaabuPay. All rights reserved. Built with ❤️ for Ugandan
              schools.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
