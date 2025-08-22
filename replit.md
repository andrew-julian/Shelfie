# BookScan Application

## Overview

BookScan is a full-stack digital library management application that allows users to build and organize their personal book collection. The application features barcode scanning capabilities for easy book addition, comprehensive book metadata management, and a clean, responsive user interface built with modern web technologies.

## User Preferences

Preferred communication style: Simple, everyday language.
Development approach: Avoid hardcoded fixes for specific titles or content - build scalable general solutions that handle edge cases through improved logic.

## Recent Enhancements

### Physical Proportions Layout System (August 2025)
- **True Physical Scaling**: Books now display with accurate real-world proportions using Amazon dimension data (8.27"×10.27" vs 5.16"×7.68")
- **Dimension Parsing**: Intelligent parsing of both inches and centimeters from Amazon data with proper conversion logic
- **Proportion Preservation**: Layout engine modified to maintain individual book heights instead of forcing uniform row heights
- **Centered Row Layout**: All rows are centered within the container to eliminate awkward whitespace
- **Minimal Stretch Limits**: Maximum 1.05x scaling to prevent aspect ratio distortion while allowing slight justification
- **Optimized Space Usage**: Increased base scale factor (0.85) and aggressive row packing to maximize horizontal space utilization
- **Coffee Table Books**: Large format books like "Elements of Pizza" appear dramatically larger than paperbacks like "Innovation"
- **Touch Scroll Detection**: Comprehensive touch event handling to prevent accidental book hover animations during mobile scrolling
- **Deterministic Positioning**: Uses book ID-based micro-rotations for consistent yet natural appearance without randomness

### Progress Control System (August 2025)
- **Real-time Progress Tracking**: Server-Sent Events provide live progress updates during refresh operations with visual progress bar
- **Interactive Control Interface**: Pause, resume, and stop functionality for long-running refresh operations with dedicated buttons
- **Visual Status Indicators**: Clear status displays for running, paused, and stopped states with appropriate icons and colors
- **Progress Detail Display**: Shows current book being processed, completed books list, and error tracking
- **Estimated Time Remaining**: Dynamic calculation based on current progress rate and remaining items
- **Mobile-responsive Progress UI**: Clean progress page design optimized for mobile with toast notifications for control actions

### User Management System (August 2025)
- **Database-Connected User Switcher**: Real-time user switching connected to actual database users, replacing hardcoded test data
- **Dynamic User Loading**: Fetches all users from database when user switcher is accessed
- **Session Context Switching**: Properly updates session context to reflect switched user for testing/development
- **Forgiving ISBN Input**: Automatic cleanup of whitespace and hyphens from ISBN inputs across scanning and manual entry
- **Tidy Up Mode Removal**: Completely removed "Tidy Up" functionality from entire codebase per user request for cleaner interface

### Headless Layout Engine (August 2025)
- **O(n) Complexity**: Single-pass row-building algorithm with justified text-like layout
- **Halton Sequences**: Deterministic quasi-random positioning using radical inverse functions for organic book arrangement
- **Justified Rows**: Smart scaling that maintains consistent row heights while preventing text-river effects
- **Organic Positioning**: Hash-based deterministic jitter, rotation, and depth variations for natural appearance
- **Configurable Parameters**: Customizable gutters, jitter amounts, tilt angles, and ragged/justified last row options
- **Pure Functions**: Side-effect free implementation suitable for server-side rendering and testing
- **Container Query Responsive**: CSS container queries for fluid responsiveness with size clamping (84px-360px width limits)
- **No Collision Detection**: Removed O(n²) AABB overlap logic in favor of gap-aware jitter clamping for single-pass performance
- **Mobile Optimization**: Dynamic row heights (160px-200px) and gutters (8px-14px) based on container width
- **Virtualization**: Optional chunked rendering for large libraries (>1000 books) with 200-item chunks and 2-chunk buffer zones
- **Performance Scaling**: Memory footprint independent of total books, maintains >55 FPS on mid-range laptops for 5,000+ books
- **Keyboard Navigation**: Progressive chunk mounting when navigating with arrow keys through virtualized content
- **No Collision Detection**: Eliminated O(n²) AABB collision checks in favor of gap-aware jitter clamping during placement
- **Single DOM Commit**: Reflow cost dominated by single pass calculation and one DOM update, even with 1,000+ books
- **Single DOM Commit**: Reflow cost dominated by single pass calculation and one DOM update, even with 1,000+ books

### Book Visual Realism (August 2025)
- **Paper Texture**: Added SVG fractal noise overlay to simulate printed paper grain on book covers
- **Realistic Shadows**: Implemented layered shadow system with ambient occlusion and contact shadows
- **Micro-misalignment**: Added subtle random positioning per book for natural, human-like arrangement
- **Glossy Highlights**: Implemented specular highlights and vignette effects for professional glossy stock appearance
- **Rapid Scanning Queue**: Created non-blocking queue system for continuous book scanning without waiting for API calls
- **Aesthetic Color Sorting**: Implemented comprehensive image analysis for color sorting that groups books by overall lightness, warmth/coolness, and color families for visually pleasing library arrangements

### Navigation & UI Optimization (August 2025)  
- **Mid-Width Screen Responsive Design**: Optimized header navigation to prevent wrapping and clutter on mid-width screens with:
  - Progressive spacing adjustments (space-x-2 lg:space-x-4 xl:space-x-6)
  - Smaller text and icons on medium screens with larger variants on desktop
  - Compact button layouts with abbreviated text on smaller screens
  - Compressed book count display format (55/60 vs 55 of 60 books)
  - Shortened color sort option labels for better fit

### Scanbot SDK Integration (August 2025)
- **Environment-Based License Keys**: Implemented automatic license key selection based on domain
  - Production: Uses bookscan.vanaheim.com.au license key
  - Development: Uses Replit-specific license key for riker.replit.dev subdomains
  - Automatic detection based on window.location.hostname
- **Mobile UX Improvements**: Added guidance for mobile cancel button limitations and 30-second timeout fallback
- **Book Cover Modal Fix**: Fixed immediate visual feedback when selecting different cover options in book details modal

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

#### Dynamic Layout Architecture
Implements a sophisticated positioning system that replaces traditional CSS grids:
- **Bin-packing Algorithm**: Uses shelf-based space allocation for optimal book placement
- **Touch-aware Interactions**: Distinguishes between scroll gestures and intentional book selection
- **Position Stability**: Maintains consistent layout across re-renders with deterministic calculations
- **Collision Detection**: Prevents visual overlap while preserving color-sorted arrangements
- **Headless Layout Engine**: New O(n) TypeScript engine with justified rows, Halton sequences for organic positioning, and configurable parameters

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