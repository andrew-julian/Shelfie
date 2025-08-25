# 📚 Shelfie

**From barcode to bookshelf in seconds.**

Shelfie is a full-stack digital library management application that helps you organize your personal book collection with ease. Scan barcodes, fetch rich metadata automatically, and visualize your books in stunning 3D shelves with authentic proportional rendering.

## ✨ Features

### 🔍 **Instant Book Capture**
- **Barcode Scanning**: Point your camera at any book barcode for instant recognition using Scanbot SDK
- **Rich Metadata**: Automatically fetches title, author, edition, cover art, and dimensions via Rainforest API
- **Offline Queue**: Scan books even when offline - they'll sync when you're back online
- **Input Forgiveness**: Automatic cleanup of ISBN formats (whitespace, hyphens)

### 📱 **Beautiful 3D Visualization**
- **Authentic Proportions**: Books appear with real-world dimensions using Amazon dimension data
- **Visual Realism**: SVG fractal noise for paper texture, layered shadows, micro-misalignment
- **Aesthetic Sorting**: Intelligent color-based organization for visually pleasing shelves
- **Responsive Design**: Optimized for mobile, tablet, and desktop viewing

### 🎯 **Smart Organization**
- **Lists & Tags**: Organize books with custom categories
- **Search & Filter**: Find books quickly with powerful search capabilities
- **Export Options**: Download your library data anytime (privacy by design)
- **Multi-device Sync**: Access your library from anywhere

### 💳 **Flexible Subscriptions**
- **Free Plan**: Up to 100 books with all core features
- **Shelfie Unlimited**: $17/year for unlimited books and all features
- **Secure Payments**: Powered by Stripe with automatic billing management

### 🔐 **Privacy & Security**
- **Privacy by Design**: You control your data completely
- **Hybrid Authentication**: Replit OAuth for development, Google OAuth for production
- **Secure Sessions**: PostgreSQL-backed session management with connect-pg-simple
- **Data Portability**: Export or delete your library anytime

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript for modern UI development
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** components built on Radix UI primitives
- **Wouter** for lightweight client-side routing
- **TanStack React Query** for server state management
- **React Hook Form + Zod** for robust form handling and validation
- **Vite** for fast development and optimized production builds

### Backend
- **Express.js** with TypeScript for the REST API
- **PostgreSQL** with Drizzle ORM for type-safe database operations
- **Passport.js** for authentication with multiple OAuth providers
- **Stripe** for subscription and payment processing
- **Session-based authentication** with PostgreSQL storage

### External Services
- **Scanbot SDK v7.2.0** for professional barcode scanning
- **Rainforest API** for comprehensive book metadata lookup
- **Neon Database** for serverless PostgreSQL hosting
- **Vercel** for seamless full-stack deployment

## 🚀 Quick Start

### Prerequisites
- Node.js 18 or later
- PostgreSQL database (local or cloud)
- Required API keys (see Environment Variables section)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/shelfie.git
cd shelfie
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration (see below)
```

4. **Set up the database**
```bash
npm run db:push
```

5. **Start the development server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 🌍 Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/shelfie

# Authentication
SESSION_SECRET=your-session-secret-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# External APIs
RAINFOREST_API_KEY=your-rainforest-api-key
SCANBOT_LICENSE_KEY=your-scanbot-license-key

# Development (Replit)
NODE_ENV=development
REPLIT_DOMAINS=your-replit-domain.replit.dev
```

### Getting API Keys

1. **Stripe**: Create account at [stripe.com](https://stripe.com) for payment processing
2. **Rainforest API**: Sign up at [rainforestapi.com](https://rainforestapi.com) for book metadata
3. **Scanbot SDK**: Get license at [scanbot.io](https://scanbot.io) for barcode scanning
4. **Google OAuth**: Configure at [console.cloud.google.com](https://console.cloud.google.com)

## 📱 Usage

### Adding Books
1. Click "Scan Book" or navigate to the scan page
2. Point your camera at a book's barcode
3. The book is automatically added with complete metadata including cover art

### Managing Your Library
- **View**: Browse your collection in beautiful 3D shelves
- **Search**: Find books by title, author, or ISBN
- **Organize**: Create custom lists and add tags
- **Edit**: Modify book details, covers, or metadata

### Subscription Management
- **Free Forever**: First 100 books with all core features
- **Upgrade**: $17/year for unlimited books
- **Billing**: Manage subscriptions, view invoices, cancel anytime

## 🏗️ Architecture

### Key Design Patterns
- **Shared Schema**: Database models and validation schemas shared between client/server using Zod
- **Component Composition**: Reusable UI components with clear separation of concerns
- **API Abstraction**: Centralized API client with standardized error handling
- **Responsive Design**: Mobile-first approach using Tailwind CSS breakpoints

### Authentication System
- **Development**: Replit OAuth with session-based authentication
- **Production**: Google OAuth for external deployments
- **Email-Based Identity**: Consistent user accounts across OAuth providers
- **Session Management**: PostgreSQL-backed sessions that persist through server restarts

### Database Schema
- **Users**: Authentication data, subscription status, preferences
- **Books**: Complete metadata, cover images, user associations
- **Scanning Queue**: Background processing for offline scans with retry logic
- **Sessions**: Secure session storage with automatic cleanup

### 3D Visualization Engine
- **Dynamic Layout**: O(n) TypeScript positioning algorithm with justified rows
- **Physical Scaling**: Authentic book proportions using Amazon dimension data
- **Deterministic Positioning**: Halton sequences for organic, consistent placement
- **Visual Effects**: Paper texture, shadows, and micro-misalignment for realism

## 🔧 Development

### Database Operations
```bash
# Push schema changes to database
npm run db:push

# Force push (warning: may cause data loss)
npm run db:push --force
```

### Build Commands
```bash
# Build client for production
npm run build:client

# Build entire application
npm run build

# Start production server
npm start
```

### Code Quality
- TypeScript for comprehensive type safety
- Shared schemas ensure consistency between frontend/backend
- ESLint and Prettier for code formatting
- Comprehensive error handling with user-friendly messages

## 🌍 Deployment

### Vercel (Recommended)

1. **Connect Repository**
   - Link your GitHub repository to Vercel
   - Vercel will automatically detect the configuration

2. **Set Environment Variables**
   - Add all required environment variables in Vercel dashboard
   - Ensure `DATABASE_URL` points to production database

3. **Configure Custom Domain** (Optional)
   - Add your domain in Vercel settings
   - Update OAuth redirect URLs accordingly

4. **Deploy**
   - Automatic deployment on push to main branch
   - Manual deploys available in Vercel dashboard

### Manual Deployment
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] OAuth providers configured with production URLs
- [ ] Stripe webhooks configured for production domain
- [ ] SSL/TLS certificates in place

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following our coding standards
4. Test thoroughly (including edge cases)
5. Commit with clear, descriptive messages
6. Push to your fork and submit a pull request

### Development Guidelines
- **TypeScript**: All new code must include proper type definitions
- **Components**: Follow existing patterns for component structure
- **Testing**: Add tests for new features and bug fixes
- **Documentation**: Update relevant documentation for API changes
- **Performance**: Consider impact on bundle size and runtime performance

### Code Style
- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for complex functions
- Ensure accessibility in UI components
- Use meaningful commit messages

## 📊 Project Status

- ✅ **Core Features**: Barcode scanning, 3D visualization, book management
- ✅ **Authentication**: Hybrid OAuth system working in dev and production
- ✅ **Subscriptions**: Stripe integration with billing management
- ✅ **Performance**: Optimized for fast loading and smooth interactions
- ✅ **Mobile**: Responsive design works across all device sizes
- 🚧 **Advanced Features**: Additional sorting options, reading statistics
- 🚧 **Integrations**: Additional metadata sources, social features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Scanbot SDK](https://scanbot.io/) for excellent barcode scanning capabilities
- [Rainforest API](https://rainforestapi.com/) for comprehensive book metadata
- [shadcn/ui](https://ui.shadcn.com/) for beautiful, accessible UI components
- [Stripe](https://stripe.com/) for robust payment processing
- [Vercel](https://vercel.com/) for seamless deployment and hosting

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/shelfie/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/shelfie/discussions)
- **Documentation**: Comprehensive docs available in the `/docs` folder
- **Email**: For sensitive issues, contact the maintainers directly

## 🗺️ Roadmap

### Upcoming Features
- **Reading Statistics**: Track reading progress and generate insights
- **Social Features**: Share libraries and reading lists with friends
- **Advanced Search**: Full-text search within book content
- **Import/Export**: Support for Goodreads, LibraryThing, and other platforms
- **Mobile App**: Native iOS and Android applications

### Performance Improvements
- **CDN Integration**: Faster image loading with global CDN
- **Caching Strategy**: Improved caching for better offline experience
- **Bundle Optimization**: Further reduction in JavaScript bundle size

---

**Built with ❤️ for book lovers everywhere**

*Shelfie makes organizing your personal library as enjoyable as reading the books themselves.*