import { useState, useEffect } from "react";
import { Camera, Sparkles, Search, Check, ArrowRight, Lock, BookOpen, Zap, Eye, Database, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ShelfieIcon from "@/components/shelfie-icon";
import LiveDemoShelfRealistic from "@/components/live-demo-shelf-realistic";

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
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            <div className="flex items-center space-x-2">
              <ShelfieIcon size={24} className="md:w-7 md:h-7" />
              <span className="text-base md:text-lg font-bold text-gray-900">Shelfie</span>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#privacy" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Privacy</a>
            </nav>
            <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2">
              <a href="/api/login" data-testid="button-get-app">Start scanning now →</a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-orange-50 via-white to-blue-50">
          <div className="container mx-auto px-4 py-12 md:py-16 lg:py-24">
            <div className="max-w-4xl mx-auto">
              <div className="text-center space-y-6 md:space-y-8">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
                  From barcode to bookshelf in seconds.
                </h1>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto px-4 sm:px-0">
                  Turn every book into a beautifully organised digital library in seconds. Barcode scanning, rich metadata, and stunning 3D shelves — effortless, private, and always yours.
                </p>
                <div className="pt-4">
                  <Button 
                    size="lg" 
                    asChild
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 text-sm sm:text-base md:text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all"
                    onClick={() => handleAnalyticsEvent('click_cta_primary')}
                  >
                    <a href="/api/login" data-testid="button-primary-cta">
                      Start scanning now →
                    </a>
                  </Button>
                </div>
                <p className="text-sm md:text-base text-gray-500">Free for up to 100 books · No credit card required</p>
              </div>
              
              {/* Real 3D Books Display */}
              <div className="mt-12 md:mt-16 lg:mt-20">
                <LiveDemoShelfRealistic reducedMotion={reducedMotion} />
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 md:mb-6">How it works</h2>
                <p className="text-base sm:text-lg md:text-xl text-gray-600 px-4 sm:px-0">Three simple steps to build your digital library</p>
              </div>
              
              <div className="space-y-12 md:space-y-0 md:grid md:grid-cols-3 md:gap-12 lg:gap-16">
                <div className="text-center">
                  <div className="bg-orange-100 w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 md:mb-8">
                    <Camera className="w-8 h-8 md:w-10 md:h-10 text-orange-600" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">1. Scan</h3>
                  <p className="text-base md:text-lg text-gray-600 leading-relaxed">Point your camera at a book barcode.</p>
                </div>
                
                <div className="text-center">
                  <div className="bg-blue-100 w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 md:mb-8">
                    <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">2. Add</h3>
                  <p className="text-base md:text-lg text-gray-600 leading-relaxed">Instantly fetches metadata: title, author, edition, cover, dimensions.</p>
                </div>
                
                <div className="text-center">
                  <div className="bg-green-100 w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 md:mb-8">
                    <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-green-600" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">3. Enjoy</h3>
                  <p className="text-base md:text-lg text-gray-600 leading-relaxed">Browse and share your library in stunning 3D.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why People Love Shelfie */}
        <section id="features" className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 md:mb-6">Why People Love Shelfie</h2>
                <p className="text-base sm:text-lg md:text-xl text-gray-600 px-4 sm:px-0">Beautiful design meets powerful functionality</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
                <Card className="p-6 md:p-8 hover:shadow-lg transition-shadow rounded-2xl">
                  <CardContent className="p-0">
                    <div className="bg-orange-100 w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center mb-6">
                      <Zap className="w-7 h-7 md:w-8 md:h-8 text-orange-600" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Lightning-fast capture</h3>
                    <p className="text-gray-600 text-sm md:text-base leading-relaxed">Scan books instantly, even offline.</p>
                  </CardContent>
                </Card>

                <Card className="p-6 md:p-8 hover:shadow-lg transition-shadow rounded-2xl">
                  <CardContent className="p-0">
                    <div className="bg-blue-100 w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center mb-6">
                      <Eye className="w-7 h-7 md:w-8 md:h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Beautiful 3D shelves</h3>
                    <p className="text-gray-600 text-sm md:text-base leading-relaxed">Books appear as they are: tall hardbacks, slim paperbacks, everything in between.</p>
                  </CardContent>
                </Card>

                <Card className="p-6 md:p-8 hover:shadow-lg transition-shadow rounded-2xl">
                  <CardContent className="p-0">
                    <div className="bg-green-100 w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center mb-6">
                      <Database className="w-7 h-7 md:w-8 md:h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Rich metadata</h3>
                    <p className="text-gray-600 text-sm md:text-base leading-relaxed">Every scan fetches details automatically.</p>
                  </CardContent>
                </Card>

                <Card className="p-6 md:p-8 hover:shadow-lg transition-shadow rounded-2xl">
                  <CardContent className="p-0">
                    <div className="bg-purple-100 w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center mb-6">
                      <Shield className="w-7 h-7 md:w-8 md:h-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Portable & private</h3>
                    <p className="text-gray-600 text-sm md:text-base leading-relaxed">Your library, your rules. Export anytime.</p>
                  </CardContent>
                </Card>
              </div>

              {/* Features Checklist */}
              <div className="mt-16 md:mt-20 bg-gray-50 rounded-3xl p-8 md:p-12">
                <h3 className="text-xl md:text-2xl font-bold text-center mb-8 md:mb-12 text-gray-900">Everything you need for your personal library</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
                  <div className="flex items-start gap-4">
                    <Check className="w-5 h-5 md:w-6 md:h-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm md:text-base text-gray-700"><strong>Instant capture</strong> with cover art</span>
                  </div>
                  <div className="flex items-start gap-4">
                    <Check className="w-5 h-5 md:w-6 md:h-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm md:text-base text-gray-700"><strong>Proportional 3D visualisation</strong></span>
                  </div>
                  <div className="flex items-start gap-4">
                    <Check className="w-5 h-5 md:w-6 md:h-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm md:text-base text-gray-700"><strong>Regional covers & pricing</strong></span>
                  </div>
                  <div className="flex items-start gap-4">
                    <Check className="w-5 h-5 md:w-6 md:h-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm md:text-base text-gray-700"><strong>Offline scanning queue</strong></span>
                  </div>
                  <div className="flex items-start gap-4">
                    <Check className="w-5 h-5 md:w-6 md:h-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm md:text-base text-gray-700"><strong>Lists & tags</strong> for organisation</span>
                  </div>
                  <div className="flex items-start gap-4">
                    <Check className="w-5 h-5 md:w-6 md:h-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm md:text-base text-gray-700"><strong>Privacy by design</strong> (you control your data)</span>
                  </div>
                  <div className="flex items-start gap-4">
                    <Check className="w-5 h-5 md:w-6 md:h-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm md:text-base text-gray-700"><strong>Data portability</strong> (export anytime)</span>
                  </div>
                  <div className="flex items-start gap-4">
                    <Check className="w-5 h-5 md:w-6 md:h-6 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm md:text-base text-gray-700"><strong>Multi-device sync</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-16 md:py-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 md:mb-6">Simple, honest pricing</h2>
                <p className="text-base sm:text-lg md:text-xl text-gray-600 px-4 sm:px-0">Choose the plan that fits your collection</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                {/* Free Plan */}
                <Card className="p-8 md:p-10 border-2 border-gray-200 rounded-3xl">
                  <CardContent className="p-0">
                    <h3 className="text-2xl md:text-3xl font-bold mb-3">Free plan</h3>
                    <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-8">Perfect for smaller libraries</p>
                    <div className="text-3xl md:text-4xl font-bold mb-6 md:mb-8">$0<span className="text-lg md:text-xl font-normal text-gray-500">/month</span></div>
                    <ul className="space-y-4 mb-8 md:mb-10">
                      <li className="flex items-center gap-3">
                        <Check className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                        <span className="text-sm md:text-base">Up to 100 books</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                        <span className="text-sm md:text-base">Barcode scanning</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                        <span className="text-sm md:text-base">3D visualisation</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                        <span className="text-sm md:text-base">Organisational features</span>
                      </li>
                    </ul>
                    <Button variant="outline" className="w-full py-3 text-base" asChild data-testid="button-free-plan">
                      <a href="/api/login">Get started</a>
                    </Button>
                  </CardContent>
                </Card>

                {/* Pro Plan */}
                <Card className="p-8 md:p-10 border-2 border-orange-500 relative rounded-3xl">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold">Recommended</span>
                  </div>
                  <CardContent className="p-0">
                    <h3 className="text-2xl md:text-3xl font-bold mb-3">Unlimited plan</h3>
                    <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-8">Unlimited books, all features</p>
                    <div className="text-3xl md:text-4xl font-bold mb-2">$17<span className="text-lg md:text-xl font-normal text-gray-500">/year</span></div>
                    <p className="text-sm md:text-base text-gray-500 mb-6 md:mb-8 italic">A whole library, for less than the price of one paperback.</p>
                    <ul className="space-y-4 mb-8 md:mb-10">
                      <li className="flex items-center gap-3">
                        <Check className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                        <span className="text-sm md:text-base"><strong>Unlimited books</strong></span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                        <span className="text-sm md:text-base">All features</span>
                      </li>
                    </ul>
                    <Button className="w-full py-3 text-base bg-orange-500 hover:bg-orange-600" asChild data-testid="button-pro-plan">
                      <a href="/subscription">Upgrade to Unlimited →</a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Conversion Push */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-orange-50 via-white to-blue-50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 md:mb-8 px-4 sm:px-0">Build a library you'll actually use</h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-8 md:mb-12 leading-relaxed max-w-3xl mx-auto px-4 sm:px-0">
                A library that looks beautiful, feels intuitive, and makes every book easy to find. No ads, no clutter, just you and your books.
              </p>
              <Button 
                size="lg" 
                asChild
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 sm:px-8 md:px-10 lg:px-12 py-4 sm:py-5 md:py-6 text-base sm:text-lg md:text-xl font-semibold rounded-full shadow-lg hover:shadow-xl transition-all mb-6 text-center"
              >
                <a href="/api/login" data-testid="button-final-cta" className="block">
                  <span className="block sm:hidden">Start scanning now →</span>
                  <span className="hidden sm:block md:hidden">Start scanning and watch your library come alive →</span>
                  <span className="hidden md:block">Start scanning now and watch your library come alive →</span>
                </a>
              </Button>
              <p className="text-sm md:text-base text-gray-500">Free for up to 100 books • No credit card required</p>
            </div>
          </div>
        </section>

        {/* Privacy by Design */}
        <section id="privacy" className="py-16 md:py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 md:mb-6">Your books, your data.</h3>
              <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-8 leading-relaxed">
                No dark patterns. No data resale. Export or delete your library anytime.
              </p>
              <Button variant="outline" asChild className="px-6 py-3">
                <a href="#" data-testid="link-privacy-promise">Read our privacy promise →</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-3 mb-4 md:mb-6">
                <ShelfieIcon size={24} className="md:w-7 md:h-7" />
                <span className="text-lg md:text-xl font-bold">Shelfie</span>
              </div>
              <p className="text-sm md:text-base text-gray-400 leading-relaxed">
                The delightfully simple way to scan, organise, and love your books.
              </p>
            </div>
            
            <div>
              <h3 className="text-base font-semibold mb-4 md:mb-6">Product</h3>
              <ul className="space-y-2 md:space-y-3 text-gray-400">
                <li><a href="#features" className="text-sm hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">Roadmap</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-base font-semibold mb-4 md:mb-6">Support</h3>
              <ul className="space-y-2 md:space-y-3 text-gray-400">
                <li><a href="#" className="text-sm hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">Terms</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-base font-semibold mb-4 md:mb-6">Connect</h3>
              <ul className="space-y-2 md:space-y-3 text-gray-400">
                <li><a href="#" className="text-sm hover:text-white transition-colors">Twitter</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">Instagram</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-sm text-gray-400">© 2025 Shelfie. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}