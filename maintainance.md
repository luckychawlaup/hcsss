# Start development server (fixed port 9002)
npm run dev

# Start on random port (9000-9999)
npm run dev-random

# Fix Supabase schema cache issue (MOST COMMON)
npm run fresh-start

# Everything is broken? Nuclear option
npm run super-clean

# Remove build folders only (.next, out, build, cache)
npm run clear-cache

# Clear npm cache only
npm run clear-npm

# Clear all cache folders + npm cache
npm run clear-all

# Clear cache + restart dev server (random port)
npm run fresh-start

# Remove node_modules + reinstall packages
npm run reinstall

# Clear everything + reinstall + restart (random port)
npm run nuclear

# Complete reset: Clean + Install + Update + Audit + Build + Start
npm run complete-reset

# Super clean: Clean + Install + Update + Audit + Start (no build, faster)
npm run super-clean

# Check for vulnerabilities (safe, no changes)
npm run audit

# Fix vulnerabilities (safe updates only)
npm run audit-fix

# Fix vulnerabilities (force, may break things!)
npm run audit-fix-force

# See which packages have updates available
npm run check-updates

# Update all packages to latest compatible versions
npm run update-packages

# Update packages + fix vulnerabilities (force)
npm run upgrade-all

# Update all packages + fix vulnerabilities
npm run upgrade-all

# Reinstall + update + fix (thorough, no dev server)
npm run full-upgrade

# Full upgrade + restart dev server (random port)
npm run upgrade-and-start