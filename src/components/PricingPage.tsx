import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import {
  Phone,
  CheckCircle,
  EastOutlined,
  Star,
  Bolt,
  Timeline,
  Support,
  Public,
  Shield,
  BarChart,
} from "@mui/icons-material";

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<number | null>(1);

  useEffect(() => {
    // Animation for the pricing cards
    const cards = document.querySelectorAll(".pricing-card");
    cards.forEach((card, index) => {
      setTimeout(
        () => {
          card.classList.add("show");
        },
        100 * (index + 1),
      );
    });
  }, []);

  const handlePurchase = async (amount: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
      color: "custom-orange",
      popular: false,
      description: "Perfect for small businesses starting with AI calling",
      features: [
        "Smart Local Touch Optimization",
        "Real-time Analytics Dashboard",
        "Dynamic Variable Support",
        "Automatic Call Analysis",
      ],
    },
    {
      name: "Professional Caller",
      price: 100,
      calls: 25000,
      color: "custom-purple",
      popular: true,
      description: "Ideal for growing businesses with regular calling needs",
      features: [
        "Smart Local Touch Optimization",
        "Real-time Analytics Dashboard",
        "Dynamic Variable Support",
        "Automatic Call Analysis",
        "Sentiment Analysis",
        "Failed Call Auto-Retry",
      ],
    },
    {
      name: "Enterprise Caller",
      price: 500,
      calls: 150000,
      color: "custom-yellow",
      popular: false,
      description: "For large-scale operations requiring high volume calling",
      features: [
        "Smart Local Touch Optimization",
        "Real-time Analytics Dashboard",
        "Dynamic Variable Support",
        "Automatic Call Analysis",
        "Sentiment Analysis",
        "Failed Call Auto-Retry",
        "Priority Support",
      ],
    },
  ];

  const benefits = [
    {
      title: "Advanced Call Analytics",
      description: "Powerful real-time insights into call performance",
      icon: <BarChart sx={{ fontSize: 24 }} />,
    },
    {
      title: "24/7 Support",
      description: "Dedicated team ready to help when you need assistance",
      icon: <Support sx={{ fontSize: 24 }} />,
    },
    {
      title: "Global Coverage",
      description:
        "Make calls to customers anywhere with crystal-clear quality",
      icon: <Public sx={{ fontSize: 24 }} />,
    },
    {
      title: "Enterprise Security",
      description: "Bank-level encryption for all your sensitive information",
      icon: <Shield sx={{ fontSize: 24 }} />,
    },
  ];

  const faqs = [
    {
      question: "How are credits calculated?",
      answer:
        "One credit equals one dial. Our system optimizes for efficiency to maximize your investment.",
    },
    {
      question: "Do credits expire?",
      answer:
        "No, your purchased credits never expire and can be used at any time.",
    },
    {
      question: "Can I upgrade my plan later?",
      answer:
        "Yes, you can purchase additional credits or upgrade to a higher plan at any time.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept all major credit cards, PayPal, and bank transfers for enterprise clients.",
    },
  ];

  return (
    <div className="min-h-screen bg-secondary font-primary">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center px-4 py-1 bg-black/5 text-black rounded-full text-sm font-bold mb-4">
            <Star sx={{ fontSize: 16 }} className="mr-2 text-custom-yellow" />
            PREMIUM AI CALLING PLATFORM
          </div>

          <h1 className="text-4xl font-bold mb-4 text-black leading-tight">
            Power Your Outreach With Intelligent Calling
          </h1>

          <p className="text-lg text-black/70 max-w-2xl mx-auto">
            Choose the perfect plan for your business and transform your
            customer conversations with our AI-powered calling platform.
          </p>
        </div>

        {/* Pricing Cards - Simplified and more minimal */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`pricing-card opacity-0 translate-y-4 cursor-pointer`}
              onClick={() => setSelectedPlan(index)}
            >
              <div
                className={`bg-white rounded-2xl h-full transition-all duration-300 border 
                  ${
                    selectedPlan === index
                      ? `border-${plan.color} shadow-lg`
                      : "border-black/5 shadow-sm hover:shadow"
                  }`}
              >
                {plan.popular && (
                  <div className="bg-custom-purple text-white text-xs font-bold py-1 px-3 rounded-bl-lg absolute top-0 right-0">
                    MOST POPULAR
                  </div>
                )}

                <div className={`h-1 w-full bg-${plan.color}`}></div>

                <div className="p-6">
                  {/* Plan Name and Description */}
                  <h3 className="text-xl font-bold text-black mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-black/60 mb-4">
                    {plan.description}
                  </p>

                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-black">
                        ${plan.price}
                      </span>
                      <span className="ml-2 text-black/60 text-sm">
                        one-time
                      </span>
                    </div>
                    <div className="text-sm text-black/70 mt-1">
                      {plan.calls.toLocaleString()} total credits
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start">
                        <CheckCircle
                          sx={{ fontSize: 18 }}
                          className={`mr-2 mt-0.5 text-${plan.color}`}
                        />
                        <span className="text-sm text-black/80">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handlePurchase(plan.price)}
                    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center 
                      ${
                        selectedPlan === index
                          ? `bg-${plan.color} text-white`
                          : "bg-black text-white hover:bg-black/90"
                      } 
                      transition-all duration-200`}
                  >
                    Get Started
                    <EastOutlined sx={{ fontSize: 16 }} className="ml-2" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Benefits Section - Simplified */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-black mb-8 text-center">
            Why Choose Our Platform
          </h2>

          <div className="grid md:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-5 border border-black/5 shadow-sm"
              >
                <div className="mb-3 text-black">{benefit.icon}</div>
                <h3 className="text-lg font-bold text-black mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-black/70">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section - Simplified */}
        <div className="mb-20">
          <h2 className="text-2xl font-bold text-black mb-8 text-center">
            Frequently Asked Questions
          </h2>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-5 shadow-sm border border-black/5"
              >
                <h3 className="font-bold text-black mb-2">{faq.question}</h3>
                <p className="text-sm text-black/70">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section - Simplified */}
        <div className="bg-black rounded-2xl p-10 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">
            Ready to Transform Your Outreach?
          </h2>
          <p className="text-white/80 mb-6 max-w-2xl mx-auto">
            Get started today and experience the power of AI-driven calling
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="px-6 py-3 bg-custom-primary text-white rounded-xl font-bold text-sm hover:bg-custom-primary/90 transition-all duration-200"
          >
            Choose Your Plan
          </button>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes show-card {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .pricing-card.show {
          animation: show-card 0.5s forwards ease-out;
        }
      `}</style>
    </div>
  );
};

export default PricingPage;
