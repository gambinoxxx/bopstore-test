"use client";

import { useState, useMemo } from "react";

// Correctly import icons individually to prevent errors
import {
  Search,
  HelpCircle,
  ShoppingBag,
  CreditCard,
  Truck,
  RotateCcw,
  User,
  ChevronDown,
} from "lucide-react";

// --- Data (FAQs and Categories) ---
// This data is kept the same as your original component.
const faqs = [
  // Shopping FAQs
  {
    id: "shopping-1",
    question: "How do I place an order?",
    answer:
      "To place an order, browse our products, add items to your cart, and proceed to checkout. You'll need to create an account or sign in, then provide your shipping information and payment details to complete your purchase.",
    category: "shopping",
  },
  {
    id: "shopping-2",
    question: "Can I modify or cancel my order after placing it?",
    answer:
      "You can modify or cancel your order within 30 minutes of placing it. After this time, if your order hasn't been processed yet, please contact our customer service team immediately. Once your order is being prepared or shipped, modifications may not be possible.",
    category: "shopping",
  },
  {
    id: "shopping-3",
    question: "How do I track my order?",
    answer:
      "Once your order ships, you'll receive a tracking number via email. You can also track your order by logging into your account and visiting the 'My Orders' section. Real-time tracking information will be available there.",
    category: "shopping",
  },

  // Payment FAQs
  {
    id: "payment-1",
    question: "What payment methods do you accept?",
    answer:
      "We accept credit cards and dedit cards (Visa, MasterCard, verve) and paystack. All payments are processed securely through our encrypted payment system.",
    category: "payment",
  },
  {
    id: "payment-2",
    question: "Is my payment information secure?",
    answer:
      "Yes, absolutely. We use industry-standard SSL encryption and are PCI DSS compliant. Your payment information is never stored on our servers and is processed securely through trusted payment gateways.",
    category: "payment",
  },

  // Shipping FAQs
  {
    id: "shipping-1",
    question: "How much does shipping cost?",
    answer:
      "Shipping costs vary based on your location and the shipping method you choose. Standard shipping is often free for orders over a certain amount. Express shipping options are available at checkout.",
    category: "shipping",
  },
  {
    id: "shipping-2",
    question: "How long does delivery take?",
    answer:
      "Standard shipping typically takes 3-7 business days. Express shipping takes 1-3 business days. International shipping may take longer depending on the destination country.",
    category: "shipping",
  },

  // Returns FAQs
  {
    id: "returns-1",
    question: "What is your return policy?",
    answer:
      "We offer a 7-day return policy from the date of delivery. Items must be unused, in original condition, and include all original packaging and accessories. Some items may not be returnable.",
    category: "returns",
  },

  // Account FAQs
  {
    id: "account-1",
    question: "How do I create an account?",
    answer:
      "Click 'Sign Up' at the top of any page and provide your email address and create a password. You can also sign up using your Google or Facebook account for faster registration.",
    category: "account",
  },
  {
    id: "account-2",
    question: "I forgot my password. How do I reset it?",
    answer:
      "Click 'Sign In' and then 'Forgot Password'. Enter your email address and we'll send you a password reset link. Follow the instructions in the email to create a new password.",
    category: "account",
  },
];

const categories = [
  { id: "all", label: "All", icon: HelpCircle },
  { id: "shopping", label: "Shopping", icon: ShoppingBag },
  { id: "payment", label: "Payment", icon: CreditCard },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "returns", label: "Returns", icon: RotateCcw },
  { id: "account", label: "Account", icon: User },
];

// --- Reusable Accordion Component (Self-contained) ---
const AccordionItem = ({ question, answer, isOpen, onClick }) => (
  <div className="border-b border-slate-200">
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between py-4 text-left font-semibold text-slate-800 transition-colors hover:text-slate-600"
    >
      <span>{question}</span>
      <ChevronDown
        className={`h-5 w-5 shrink-0 transition-transform duration-200 ${
          isOpen ? "rotate-180" : ""
        }`}
      />
    </button>
    <div
      className={`grid overflow-hidden text-slate-600 transition-all duration-300 ease-in-out ${
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        <p className="pb-4 leading-relaxed">{answer}</p>
      </div>
    </div>
  </div>
);

// --- Main FAQ Component ---
const Faq = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [openAccordion, setOpenAccordion] = useState(null);

  // Memoized filtering logic for performance
  const filteredFAQs = useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return faqs.filter((faq) => {
      const matchesSearch =
        faq.question.toLowerCase().includes(lowerCaseSearchTerm) ||
        faq.answer.toLowerCase().includes(lowerCaseSearchTerm);
      const matchesCategory =
        activeCategory === "all" || faq.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, activeCategory]);

  const handleAccordionClick = (id) => {
    setOpenAccordion(openAccordion === id ? null : id);
  };

  return (
    <div className="py-12 bg-slate-50/30">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-slate-800 lg:text-4xl mb-4">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-slate-600">
            Find answers to common questions about shopping, payments, shipping,
            and more.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mx-auto mb-12 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-12 text-base shadow-sm transition-colors focus:border-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Categories Sidebar */}
          <div className="md:col-span-1">
            <div className="sticky top-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-700">
                <HelpCircle className="h-5 w-5" />
                Categories
              </h3>
              <div className="space-y-1">
                {categories.map((category) => {
                  const Icon = category.icon;
                  const isActive = activeCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`flex w-full items-center gap-3 rounded-lg p-3 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-slate-700 text-white shadow-md"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* FAQ Content */}
          <div className="md:col-span-3">
            {filteredFAQs.length > 0 ? (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                {filteredFAQs.map((faq) => (
                  <AccordionItem
                    key={faq.id}
                    question={faq.question}
                    answer={faq.answer}
                    isOpen={openAccordion === faq.id}
                    onClick={() => handleAccordionClick(faq.id)}
                  />
                ))}
              </div>
            ) : (
              // No Results Found State
              <div className="rounded-xl bg-white py-12 text-center shadow-sm">
                <HelpCircle className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                <h3 className="mb-2 text-xl font-semibold text-slate-600">
                  No results found
                </h3>
                <p className="mb-6 text-slate-500">
                  Try adjusting your search or browsing other categories.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setActiveCategory("all");
                  }}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                >
                  Clear Search
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Faq;