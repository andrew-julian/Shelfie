import { useState, useEffect } from "react";
import { Camera, Sparkles, Search, Download, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ShelfieIcon from "@/components/shelfie-icon";
import DemoShelf from "@/components/demo-shelf";
import { demoBooksData } from "@/lib/books-demo";

export default function Landing() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const handleAnalyticsEvent = (eventName: string) => {
    // Analytics stub - to be implemented
    console.log(`Analytics event: ${eventName}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <ShelfieIcon size={32} />
              <span className="text-xl font-bold text-gray-900">Shelfie</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#privacy" className="text-gray-600 hover:text-gray-900 transition-colors">Privacy</a>
            </nav>
            <Button asChild>
              <a href="/api/login" data-testid="button-get-app">Scan your books</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-blue-50 pt-16 pb-20">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                  Build a beautiful library you'll actually use
                </h1>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  Scan barcodes, fetch the right details, and see your books on a shelf that looks like your shelf.
                </p>
                <div className="flex justify-center lg:justify-start">
                  <Button 
                    size="lg" 
                    asChild
                    className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                    onClick={() => handleAnalyticsEvent('click_cta_primary')}
                  >
                    <a href="/api/login" data-testid="button-primary-cta">
                      Scan your books
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </a>
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-4">No ads. No clutter.</p>
              </div>
              
              <div className="relative">
                <DemoShelf books={demoBooksData.slice(0, 6)} reducedMotion={reducedMotion} />
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">How it works</h2>
              <p className="text-xl text-gray-600">Three simple steps to your perfect library</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Camera className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-bold mb-4">1. Scan</h3>
                <p className="text-gray-600">Point at a barcode. Shelfie recognises the book in a snap.</p>
              </div>
              
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-4">2. Auto-enrich</h3>
                <p className="text-gray-600">We fetch title, author, edition, dimensions, and cover.</p>
              </div>
              
              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-4">3. Enjoy</h3>
                <p className="text-gray-600">Browse your library, filter by author/genre, and share a shelf.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Everything you need</h2>
              <p className="text-xl text-gray-600">Features that make managing your library a joy</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <Camera className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-bold mb-2">Instant capture</h3>
                  <p className="text-gray-600 text-sm">Scan a barcode; Shelfie fetches rich metadata & cover art.</p>
                </CardContent>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <Search className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-bold mb-2">Your library, anywhere</h3>
                  <p className="text-gray-600 text-sm">Search, sort, and filter across all devices.</p>
                </CardContent>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <Sparkles className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-bold mb-2">Looks like your shelf</h3>
                  <p className="text-gray-600 text-sm">Realistic 3D covers sized proportionally.</p>
                </CardContent>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <Download className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-bold mb-2">Privacy by design</h3>
                  <p className="text-gray-600 text-sm">You control your data. Export anytime.</p>
                </CardContent>
              </Card>
            </div>

            {/* Extended feature bullets */}
            <div className="mt-16 bg-gray-50 rounded-2xl p-8">
              <ul className="grid md:grid-cols-2 gap-4">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>3D shelf view</strong> that respects real book dimensions — tall hardbacks look tall; slim paperbacks look slim.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Lightning-fast scanning</strong> with offline queue — capture even with patchy Wi-Fi.</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Edition-aware metadata</strong> (ISBN-10/13) and regional covers (e.g., amazon.com.au).</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Lists & tags</strong> for "To Read", "Lent to…", "Favourites", "Gift ideas".</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700"><strong>Data portability</strong> — CSV/JSON export. Your library, your rules.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>



        {/* Pricing */}
        <section id="pricing" className="py-20">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
              <p className="text-xl text-gray-600">All features available on both plans</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="p-8 border-2 border-gray-200">
                <CardContent className="p-0">
                  <h3 className="text-2xl font-bold mb-2">Free</h3>
                  <p className="text-gray-600 mb-6">Perfect for smaller libraries</p>
                  <div className="text-3xl font-bold mb-6">$0<span className="text-lg font-normal text-gray-500">/month</span></div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500" />
                      <span>Up to 100 books</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500" />
                      <span>Barcode scanning</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500" />
                      <span>3D book visualization</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500" />
                      <span>All organizational features</span>
                    </li>
                  </ul>
                  <Button variant="outline" className="w-full" data-testid="button-free-plan">Get started</Button>
                </CardContent>
              </Card>

              <Card className="p-8 border-2 border-orange-500 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold">For Large Libraries</span>
                </div>
                <CardContent className="p-0">
                  <h3 className="text-2xl font-bold mb-2">Pro</h3>
                  <p className="text-gray-600 mb-6">For serious book collectors</p>
                  <div className="text-3xl font-bold mb-6">$17<span className="text-lg font-normal text-gray-500">/year</span></div>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500" />
                      <span>Unlimited books</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500" />
                      <span>Barcode scanning</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500" />
                      <span>3D book visualization</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500" />
                      <span>All organizational features</span>
                    </li>
                  </ul>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600" data-testid="button-pro-plan">Upgrade to Pro</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>



        {/* Privacy Promise */}
        <section id="privacy" className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Your data, your rules</h2>
            <p className="text-xl text-gray-600 mb-8">
              No dark patterns. No data resale. You can export or delete your data at any time.
            </p>
            <Button variant="outline" asChild>
              <a href="#" data-testid="link-privacy-policy">Read our privacy policy</a>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <ShelfieIcon size={24} />
                <span className="text-lg font-bold">Shelfie</span>
              </div>
              <p className="text-gray-400">
                The delightfully simple way to scan, organise, and love your books.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Roadmap</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Centre</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors" data-testid="link-terms">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors" data-testid="link-privacy">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors" data-testid="link-export">Data export</a></li>
                <li><a href="#" className="hover:text-white transition-colors" data-testid="link-contact">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">© 2025 Shelfie. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Twitter</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">Instagram</a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}