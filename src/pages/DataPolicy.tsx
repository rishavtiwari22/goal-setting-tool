import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function DataPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="relative w-full px-6 py-4 flex items-center justify-center">
          <button
            onClick={() => navigate(-1)}
            className="cursor-pointer absolute left-6 text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft />
          </button>
          <h1 className="text-base font-semibold">
            Privacy Policy and Data Protection
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 flex-1">
        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Privacy Policy and Data Protection Framework
            </h1>
            <p className="text-sm text-gray-600">
              Zoe AI Applications (zoe.zuvy.org)
            </p>
            <div className="mt-4 text-sm text-gray-500 space-y-1">
              <p>Effective Date: August 1, 2025</p>
              <p>Last Updated: July 31, 2025</p>
            </div>
          </div>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              NavGurukul Foundation for Social Welfare ("we," "our," or "NavGurukul") operates Zoe AI Applications at zoe.zuvy.org. This Privacy Policy describes how we collect, use, store, and protect your data in compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act) and our commitment to responsible AI principles.
            </p>
            <p className="text-gray-700 leading-relaxed font-medium">
              Our Core Commitment: We process voice data client-side to ensure your voice recordings never leave your device, minimizing data transmission and protecting your privacy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">2. Data Protection Officer</h2>
            <div className="space-y-2">
              <p className="text-gray-700 font-medium">Data Protection Responsibilities:</p>
              <p className="text-gray-700">
                Primary Contact: Nitin Sudarshan, CEO's Office<br />
                Email: <a href="mailto:data@navgurukul.org" className="text-[#2C5F2D] hover:underline">data@navgurukul.org</a><br />
                Role: Oversees DPDP Act compliance, data governance policies, and user rights management
              </p>
              <p className="text-gray-700">
                Ethics Committee: Led by Prachi Shah (Director, AI Initiatives) and Balakrishnan Chettythody (Director, CEO's Office)
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">3. Legal Basis and Compliance</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">3.1 DPDP Act 2023 Compliance</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Valid consent obtained for all data processing activities</li>
                  <li>Clear notice provided before data collection</li>
                  <li>User rights to access, correction, and deletion honored within statutory timelines</li>
                  <li>Grievance redressal mechanism operational</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">3.2 Child Data Protection (Users Under 18)</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Verifiable parental consent obtained for users under 18 years</li>
                  <li>School deployments: Institutional consent from school administration with parental notification</li>
                  <li>Minimal data collection enforced for minor users</li>
                  <li>Enhanced security protocols for child user data</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">4. Data Collection and Use</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">4.1 What We Collect</h3>
                <p className="text-gray-700 mb-3">We collect only essential data necessary to provide AI-powered learning services:</p>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">Data Type</th>
                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">Purpose</th>
                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">Legal Basis</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">User ID and Authentication</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Account management and service access</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Consent</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Session Metadata</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Usage analytics and service improvement</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Consent</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Interaction Logs (text transcripts)</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Learning progress tracking and AI improvement</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Consent</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Device Information</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Performance optimization for low-end devices</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Legitimate Interest</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Application Usage Data</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Feature engagement and pedagogical effectiveness</td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Consent</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">4.2 What We Do NOT Collect</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Voice recordings (processed client-side only)</li>
                  <li>Personally Identifiable Information (PII) beyond authentication</li>
                  <li>Location data</li>
                  <li>Biometric data</li>
                  <li>Browsing history outside zoe.zuvy.org</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">4.3 Client-Side Voice Processing</h3>
                <p className="text-gray-700 mb-2">Our architecture ensures maximum privacy:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Speech-to-Text (STT): Processed entirely on your device using browser APIs</li>
                  <li>Text-to-Speech (TTS): Generated on your device</li>
                  <li>Zero Server Transmission: Voice recordings never leave your device</li>
                  <li>Text-Only Storage: Only text transcripts (after client-side STT) are transmitted for AI response generation</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">5. Data Storage and Security</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">5.1 Security Measures</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Encryption at Rest: AES-256 encryption for all stored data</li>
                  <li>Encryption in Transit: TLS 1.3 for all data transmission</li>
                  <li>Access Control: Role-based access restricted to authorized personnel only</li>
                  <li>Infrastructure: Secure cloud hosting with SOC 2 Type II compliant providers</li>
                  <li>Audit Logs: Comprehensive logging of all data access events</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">5.2 Data Retention</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Active Users: Data retained while account is active</li>
                  <li>Inactive Accounts: Automatic anonymization after 12 months of inactivity</li>
                  <li>Deletion Requests: Complete data deletion within 30 days of request</li>
                  <li>Backup Systems: Deleted data purged from backups within 90 days</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">5.3 Data Location</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Primary servers located in India</li>
                  <li>No cross-border data transfer without explicit consent</li>
                  <li>Compliance with data localization requirements under DPDP Act</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">6. Your Rights Under DPDP Act 2023</h2>
            <p className="text-gray-700">You have the following rights regarding your personal data:</p>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">6.1 Right to Access</h3>
                <p className="text-gray-700">
                  Request a copy of your data: <a href="mailto:data@navgurukul.org" className="text-[#2C5F2D] hover:underline">data@navgurukul.org</a><br />
                  Response within 7 business days
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">6.2 Right to Correction</h3>
                <p className="text-gray-700">
                  Update inaccurate data through your account settings<br />
                  Request corrections via: <a href="mailto:data@navgurukul.org" className="text-[#2C5F2D] hover:underline">data@navgurukul.org</a>
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">6.3 Right to Deletion</h3>
                <p className="text-gray-700">
                  Delete your account and all associated data<br />
                  Automated deletion workflows process requests within 30 days<br />
                  Request deletion: <a href="mailto:data@navgurukul.org" className="text-[#2C5F2D] hover:underline">data@navgurukul.org</a>
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">6.4 Right to Withdraw Consent</h3>
                <p className="text-gray-700">
                  Withdraw consent at any time through account settings<br />
                  Service access may be limited upon consent withdrawal
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">6.5 Right to Nominate</h3>
                <p className="text-gray-700">
                  Nominate a representative for exercising your rights<br />
                  Nomination process: <a href="mailto:data@navgurukul.org" className="text-[#2C5F2D] hover:underline">data@navgurukul.org</a>
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">6.6 Right to Grievance Redressal</h3>
                <p className="text-gray-700">
                  File complaints with our Data Protection Officer<br />
                  Escalate to Data Protection Board of India if unresolved
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">7. Responsible AI and Ethical Safeguards</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">7.1 Bias Monitoring and Mitigation</h3>
                <p className="text-gray-700 mb-2">We actively work to ensure fairness across diverse user populations:</p>
                <div className="ml-4 space-y-2">
                  <p className="text-gray-700 font-medium">Accent Inclusion:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Training data includes regional accents from rural, tribal, and low-income urban areas</li>
                    <li>Continuous testing with target demographic speech patterns</li>
                    <li>Performance benchmarking across 10 Indian languages</li>
                  </ul>
                  <p className="text-gray-700 font-medium mt-3">Gender Equity:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Performance parity testing across male, female, and non-binary voices</li>
                    <li>Quarterly audits to identify and correct gender-based disparities</li>
                  </ul>
                  <p className="text-gray-700 font-medium mt-3">Socioeconomic Accessibility:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Optimized for devices under ₹10,000</li>
                    <li>Tested on 3+ year-old hardware</li>
                    <li>Low-bandwidth and offline functionality prioritized</li>
                  </ul>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">7.2 Harmful Content Management</h3>
                <div className="ml-4 space-y-2">
                  <p className="text-gray-700 font-medium">AI Output Filtering:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Multi-layer content moderation prevents inappropriate, harmful, or biased responses</li>
                    <li>Real-time filtering for hate speech, violence, sexual content, and discriminatory language</li>
                    <li>Age-appropriate content policies enforced</li>
                  </ul>
                  <p className="text-gray-700 font-medium mt-3">Prompt Injection Protection:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Input validation prevents malicious prompt manipulation</li>
                    <li>Security testing for adversarial inputs</li>
                    <li>Rate limiting to prevent abuse</li>
                  </ul>
                  <p className="text-gray-700 font-medium mt-3">Human Oversight:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Flagged content reviewed by learning team within 24 hours</li>
                    <li>Weekly content moderation reports to ethics committee</li>
                    <li>Continuous improvement based on flagged incidents</li>
                  </ul>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">7.3 Transparency and Explainability</h3>
                <div className="ml-4 space-y-2">
                  <p className="text-gray-700 font-medium">Model Documentation:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Clear disclosure that services use AI technology</li>
                    <li>Limitations communicated upfront (e.g., not a replacement for human teachers)</li>
                    <li>Model capabilities and performance metrics published</li>
                  </ul>
                  <p className="text-gray-700 font-medium mt-3">Explainability:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Students can request explanations for AI feedback</li>
                    <li>AI Interviewer provides rationale for assessment scores</li>
                    <li>Socratic Tutor explains reasoning steps</li>
                  </ul>
                  <p className="text-gray-700 font-medium mt-3">Feedback Mechanism:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>In-app reporting button for problematic AI behavior</li>
                    <li>Anonymous feedback option available</li>
                    <li>Monthly review cycles with published improvement actions</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">8. Cookies and Tracking Technologies</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">8.1 Essential Cookies</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Session management cookies (required for service)</li>
                  <li>Authentication tokens (secure, httpOnly)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">8.2 Analytics Cookies</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Usage analytics for service improvement (opt-out available)</li>
                  <li>No third-party tracking cookies</li>
                  <li>No advertising or cross-site tracking</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">8.3 Cookie Management</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Control cookies through browser settings</li>
                  <li>Clear instructions provided in Help Center</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">9. Third-Party Services</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">9.1 Service Providers</h3>
                <p className="text-gray-700 mb-2">We use limited third-party services:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Cloud Hosting: AWS/Azure (data processing agreement in place)</li>
                  <li>Authentication: Internal system (no external auth providers)</li>
                  <li>Analytics: Self-hosted analytics (no data sharing with third parties)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">9.2 Data Sharing</h3>
                <p className="text-gray-700 mb-2">We do NOT sell, rent, or share your data with third parties except:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>When required by law or court order</li>
                  <li>With your explicit consent</li>
                  <li>With service providers under strict data processing agreements</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">10. Data Breach Response</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">10.1 Breach Notification</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Data Protection Board of India notified within 72 hours</li>
                  <li>Affected users notified within 72 hours</li>
                  <li>Transparent communication of breach scope and remediation steps</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">10.2 Incident Response</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Dedicated incident response team</li>
                  <li>Forensic analysis and containment protocols</li>
                  <li>Post-incident review and policy updates</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">11. Children's Privacy (Under 18)</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">11.1 Enhanced Protections</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Verifiable parental consent mechanisms</li>
                  <li>Minimal data collection (username, grade, school only)</li>
                  <li>No behavioral advertising</li>
                  <li>Restricted data retention (12 months maximum)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">11.2 School Deployments</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Institutional consent from school administration</li>
                  <li>Parental notification provided by schools</li>
                  <li>Bulk deletion capabilities for school administrators</li>
                  <li>Annual consent renewal for multi-year programs</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">12. Special Provisions for Voice Data</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">12.1 Client-Side Processing Architecture</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Voice recordings processed entirely on user device</li>
                  <li>No voice data transmitted to servers</li>
                  <li>Browser Web Speech API and MediaDevices API used</li>
                  <li>Text transcripts (post-STT) are the only data transmitted</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">12.2 Voice Data Security</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Temporary voice buffers cleared immediately after processing</li>
                  <li>No voice data caching on device or server</li>
                  <li>Client-side processing code open-source for audit</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">13. Research and Development</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">13.1 De-identified Data</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Aggregated, anonymized data used for AI improvement</li>
                  <li>No re-identification possible</li>
                  <li>Published research follows ethical guidelines</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">13.2 External Research Partnerships</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Independent RCTs with academic partners</li>
                  <li>Ethics review board approval required</li>
                  <li>Participant consent obtained separately</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">14. Updates to This Policy</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">14.1 Policy Changes</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Users notified 30 days before material changes</li>
                  <li>Notification via email and in-app alerts</li>
                  <li>Continued use constitutes acceptance</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">14.2 Version History</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>All policy versions archived and accessible</li>
                  <li>Change log maintained and published</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">15. Contact Information</h2>
            <div className="space-y-3 text-gray-700">
              <div>
                <p className="font-medium mb-1">Data Protection Officer:</p>
                <p>Nitin Sudarshan, CEO's Office</p>
                <p>NavGurukul Foundation for Social Welfare</p>
                <p>354, Sector 47, Gurugram - 122018</p>
                <p>Email: <a href="mailto:data@navgurukul.org" className="text-[#2C5F2D] hover:underline">data@navgurukul.org</a></p>
              </div>
              <div>
                <p className="font-medium mb-1">Privacy Inquiries:</p>
                <p>Email: <a href="mailto:data@navgurukul.org" className="text-[#2C5F2D] hover:underline">data@navgurukul.org</a></p>
              </div>
              <div>
                <p className="font-medium mb-1">Grievance Redressal:</p>
                <p>Email: <a href="mailto:data@navgurukul.org" className="text-[#2C5F2D] hover:underline">data@navgurukul.org</a></p>
                <p>Response Time: 7 business days</p>
              </div>
              <div>
                <p className="font-medium mb-1">Data Protection Board of India:</p>
                <p>For unresolved complaints: <a href="https://www.dataprotection.gov.in" target="_blank" rel="noopener noreferrer" className="text-[#2C5F2D] hover:underline">https://www.dataprotection.gov.in</a></p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">16. Acknowledgment and Consent</h2>
            <p className="text-gray-700 leading-relaxed">
              By using Zoe AI Applications at zoe.zuvy.org, you acknowledge that you have read, understood, and agree to this Privacy Policy and our commitment to protecting your data under the Digital Personal Data Protection Act, 2023.
            </p>
            <div className="mt-4 text-sm text-gray-500 space-y-1">
              <p>Last Reviewed: July 31, 2025</p>
              <p>Next Review: January 31, 2026</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

