# CLAUDE.md

Guidelines and commands for AI coding assistants working in Childcare Task Agent.

## Commands

```bash
# Development
npm run dev               # Start dev server on http://localhost:3000
npm run build             # Build production bundle
npm run typecheck         # Run TypeScript checks (tsc --noEmit)

# Linting & Formatting (Biome)
npm run lint              # Run Biome linter check
npm run format            # Run Biome formatter
npm run check             # Run Biome format and lint auto-fix

# Database
npm run prisma:generate   # Generate Prisma client
npm run prisma:push       # Push schema changes to database
```

## Architecture & Conventions

- **Next.js App Router**: Pages reside in `src/app/`, API routes in `src/app/api/`.
- **Hybrid Data Store**: `src/lib/repository.ts` reads/writes via Prisma when DB is connected, or falls back seamlessly to `src/lib/memory-store.ts`. Ensure both paths are maintained.
- **Multimodal AI with Privacy**: AI calls are made via OpenRouter in `src/lib/extraction.ts`. All requests must enforce Zero Data Retention (`provider: { data_collection: "deny", zdr: true }`). Never send unneeded personal data.
- **Mobile First**: Design UI for mobile users photographing paper school/nursery handouts.
- **TypeScript & Validation**: Strictly typed. Validate all external inputs and API requests with Zod schemas.
