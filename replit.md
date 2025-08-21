# BookCatalog Application

## Overview

BookCatalog is a full-stack digital library management application that allows users to build and organize their personal book collection. The application features barcode scanning capabilities for easy book addition, comprehensive book metadata management, and a clean, responsive user interface built with modern web technologies.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Enhancements

### Book Visual Realism (August 2025)
- **Paper Texture**: Added SVG fractal noise overlay to simulate printed paper grain on book covers
- **Realistic Shadows**: Implemented layered shadow system with ambient occlusion and contact shadows
- **Micro-misalignment**: Added subtle random positioning per book for natural, human-like arrangement
- **Rapid Scanning Queue**: Created non-blocking queue system for continuous book scanning without waiting for API calls

## System Architecture

### Frontend Architecture
The client-side application is built using **React** with TypeScript, leveraging several key architectural decisions:

- **Component Library**: Uses shadcn/ui components built on Radix UI primitives for consistent, accessible UI elements
- **Styling**: Tailwind CSS with a custom design system featuring primary blue, secondary gray, and accent orange colors
- **State Management**: React Query (@tanstack/react-query) for server state management, providing caching, synchronization, and optimistic updates
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
The server-side follows a **RESTful API** pattern built with Express.js:

- **Framework**: Express.js with TypeScript for type safety
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Shared TypeScript schemas between client and server using Zod for validation
- **Development Strategy**: In-memory storage fallback (MemStorage class) for development/testing environments
- **API Design**: RESTful endpoints following `/api/books` pattern with proper HTTP status codes

### Data Storage Solutions
The application uses a **dual-storage approach**:

- **Production Database**: PostgreSQL with Neon serverless database for scalable cloud storage
- **Development Storage**: In-memory storage implementation for rapid development and testing
- **Schema Definition**: Centralized schema definitions in `shared/schema.ts` ensuring consistency across the stack
- **Migration Management**: Drizzle Kit for database schema migrations and versioning

### Authentication and Authorization
Currently implements a **session-based approach**:

- Session management using `connect-pg-simple` for PostgreSQL-backed sessions
- No complex authentication flows implemented, focusing on core functionality first
- Architecture prepared for future authentication integration

### External Service Integrations
The application integrates with several external services:

- **Rainforest API**: For book metadata lookup by ISBN, providing title, author, description, cover images, and publication details
- **Barcode Scanning**: Frontend integration with ZXing library and Quagga for camera-based barcode scanning
- **Database Hosting**: Neon serverless PostgreSQL for production database hosting

### Key Architectural Patterns

#### Shared Schema Pattern
Uses a shared schema approach where database models, validation schemas, and TypeScript types are defined once and shared between client and server, ensuring type safety and consistency.

#### Component Composition
Frontend uses a composable component architecture with reusable UI components, custom hooks for business logic, and separation of concerns between presentation and data management.

#### API Abstraction
Implements a centralized API client with standardized error handling, request/response processing, and React Query integration for seamless data fetching.

#### Responsive Design
Mobile-first responsive design approach using Tailwind CSS breakpoints and custom hooks for device detection.

## External Dependencies

### Core Framework Dependencies
- **React 18+**: Frontend framework with modern hooks and concurrent features
- **Express.js**: Backend web framework for RESTful API development
- **TypeScript**: Type safety across the entire application stack

### Database and ORM
- **PostgreSQL**: Primary database for production environments
- **Drizzle ORM**: Type-safe database toolkit with excellent TypeScript integration
- **@neondatabase/serverless**: Serverless PostgreSQL database driver

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Radix UI**: Headless UI primitives for accessible component development
- **shadcn/ui**: Pre-built component library based on Radix UI

### State Management and Data Fetching
- **TanStack React Query**: Server state management with caching and synchronization
- **Wouter**: Lightweight routing library for single-page application navigation

### External APIs and Services
- **Rainforest API**: Amazon product data API for book metadata retrieval
- **ZXing Library**: Barcode and QR code scanning capabilities

### Development and Build Tools
- **Vite**: Fast build tool and development server
- **ESBuild**: JavaScript bundler for production builds
- **PostCSS**: CSS processing with Autoprefixer for browser compatibility

### Form Handling and Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema validation library
- **@hookform/resolvers**: Integration between React Hook Form and Zod

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **clsx**: Conditional className utility
- **class-variance-authority**: Type-safe variant API for component styling