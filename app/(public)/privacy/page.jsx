"use client";

import { motion } from "framer-motion";
import {
  Shield,
  Eye,
  Lock,
  Cookie,
  Database,
  UserCheck,
  AlertTriangle,
  Download,
  Trash2,
  Settings,
  Mail,
  Clock,
} from "lucide-react";
import Link from "next/link";

// Simulating UI components with standard divs and Tailwind CSS
const Container = ({ children, className }) => <div className={`mx-auto px-4 ${className}`}>{children}</div>;
const Card = ({ children, className }) => <div className={`bg-white shadow-lg rounded-lg ${className}`}>{children}</div>;
const CardHeader = ({ children }) => <div className="p-6">{children}</div>;
const CardTitle = ({ children, className }) => <h2 className={`text-2xl font-semibold ${className}`}>{children}</h2>;
const CardContent = ({ children }) => <div className="p-6 pt-0">{children}</div>;
const Badge = ({ children, className }) => <div className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${className}`}>{children}</div>;
const Button = ({ children, ...props }) => <button {...props}>{children}</button>;
const Separator = () => <hr className="my-4 border-slate-200" />;

const PrivacyPage = () => {
  const privacyHighlights = [
    {
      icon: Shield,
      title: "Data Protection",
      description: "Your information is encrypted and securely stored",
      color: "text-slate-800",
    },
    {
      icon: Eye,
      title: "Transparency",
      description: "Clear visibility into how your data is used",
      color: "text-slate-600",
    },
    {
      icon: UserCheck,
      title: "Your Control",
      description: "Manage your privacy settings and preferences",
      color: "text-orange-600",
    },
    {
      icon: Lock,
      title: "Secure Processing",
      description: "Industry-standard security for all transactions",
      color: "text-slate-800",
    },
  ];

  const dataTypes = [
    {
      category: "Account Information",
      items: [
        "Name and contact details",
        "Account credentials",
        "Profile preferences",
        "Communication history",
      ],
      icon: UserCheck,
    },
    {
      category: "Purchase Data",
      items: [
        "Order history",
        "Payment information",
        "Shipping addresses",
        "Product reviews",
      ],
      icon: Database,
    },
    {
      category: "Usage Analytics",
      items: [
        "Website interactions",
        "Feature usage patterns",
        "Performance metrics",
        "Error logs",
      ],
      icon: Eye,
    },
    {
      category: "Device Information",
      items: [
        "Browser and device type",
        "IP address",
        "Operating system",
        "Cookies and tracking",
      ],
      icon: Settings,
    },
  ];

  const userRights = [
    {
      right: "Access Your Data",
      description:
        "Request a copy of all personal information we have about you",
      icon: Download,
      action: "Request Data Export",
    },
    {
      right: "Update Information",
      description: "Correct or update any inaccurate personal information",
      icon: Settings,
      action: "Manage Profile",
    },
    {
      right: "Delete Account",
      description:
        "Request complete removal of your account and associated data",
      icon: Trash2,
      action: "Delete Account",
    },
    {
      right: "Control Communications",
      description: "Manage email preferences and marketing communications",
      icon: Mail,
      action: "Email Settings",
    },
  ];

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen">
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-r from-green-900 to-green-700 text-white">
        <Container className="max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Shield className="w-16 h-16 mx-auto mb-6 opacity-90" />
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Privacy Policy
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              Your privacy is fundamental to how we operate. Learn how we
              collect, use, and protect your personal information.
            </p>
            <Badge className="mt-6 bg-white/20 text-white border-white/30">
              Last updated: November 2025
            </Badge>
          </motion.div>
        </Container>
      </section>

      {/* Privacy Highlights */}
      <section className="py-12 -mt-10">
        <Container className="max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white shadow-xl">
              <CardHeader>
                <CardTitle className="text-center text-slate-800">
                  Our Privacy Commitments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {privacyHighlights.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="text-center group"
                    >
                      <div className="p-3 bg-slate-100 rounded-lg w-fit mx-auto mb-3 group-hover:bg-slate-200/70 transition-colors">
                        <item.icon
                          className={`w-8 h-8 ${item.color} group-hover:scale-110 transition-transform`}
                        />
                      </div>
                      <h3 className="font-semibold text-slate-800 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {item.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </Container>
      </section>

      {/* Data Collection */}
      <section className="py-16">
        <Container className="max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge className="mb-4 bg-slate-100 text-slate-700 hover:bg-slate-200/70">
              Data We Collect
            </Badge>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              Types of Information We Process
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              We collect different types of information to provide you with the
              best shopping experience while respecting your privacy.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {dataTypes.map((category, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-xl transition-shadow border border-slate-200/80">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-slate-800 !text-xl">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <category.icon className="w-5 h-5 text-slate-600" />
                      </div>
                      {category.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-slate-600 text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Detailed Privacy Policy */}
      <section className="py-12 bg-slate-50/70">
        <Container className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              Detailed Privacy Policy
            </h2>
            <p className="text-lg text-slate-600">
              Complete information about how we handle your data
            </p>
          </motion.div>

          <div className="space-y-4">
            {/* Information Collection & Use Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-slate-800 !text-xl">
                  <Database className="w-5 h-5 text-slate-600" />
                  Information Collection & Use
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Separator />
                <div className="space-y-4 text-slate-600 pt-4">
                  <p>
                    We collect information to provide better services to all
                    users. The information we collect falls into several
                    categories:
                  </p>
                  <ul className="space-y-2 pl-4">
                    <li>
                      • Information you provide when creating an account or
                      making purchases
                    </li>
                    <li>
                      • Automatic information collected through cookies and
                      similar technologies
                    </li>
                    <li>
                      • Communication data when you contact our support team
                    </li>
                    <li>
                      • Usage analytics to improve our website and services
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Information Sharing & Disclosure Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-slate-800 !text-xl">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-slate-600" />
                    Information Sharing & Disclosure
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Separator />
                <div className="space-y-4 text-slate-600 pt-4">
                    <p>
                      We do not sell, trade, or rent your personal information
                      to third parties. We may share information only in these
                      limited circumstances:
                    </p>
                    <ul className="space-y-2 pl-4">
                      <li>
                        • With service providers who assist in our operations
                        (payment processing, shipping)
                      </li>
                      <li>
                        • When required by law or to protect our rights and
                        safety
                      </li>
                      <li>
                        • With your explicit consent for specific purposes
                      </li>
                      <li>
                        • In connection with a business transfer or merger
                      </li>
                    </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </section>

      {/* Your Rights */}
      <section className="py-16">
        <Container className="max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge className="mb-4 bg-orange-100 text-orange-700 hover:bg-orange-200/70">
              Your Privacy Rights
            </Badge>
            <h2 className="text-3xl font-bold text-slate-800 mb-4">
              Control Your Data
            </h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              You have the right to control how your personal information is
              collected, used, and shared. Here&apos;s what you can do:
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {userRights.map((right, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-xl transition-all group border border-slate-200/80">
                  <CardContent>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200/70 transition-colors">
                        <right.icon className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-800 mb-2">
                          {right.right}
                        </h3>
                        <p className="text-slate-600 text-sm mb-4">
                          {right.description}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-400 text-slate-600 hover:bg-slate-100/50 text-sm font-semibold px-3 py-1.5 rounded-md border"
                        >
                          {right.action}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-white">
        <Container className="max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="text-center border border-slate-200/80">
              <CardContent className="p-8">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-500" />
                <h3 className="text-2xl font-bold text-slate-800 mb-4">
                  Privacy Questions or Concerns?
                </h3>
                <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
                  Our privacy team is here to help you understand your rights
                  and assist with any data-related requests or concerns.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  
                  <Button
                    asChild
                    variant="outline"
                    className="border-slate-400 text-slate-600 hover:bg-slate-100/50 px-6 py-2.5 rounded-lg border"
                  >
                    <Link href="/#faq">Privacy FAQ</Link>
                  </Button>
                </div>
                <p className="text-sm text-slate-500 mt-6">
                  Email us directly at{" "}
                  <a
                    href="mailto:privacy@shopcart.com"
                    className="text-slate-600 hover:underline"
                  >
                    gambino@bopstore.com.ng
                  </a>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </Container>
      </section>

      {/* Footer Note */}
      <section className="py-8 border-t border-gray-200">
        <Container className="max-w-4xl">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-slate-500" />
              <p className="text-sm text-slate-500">
                This privacy policy was last updated on November 17, 2025
              </p>
            </div>
            <p className="text-xs text-slate-500">
              We may update this policy periodically. We&apos;ll notify you of
              significant changes via email or website notice.
            </p>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default PrivacyPage;
