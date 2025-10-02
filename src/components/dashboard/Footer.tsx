
import Link from 'next/link';
import { BookOpen, Shield, FileText, Info, Users, Receipt } from 'lucide-react';

const footerLinks = [
    { href: "/about", label: "About Us", icon: Users },
    { href: "/help", label: "Help & FAQ", icon: Info },
    { href: "https://ncert.nic.in/textbook.php", label: "NCERT Books", icon: BookOpen, external: true },
    { href: "/terms", label: "Terms of Service", icon: FileText },
    { href: "/privacy", label: "Privacy Policy", icon: Shield },
    { href: "/refund-policy", label: "Refund Policy", icon: Receipt },
]

export default function Footer() {
  return (
    <footer className="w-full bg-background border-t border-border mt-auto print:hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-4">
          {footerLinks.map(link => (
            <Link 
                href={link.href} 
                key={link.label}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
            >
                <link.icon className="h-4 w-4" />
                <span>{link.label}</span>
            </Link>
          ))}
        </div>
        <div className="text-center text-xs text-muted-foreground mt-8">
            <p>&copy; {new Date().getFullYear()} Hilton Convent School. All Rights Reserved.</p>
            <p>Developed with ❤️ by Lucky Chawla</p>
        </div>
      </div>
    </footer>
  );
}
