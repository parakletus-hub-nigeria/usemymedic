import { Link } from "react-router-dom";
import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t bg-primary text-primary-foreground">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/mymedic-logo.png" alt="MyMedic" className="h-8 w-auto" />
            </Link>
            <p className="text-sm text-primary-foreground/70 max-w-xs">
              Connecting patients with verified healthcare professionals. Trusted, secure, and accessible.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-primary-foreground">Platform</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/register" className="hover:text-accent transition-colors">Find a Doctor</Link></li>
              <li><Link to="/register" className="hover:text-accent transition-colors">For Professionals</Link></li>
              <li><Link to="/about" className="hover:text-accent transition-colors">How It Works</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-primary-foreground">Support</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/contact" className="hover:text-accent transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-accent transition-colors">FAQ</Link></li>
              <li><Link to="/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-primary-foreground">Legal</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/terms" className="hover:text-accent transition-colors">Terms of Service</Link></li>
              <li><Link to="/hipaa" className="hover:text-accent transition-colors">HIPAA Compliance</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-secondary pt-6 md:flex-row">
          <p className="text-xs text-primary-foreground/50">
            © {new Date().getFullYear()} MyMedic. All rights reserved.
          </p>
          <p className="flex items-center gap-1 text-xs text-primary-foreground/50">
            Made with <Heart className="h-3 w-3 text-accent" /> for better healthcare
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
