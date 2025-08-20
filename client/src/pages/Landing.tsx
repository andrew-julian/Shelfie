import { BookOpen, Scan, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="flex items-center justify-center mb-4">
            <BookOpen className="h-12 w-12 text-blue-600 mr-2" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">BookCatalog</h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Build and organize your personal book collection with barcode scanning and regional Amazon marketplace support
          </p>
        </header>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
              <Scan className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Barcode Scanning</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Easily add books to your collection by scanning their ISBN barcodes
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
              <Users className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Regional Support</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Get book information from your local Amazon marketplace for accurate pricing and availability
              </p>
            </div>
          </div>
          
          <div className="text-center">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
              <Star className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Smart Organization</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Track your reading status, organize by categories, and view detailed book information
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Get Started</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Sign in to start building your personal book collection
            </p>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              size="lg"
              className="w-full"
              data-testid="button-login"
            >
              Sign In to Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}