import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";

// Custom icons as SVG components
const StarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 16.92V19.92C22.0011 20.1985 21.9441 20.4741 21.8325 20.7293C21.7209 20.9845 21.5573 21.2136 21.3521 21.4019C21.1468 21.5901 20.9046 21.7335 20.6407 21.8221C20.3769 21.9108 20.0974 21.9424 19.82 21.9147C16.7428 21.5857 13.787 20.5342 11.19 18.8547C8.77382 17.3147 6.72533 15.2662 5.18533 12.85C3.49997 10.2412 2.44824 7.27097 2.12533 4.18C2.09765 3.90347 2.12894 3.62476 2.2173 3.36163C2.30566 3.09849 2.44856 2.85669 2.63645 2.65163C2.82434 2.44656 3.05307 2.28271 3.30795 2.17052C3.56284 2.05834 3.83792 2.00026 4.11533 2H7.11533C7.59533 1.99522 8.06107 2.16708 8.43485 2.48353C8.80864 2.79999 9.06566 3.2381 9.16533 3.71C9.33533 4.61 9.60242 5.48788 9.96533 6.33C10.1032 6.67687 10.141 7.05874 10.0747 7.42812C10.0083 7.79749 9.84103 8.13683 9.59533 8.4L8.21533 9.78C9.63905 12.2729 11.7271 14.361 14.22 15.7847L15.6 14.4047C15.8632 14.159 16.2025 13.9918 16.5719 13.9254C16.9412 13.859 17.3231 13.8968 17.67 14.0347C18.512 14.3976 19.3899 14.6647 20.29 14.8347C20.7679 14.9346 21.2121 15.1952 21.5308 15.5748C21.8494 15.9545 22.0198 16.4274 22 16.92Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ActivityIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ZapIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SupportIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 10C20 14.4183 16.4183 18 12 18C10.5996 18 9.27494 17.6376 8.12492 17C7.88362 16.8912 7.57296 16.9331 7.23601 17.1166C6.59738 17.4456 5.69144 17.4541 5.46972 17.2388C5.24801 17.0235 5.39563 16.1344 5.85399 15.5558C6.06496 15.2891 6.20975 14.9973 6.15412 14.7438C6.05479 14.2538 6 13.7363 6 13.2C6 8.78172 9.58172 5.2 14 5.2C18.4183 5.2 22 8.78172 22 13.2C22 15.5699 20.9279 17.6988 19.217 19.1C17.608 20.4165 15.8556 20.4891 14.1116 19.8388C12.4328 19.2161 10.8443 17.5931 9.57143 15.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="14" cy="13" r="1" fill="currentColor"/>
    <circle cx="17" cy="13" r="1" fill="currentColor"/>
    <circle cx="11" cy="13" r="1" fill="currentColor"/>
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 20V10M12 20V4M6 20V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const GlobeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 8L10.5 13.5L8 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);

  useEffect(() => {
    // Animation for the pricing cards
    const cards = document.querySelectorAll('.pricing-card');
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add('show');
      }, 100 * (index + 1));
    });
  }, []);

  const handlePurchase = async (amount: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please log in to purchase credits.");
      navigate("/auth");
      return;
    }

    const purchaseLink = `https://darwizpayment.edsplore.com/buy/628a4a2e-44f5-42f5-9565-489d58f52de4?checkout[custom][user_id]=${user.id}`;
    window.open(purchaseLink, "_blank");
  };

  const plans = [
    {
      name: "Basic Caller",
      price: 25,
      calls: 5000,
      icon: PhoneIcon,
      popular: false,
      description: "Perfect for small businesses starting with AI calling",
      color: "from-blue-500 to-cyan-400",
      gradient: "bg-gradient-to-r from-blue-500 to-cyan-400",
      accentLight: "bg-blue-50",
      accentMedium: "bg-blue-100",
      accentDark: "text-blue-600",
      features: [
        "Smart Local Touch Optimization",
        "Real-time Analytics Dashboard",
        "Dynamic Variable Support",
        "Automatic Call Analysis",
      ]
    },
    {
      name: "Professional Caller",
      price: 100,
      calls: 25000,
      icon: ActivityIcon,
      popular: true,
      description: "Ideal for growing businesses with regular calling needs",
      color: "from-purple-500 to-indigo-500",
      gradient: "bg-gradient-to-r from-purple-500 to-indigo-500",
      accentLight: "bg-indigo-50",
      accentMedium: "bg-indigo-100",
      accentDark: "text-indigo-600",
      features: [
        "Smart Local Touch Optimization",
        "Real-time Analytics Dashboard",
        "Dynamic Variable Support",
        "Automatic Call Analysis",
        "Sentiment Analysis",
        "Failed Call Auto-Retry",
      ]
    },
    {
      name: "Enterprise Caller",
      price: 500,
      calls: 150000,
      icon: ZapIcon,
      popular: false,
      description: "For large-scale operations requiring high volume calling",
      color: "from-amber-500 to-orange-400",
      gradient: "bg-gradient-to-r from-amber-500 to-orange-400",
      accentLight: "bg-amber-50",
      accentMedium: "bg-amber-100",
      accentDark: "text-amber-600",
      features: [
        "Smart Local Touch Optimization",
        "Real-time Analytics Dashboard",
        "Dynamic Variable Support",
        "Automatic Call Analysis",
        "Sentiment Analysis",
        "Failed Call Auto-Retry",
        "Priority Support",
      ]
    }
  ];

  const benefits = [
    {
      title: "Advanced Call Analytics",
      description: "Powerful real-time insights into call performance and sentiment analysis",
      icon: AnalyticsIcon
    },
    {
      title: "24/7 Support",
      description: "Dedicated customer success team ready to help whenever you need assistance",
      icon: SupportIcon
    },
    {
      title: "Global Coverage",
      description: "Make calls to customers anywhere in the world with crystal-clear quality",
      icon: GlobeIcon
    },
    {
      title: "Enterprise Security",
      description: "Bank-level encryption and data protection for all your sensitive information",
      icon: ShieldIcon
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Decorative shapes */}
      <div className="absolute top-0 right-0 w-1/3 h-[500px] bg-gradient-to-bl from-blue-100/20 to-transparent z-0 rounded-bl-full opacity-70"></div>
      <div className="absolute bottom-0 left-0 w-1/4 h-[300px] bg-gradient-to-tr from-indigo-100/20 to-transparent z-0 rounded-tr-full opacity-70"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header section with modern design */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-block mb-4 transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-center px-4 py-1.5 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 text-blue-800 rounded-full text-xs font-semibold tracking-wider border border-blue-200">
              <div className="text-blue-600 mr-2">
                <StarIcon />
              </div>
              PREMIUM AI CALLING PLATFORM
            </div>
          </div>
          
          <h1 className="text-5xl font-bold mb-6 bg-clip-text leading-tight">
            Power Your Outreach <br className="hidden sm:block" />With Intelligent Calling
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the perfect plan for your business and transform your customer conversations with our AI-powered calling platform.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto mb-16">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`pricing-card opacity-0 translate-y-4 relative ${plan.popular ? 'z-10' : ''}`}
              onMouseEnter={() => setHoveredPlan(index)}
              onMouseLeave={() => setHoveredPlan(null)}
            >
              <div 
                className={`relative bg-white rounded-2xl overflow-hidden transition-all duration-500 h-full ${
                  plan.popular 
                    ? 'ring-2 ring-indigo-500 shadow-xl transform md:scale-105 md:-my-4' 
                    : 'shadow-md hover:shadow-xl border border-gray-100'
                } ${hoveredPlan === index ? 'transform-gpu scale-[1.02]' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 z-10">
                    <div className="text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-1.5 rounded-bl-lg">
                      MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Top gradient bar */}
                <div className={`h-2 w-full ${plan.gradient}`}></div>

                <div className="p-8">
                  {/* Card Header */}
                  <div className="flex items-center mb-6">
                    <div className={`w-12 h-12 rounded-xl ${plan.gradient} flex items-center justify-center mr-4 shadow-lg text-white`}>
                      <plan.icon />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-sm text-gray-600">{plan.description}</p>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="mb-8">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                      <span className="ml-2 text-gray-500">one-time</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      ${(plan.price / plan.calls * 1000).toFixed(2)} per 1,000 calls
                    </div>
                    <div className={`mt-2 inline-block px-3 py-1 rounded-full text-sm font-medium ${plan.accentLight} ${plan.accentDark}`}>
                      {plan.calls.toLocaleString()} total credits
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-4 mb-8 min-h-[200px]">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <div className={`flex-shrink-0 w-5 h-5 mr-3 mt-0.5 ${plan.accentDark}`}>
                          <CheckIcon />
                        </div>
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handlePurchase(plan.price)}
                    className={`w-full py-3 px-6 rounded-xl font-medium shadow-sm hover:shadow transition-all duration-300 flex items-center justify-center space-x-2 group ${
                      plan.popular
                        ? `${plan.gradient} text-white hover:opacity-90`
                        : `${plan.accentLight} ${plan.accentDark} hover:opacity-80`
                    }`}
                  >
                    <span>Get Started</span>
                    <div className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1">
                      <ArrowRightIcon />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Benefits Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Our Platform</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our AI calling solution offers industry-leading features to enhance your outreach
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100">
                  <benefit.icon />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about our services
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                question: "How are credits calculated?",
                answer: "One credit equals one second of call time. Our system optimizes for efficiency to maximize your investment."
              },
              {
                question: "Do credits expire?",
                answer: "No, your purchased credits never expire and can be used at any time."
              },
              {
                question: "Can I upgrade my plan later?",
                answer: "Yes, you can purchase additional credits or upgrade to a higher plan at any time."
              },
              {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards, PayPal, and bank transfers for enterprise clients."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-12 text-center text-white shadow-xl relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-1/3 h-full bg-white/10 transform -skew-x-12 -translate-x-20"></div>
          <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-white/5 rounded-full"></div>
          
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Outreach?</h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Get started today and experience the power of AI-driven calling
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-8 py-3 bg-white text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition-colors duration-300 shadow-lg hover:shadow-xl"
            >
              Choose Your Plan
            </button>
          </div>
        </div>
      </div>
      
      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes show-card {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .pricing-card.show {
          animation: show-card 0.5s forwards ease-out;
        }
      `}</style>
    </div>
  );
};

export default PricingPage;