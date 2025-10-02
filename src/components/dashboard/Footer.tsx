
import { ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-background border-t border-border mt-auto print:hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>&copy; {new Date().getFullYear()} Hilton Convent School. All Rights Reserved.</p>
            <p>Developed with ❤️ by Lucky Chawla</p>
            <div className="flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Secured by Transport Layer Security (TLS 1.3)</span>
            </div>
        </div>
      </div>
    </footer>
  );
}
