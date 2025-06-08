import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowForward,
  CheckCircle,
  Phone,
  Security,
  Bolt,
  BarChart,
  TrackChanges,
  Chat,
  Public,
  Speed,
  AutoAwesome,
  Psychology,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import DeveloperModeIcon from "@mui/icons-material/DeveloperMode";

const LandingPage: React.FC = () => {
  // Features for pricing plans
  const pricingfeatures = [
    "Smart Local Touch Optimization",
    "Real-time Analytics Dashboard",
    "Dynamic Variable Support",
    "Automatic Call Analysis",
    "Sentiment Analysis",
    "Failed Call Auto-Retry",
  ];

  // Ref for scroll animations
  const heroRef = useRef<HTMLDivElement>(null);

  // Simple fade-in animation for scrolling elements
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in");
          }
        });
      },
      { threshold: 0.1 },
    );

    document.querySelectorAll(".scroll-animate").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-secondary font-primary overflow-x-hidden">
      {/* Subtle dot pattern background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #ca061b 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      ></div>

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-black/5 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="relative flex items-center justify-center w-8 h-8 bg-black rounded-lg">
                <img
                  src="/recall-logo-black.png"
                  alt="Recall"
                  className="w-6 h-6 object-contain invert"
                />
              </div>
              <span className="font-primary text-2xl font-bold text-black">
                Recall
              </span>
            </div>

            {/* Navigation */}
            <div className="hidden md:flex space-x-8">
              <a
                href="#features"
                className="text-black/70 font-bold hover:text-custom-primary transition-colors duration-300"
              >
                Features
              </a>
              <a
                href="#benefits"
                className="text-black/70 font-bold hover:text-custom-primary transition-colors duration-300"
              >
                Benefits
              </a>
              <a
                href="#pricing"
                className="text-black/70 font-bold hover:text-custom-primary transition-colors duration-300"
              >
                Pricing
              </a>
            </div>

            {/* CTA Button */}
            <Link
              to="/auth"
              className="bg-black hover:bg-black/90 text-white px-6 py-2.5 rounded-lg font-bold shadow-sm hover:shadow transition duration-200 transform hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with iPhone image */}
      <section
        className="relative pt-20 pb-24 min-h-[90vh] flex items-center"
        ref={heroRef}
      >
        <div className="container mx-auto px-6">
          {/* Reduced gap from 8 to 6 and removed max-w-xl on the text container */}
          <div className="grid lg:grid-cols-2 gap-6 items-center">
            {/* Text content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-7xl font-bold mb-6 text-black leading-tight">
                Transform Your{" "}
                <span className="relative inline-block">
                  <span className="text-custom-primary">Outbound Calling</span>
                  <div className="absolute -bottom-1 left-0 w-full h-1 bg-custom-primary"></div>
                </span>
              </h1>
              <p className="text-xl text-black/70 mb-8">
                Supercharge your Retell campaigns with intelligent routing,
                local touch optimization, and real-time analytics
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/auth"
                  className="inline-flex items-center px-8 py-3 bg-custom-primary text-white rounded-lg font-bold shadow-sm hover:shadow transition-all duration-200 hover:bg-custom-primary/90"
                >
                  <span className="flex items-center">
                    Get Started
                    <ArrowForward
                      sx={{ fontSize: 20 }}
                      className="ml-2 group-hover:translate-x-1 transition-transform duration-300"
                    />
                  </span>
                </Link>
                <a
                  href="#features"
                  className="inline-flex items-center px-8 py-3 bg-black/5 text-black rounded-lg font-bold hover:bg-black/10 transition-all duration-200"
                >
                  Learn More
                </a>
              </div>
            </motion.div>

            {/* iPhone Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex justify-center"
            >
              {/* Shadow removed to avoid weird background */}
              <img
                src="/recall-phone.png"
                alt="Recall App"
                className="max-w-[300px] h-auto object-contain"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white border-t border-black/5">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 scroll-animate">
            <div className="inline-flex items-center px-4 py-1 rounded-full bg-black/5 text-black mb-4">
              <span className="font-bold text-sm">POWERFUL FEATURES</span>
            </div>
            <h2 className="text-4xl font-bold mb-4 text-black">
              Everything You Need
            </h2>
            <p className="text-lg text-black/70">
              Optimize your outbound calling campaigns with our comprehensive
              feature set
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Public sx={{ fontSize: 24 }} />,
                color: "bg-custom-primary",
                title: "Local Touch Technology",
                description:
                  "Automatically match outbound numbers with contact area codes to increase answer rates",
              },
              {
                icon: <BarChart sx={{ fontSize: 24 }} />,
                color: "bg-custom-purple",
                title: "Advanced Analytics",
                description:
                  "Track hit rates, call durations, and sentiment analysis in real-time",
              },
              {
                icon: <TrackChanges sx={{ fontSize: 24 }} />,
                color: "bg-custom-orange",
                title: "Optimal Dialing",
                description:
                  "Smart routing and timing algorithms to maximize conversion rates",
              },
              {
                icon: <Speed sx={{ fontSize: 24 }} />,
                color: "bg-custom-yellow",
                title: "Parallel Processing",
                description:
                  "Concurrent dialing within your Retell API limits for maximum efficiency",
              },
              {
                icon: <DeveloperModeIcon sx={{ fontSize: 24 }} />,
                color: "bg-custom-primary",
                title: "Smart Retry Logic",
                description:
                  "Automatically redial failed calls with intelligent timing",
              },
              {
                icon: <Psychology sx={{ fontSize: 24 }} />,
                color: "bg-custom-purple",
                title: "Dynamic Variables",
                description:
                  "Personalize each call with custom data fields for more effective conversations",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="scroll-animate relative bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-black/5 hover:-translate-y-1 overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start space-x-4">
                  <div className={`${feature.color} text-white p-3 rounded-lg`}>
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2 text-black">
                      {feature.title}
                    </h3>
                    <p className="text-black/70 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section
        id="benefits"
        className="py-24 bg-secondary border-t border-black/5"
      >
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 scroll-animate">
              <div className="inline-flex items-center px-4 py-1 rounded-full bg-black/5 text-black mb-4">
                <span className="font-bold text-sm">WHY CHOOSE RECALL</span>
              </div>
              <h2 className="text-4xl font-bold mb-4 text-black">
                Designed for Success
              </h2>
              <p className="text-lg text-black/70">
                Maximize your outbound calling performance with industry-leading
                features
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column: Benefits List */}
              <div className="space-y-4">
                {[
                  {
                    icon: <Public sx={{ fontSize: 20 }} />,
                    color: "bg-custom-primary",
                    text: "Intelligent local number matching for higher answer rates",
                  },
                  {
                    icon: <BarChart sx={{ fontSize: 20 }} />,
                    color: "bg-custom-purple",
                    text: "Real-time analytics and performance tracking",
                  },
                  {
                    icon: <AutoAwesome sx={{ fontSize: 20 }} />,
                    color: "bg-custom-yellow",
                    text: "Automated retry system for failed calls",
                  },
                  {
                    icon: <Speed sx={{ fontSize: 20 }} />,
                    color: "bg-custom-orange",
                    text: "Concurrent dialing with smart load balancing",
                  },
                  {
                    icon: <Chat sx={{ fontSize: 20 }} />,
                    color: "bg-custom-primary",
                    text: "Detailed call logs and transcripts",
                  },
                  {
                    icon: <Psychology sx={{ fontSize: 20 }} />,
                    color: "bg-custom-purple",
                    text: "Custom dynamic variables support",
                  },
                ].map((benefit, index) => (
                  <div
                    key={index}
                    className="scroll-animate flex items-center space-x-4 bg-white p-4 rounded-lg border border-black/5 shadow-sm"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div
                      className={`${benefit.color} text-white p-2 rounded-lg flex-shrink-0`}
                    >
                      {benefit.icon}
                    </div>
                    <p className="text-black/80 text-sm font-bold">
                      {benefit.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Right Column: Metrics */}
              <div className="bg-white rounded-xl p-6 shadow-md border border-black/5 scroll-animate">
                <h3 className="text-xl font-bold mb-6 text-black">
                  Key Metrics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      label: "Answer Rate Increase",
                      value: "Up to 40%",
                      icon: <Phone sx={{ fontSize: 20 }} />,
                      color: "bg-custom-primary",
                    },
                    {
                      label: "Cost Reduction",
                      value: "Up to 25%",
                      icon: <Security sx={{ fontSize: 20 }} />,
                      color: "bg-custom-purple",
                    },
                    {
                      label: "Conversion Boost",
                      value: "Up to 35%",
                      icon: <TrackChanges sx={{ fontSize: 20 }} />,
                      color: "bg-custom-orange",
                    },
                    {
                      label: "Time Saved",
                      value: "Up to 60%",
                      icon: <Bolt sx={{ fontSize: 20 }} />,
                      color: "bg-custom-yellow",
                    },
                  ].map((metric, index) => (
                    <div
                      key={index}
                      className="bg-black/[0.02] rounded-lg p-4 hover:bg-black/[0.03] transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <div
                          className={`${metric.color} text-white p-2 rounded-lg`}
                        >
                          {metric.icon}
                        </div>
                        <div className="text-xl font-bold text-black">
                          {metric.value}
                        </div>
                      </div>
                      <div className="text-sm text-black/70">
                        {metric.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white border-t border-black/5">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 scroll-animate">
            <div className="inline-flex items-center px-4 py-1 rounded-full bg-black/5 text-black mb-4">
              <span className="font-bold text-sm">TRANSPARENT PRICING</span>
            </div>
            <h2 className="text-4xl font-bold mb-4 text-black">
              Simple, Clear Pricing
            </h2>
            <p className="text-lg text-black/70">
              Choose the perfect plan for your business needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                name: "Basic Caller",
                price: 25,
                calls: 5000,
                color: "bg-custom-orange",
              },
              {
                name: "Professional Caller",
                price: 100,
                calls: 25000,
                color: "bg-custom-purple",
                popular: true,
              },
              {
                name: "Enterprise Caller",
                price: 500,
                calls: 150000,
                color: "bg-custom-primary",
              },
            ].map((plan, index) => (
              <div
                key={index}
                className={`scroll-animate bg-white rounded-xl shadow-md overflow-hidden border border-black/5 transition-all duration-300 hover:shadow-lg ${
                  plan.popular ? "transform scale-105 border-custom-yellow" : ""
                }`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {plan.popular && (
                  <div className="bg-custom-yellow text-black text-xs font-bold py-1 px-3 text-center">
                    MOST POPULAR
                  </div>
                )}
                <div className={`${plan.color} text-white p-6`}>
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="ml-2 opacity-80 text-sm">one-time</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-black/70 mb-6 text-sm font-bold">
                    {plan.calls.toLocaleString()} Retell-powered dials
                  </div>
                  <ul className="space-y-3 mb-6">
                    {pricingfeatures.map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-start text-sm text-black/70"
                      >
                        <CheckCircle
                          sx={{ fontSize: 18 }}
                          className="mr-2 mt-0.5 text-black/30"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/auth"
                    className="block w-full py-3 px-6 rounded-lg text-center font-bold bg-black text-white shadow-sm hover:shadow transition duration-200 hover:bg-black/90"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary py-12 border-t border-black/5">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="relative flex items-center justify-center w-8 h-8 bg-black rounded-lg mr-3">
                  <img
                    src="/recall-logo-black.png"
                    alt="Recall"
                    className="w-5 h-5 object-contain invert"
                  />
                </div>
                <span className="font-primary text-xl font-bold text-black">
                  Recall
                </span>
              </div>
              <p className="text-black/70 text-sm">
                Revolutionizing outbound calling with intelligent automation and
                analytics
              </p>
            </div>
            {[
              {
                title: "Product",
                links: ["Features", "Pricing", "Documentation"],
              },
              {
                title: "Company",
                links: ["About", "Blog", "Careers"],
              },
              {
                title: "Legal",
                links: ["Privacy", "Terms", "Security"],
              },
            ].map((column, index) => (
              <div key={index}>
                <h4 className="font-bold text-black mb-4">{column.title}</h4>
                <ul className="space-y-2">
                  {column.links.map((link, i) => (
                    <li key={i}>
                      <a
                        href="#"
                        className="text-black/70 hover:text-custom-primary transition-colors duration-200 text-sm"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-black/5 mt-8 pt-6 text-center text-black/50 text-sm">
            © 2024 Recall. All rights reserved.
          </div>
        </div>
      </footer>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        .scroll-animate {
          opacity: 0;
          transform: translateY(20px);
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
