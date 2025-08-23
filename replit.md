# BookScan Application

## Overview
BookScan is a full-stack digital library management application designed to help users organize their personal book collections. It features barcode scanning for easy book addition, comprehensive metadata management, and a responsive user interface. The project aims to provide a robust and intuitive solution for personal library organization with strong ambitions for market potential.

## User Preferences
Preferred communication style: Simple, everyday language.
Development approach: Avoid hardcoded fixes for specific titles or content - build scalable general solutions that handle edge cases through improved logic.

## System Architecture

### Frontend Architecture
The client-side is built with **React** and TypeScript, utilizing:
- **Component Library**: shadcn/ui components built on Radix UI primitives.
- **Styling**: Tailwind CSS with a custom design system.
- **State Management**: React Query for server state management.
- **Routing**: Wouter for lightweight client-side routing.
- **Form Handling**: React Hook Form with Zod validation.
- **Build Tool**: Vite for fast development and optimized production builds.

### Backend Architecture
The server-side uses a **RESTful API** pattern built with Express.js:
- **Framework**: Express.js with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations.
- **Schema Management**: Shared TypeScript schemas between client and server using Zod.
- **Development Strategy**: In-memory storage fallback for development/testing.
- **API Design**: RESTful endpoints following `/api/books` patterns.

### Data Storage Solutions
The application employs a **dual-storage approach**:
- **Production Database**: PostgreSQL with Neon serverless database.
- **Development Storage**: In-memory storage for rapid development and testing.
- **Schema Definition**: Centralized schema definitions in `shared/schema.ts`.
- **Migration Management**: Drizzle Kit for database schema migrations.

### Authentication and Authorization
Currently implements a **session-based approach** using `connect-pg-simple` for PostgreSQL-backed sessions.

### Key Architectural Patterns
- **Shared Schema Pattern**: Database models, validation schemas, and TypeScript types are defined once and shared.
- **Component Composition**: Reusable UI components, custom hooks, and separation of concerns.
- **Dynamic Layout Architecture**: A sophisticated positioning system with an O(n) TypeScript headless engine, justified rows, and Halton sequences for organic positioning. It includes features like physical scaling based on Amazon dimension data, and deterministic positioning.
- **API Abstraction**: Centralized API client with standardized error handling and React Query integration.
- **Responsive Design**: Mobile-first approach using Tailwind CSS breakpoints.

### UI/UX Decisions
- **Color Scheme**: Primary blue, secondary gray, and accent orange.
- **Book Display**: Accurate real-world proportions for books using Amazon dimension data, centered row layouts, and optimized space usage.
- **Visual Realism**: SVG fractal noise for paper texture, layered shadows, micro-misalignment, and glossy highlights.
- **Aesthetic Sorting**: Image analysis for color sorting to group books by lightness, warmth/coolness, and color families.
- **Navigation & UI Optimization**: Mid-width screen responsive design, automatic book refresh, and mobile layout auto-trigger.

### Feature Specifications
- **Barcode Scanning**: Implementation of Scanbot SDK v7.2.0 with camera access and barcode detection, including environment-based license keys and path resolution.
- **Persistent Scanning Queue System**: Database-driven queue (PostgreSQL `scanningQueue` table) with background processing, real-time updates, and error recovery.
- **Progress Control System**: Server-Sent Events for live progress tracking during refresh operations, with interactive controls (pause, resume, stop), visual indicators, and estimated time remaining.
- **User Management System**: Database-connected user switcher, dynamic user loading, and session context switching.
- **Input Forgiveness**: Automatic cleanup of whitespace and hyphens from ISBN inputs.

## External Dependencies

### Core Framework Dependencies
- **React 18+**: Frontend framework.
- **Express.js**: Backend web framework.
- **TypeScript**: Type safety across the stack.

### Database and ORM
- **PostgreSQL**: Production database.
- **Drizzle ORM**: Type-safe database toolkit.
- **@neondatabase/serverless**: Serverless PostgreSQL driver.

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework.
- **Radix UI**: Headless UI primitives.
- **shadcn/ui**: Pre-built component library.

### State Management and Data Fetching
- **TanStack React Query**: Server state management.
- **Wouter**: Lightweight routing library.

### External APIs and Services
- **Rainforest API**: For book metadata lookup by ISBN.
- **Scanbot SDK**: Fully functional barcode scanner.

### Development and Build Tools
- **Vite**: Fast build tool and development server.
- **ESBuild**: JavaScript bundler.
- **PostCSS**: CSS processing.

### Form Handling and Validation
- **React Hook Form**: Performant form library.
- **Zod**: TypeScript-first schema validation library.
- **@hookform/resolvers**: Integration between React Hook Form and Zod.

### Utility Libraries
- **date-fns**: Date manipulation.
- **clsx**: Conditional className utility.
- **class-variance-authority**: Type-safe variant API.