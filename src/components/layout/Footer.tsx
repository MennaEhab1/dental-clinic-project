import { Link } from "react-router-dom";
import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
} from "lucide-react";

const validFooterRoutes = new Set([
  "/",
  "/services",
  "/doctors",
  "/login",
  "/register",
  "/reset-password",
  "/confirm-email",
  "/booking",
  "/booking/confirmation",
  "/admin/specialities",
]);

const resolveFooterRoute = (href: string) => {
  const [path] = href.split(/[?#]/);
  return validFooterRoutes.has(path) ? href : "/";
};

const footerLinks = {
  services: [
    { label: "General Dentistry", href: "/doctors?specialty=general" },
    { label: "Cosmetic Dentistry", href: "/doctors?specialty=cosmetic" },
    { label: "Orthodontics", href: "/doctors?specialty=orthodontics" },
    { label: "Oral Surgery", href: "/doctors?specialty=oral-surgery" },
    { label: "Pediatric Dentistry", href: "/doctors?specialty=pediatric" },
  ],
  quickLinks: [
    // { label: "About Us", href: "/about" },
    { label: "Our Doctors", href: "/doctors" },
    { label: "Book Appointment", href: "/booking" },
    { label: "Patient Portal", href: "/login" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "HIPAA Compliance", href: "/hipaa" },
  ],
};

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
];

export function Footer() {
  const handleFooterNavigationClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand & Contact */}
          <div className="lg:col-span-1">
            <Link
              to="/"
              onClick={handleFooterNavigationClick}
              className="flex items-center gap-2 mb-4"
            >
              <img
                src="/LogoLunare.png"
                alt="Lunare Logo"
                className="
      h-8
      sm:h-10
      md:h-12
      lg:h-14
      xl:h-16
      2xl:h-18
      w-auto
      object-contain
      transition-all
      duration-300
    "
              />
            </Link>
            <p className="text-muted-foreground text-sm mb-6">
              Providing exceptional dental care with compassion and expertise.
            </p>
            <div className="space-y-3">
              <a
                href="tel:+2018173505"
                className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Phone className="w-4 h-4 text-primary" />
                +2018173505
              </a>
              <a
                href="mailto:info@dentalcare.com"
                className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4 text-primary" />
                info@LunareDetal.com
              </a>
              <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                <span>
                  El-Estad
                  <br />
                  Tanta, Egypt
                </span>
              </div>
              {/* <div className="flex items-start gap-3 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 text-primary mt-0.5" />
                <span>
                  Mon - Fri: 8AM - 6PM
                  <br />
                  Sat: 9AM - 2PM
                </span>
              </div> */}
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">
              Our Services
            </h4>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link
                    to={resolveFooterRoute(link.href)}
                    onClick={handleFooterNavigationClick}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {footerLinks.quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    to={resolveFooterRoute(link.href)}
                    onClick={handleFooterNavigationClick}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">
              Stay Updated
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Subscribe to our newsletter for dental tips and updates.
            </p>
            <form className="space-y-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full px-4 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="submit"
                className="w-full px-4 py-2 rounded-lg gradient-bg text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Subscribe
              </button>
            </form>
            <div className="flex items-center gap-4 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Lunare Team. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.href}
                to={resolveFooterRoute(link.href)}
                onClick={handleFooterNavigationClick}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
