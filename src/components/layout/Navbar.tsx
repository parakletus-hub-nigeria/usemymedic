import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-primary">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/mymedic-logo.png" alt="MyMedic" className="h-9 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground">
            Home
          </Link>
          <Link to="/about" className="text-sm font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground">
            About
          </Link>
          <Link to="/contact" className="text-sm font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground">
            Contact
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" className="text-primary-foreground/90 hover:bg-secondary hover:text-primary-foreground" asChild>
            <Link to="/login">Log In</Link>
          </Button>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold" asChild>
            <Link to="/register">Sign Up</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="text-primary-foreground md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-secondary bg-primary px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-3">
            <Link to="/" className="text-sm font-medium text-primary-foreground/80 py-2" onClick={() => setMobileOpen(false)}>Home</Link>
            <Link to="/about" className="text-sm font-medium text-primary-foreground/80 py-2" onClick={() => setMobileOpen(false)}>About</Link>
            <Link to="/contact" className="text-sm font-medium text-primary-foreground/80 py-2" onClick={() => setMobileOpen(false)}>Contact</Link>
            <hr className="border-secondary" />
            <Button variant="ghost" className="justify-start text-primary-foreground/90 hover:bg-secondary" asChild>
              <Link to="/login" onClick={() => setMobileOpen(false)}>Log In</Link>
            </Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold" asChild>
              <Link to="/register" onClick={() => setMobileOpen(false)}>Sign Up</Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
