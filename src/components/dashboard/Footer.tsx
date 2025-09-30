
import { ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-background border-t border-border mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-12 items-center justify-center">
            <div className="flex items-center">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <p className="ml-2 text-xs text-muted-foreground">Secured by Transport Layer Security (TLS 1.3)</p>
            </div>
        </div>
      </div>
    </footer>
  );
}
