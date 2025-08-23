import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Crown, Check, ArrowLeft, BookOpen, Star, Zap } from "lucide-react";
import { Link } from "wouter";
import { loadStripe } from "@stripe/stripe-js";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.error('Missing VITE_STRIPE_PUBLIC_KEY environment variable');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function Subscription() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: userDetails } = useQuery({
    queryKey: ["/api/user/details"],
    enabled: !!user,
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/create-subscription");
      return response.json();
    },
    onSuccess: async (data) => {
      console.log('Subscription created successfully:', data);
      
      if (!data.sessionId) {
        toast({
          title: "Payment Error",
          description: "No checkout session was created. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        toast({
          title: "Payment Error",
          description: "Unable to load payment system. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('Redirecting to Stripe checkout with session:', data.sessionId);
      
      try {
        const { error } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });

        if (error) {
          console.error('Stripe redirect error:', error);
          toast({
            title: "Payment Error",
            description: error.message,
            variant: "destructive",
          });
        }
      } catch (redirectError) {
        console.error('Error during redirect:', redirectError);
        toast({
          title: "Payment Error", 
          description: "Failed to redirect to payment. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Subscription Error",
        description: error.message || "Failed to create subscription",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      await subscribeMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to continue</h1>
          <Button asChild>
            <a href="/api/login">Log In</a>
          </Button>
        </div>
      </div>
    );
  }

  const bookCount = userDetails?.bookCount || 0;
  const isSubscribed = userDetails?.subscriptionStatus === "active";

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Library
            </Link>
          </Button>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 rounded-full px-4 py-2 mb-6">
            <Crown className="w-5 h-5" />
            <span className="font-semibold">Shelfie Pro</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Unlock Your Library's Full Potential
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            You've built an impressive collection of <span className="font-bold text-orange-500">{bookCount} books</span>. 
            Keep the momentum going with unlimited scanning and organization.
          </p>
        </div>

        {/* Current Status */}
        {isSubscribed ? (
          <Card className="max-w-2xl mx-auto mb-12 border-2 border-green-200 bg-green-50">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-green-500 text-white px-4 py-2 rounded-full inline-flex items-center">
                  <Check className="w-4 h-4 mr-2" />
                  Active Subscription
                </div>
              </div>
              <CardTitle className="text-2xl text-green-800">You're all set!</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-green-700 mb-4">
                Your Shelfie Pro subscription is active. Continue building your library with unlimited books!
              </p>
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <Link href="/scan">Continue Scanning</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Pricing Card */
          <Card className="max-w-2xl mx-auto mb-12 border-2 border-orange-200 shadow-xl">
            <CardHeader className="text-center bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Crown className="w-8 h-8" />
                <CardTitle className="text-3xl">Shelfie Pro</CardTitle>
              </div>
              <div className="text-5xl font-bold mb-2">
                $17<span className="text-2xl font-normal opacity-80">/year</span>
              </div>
              <p className="text-orange-100">Less than $0.05 per day</p>
            </CardHeader>
            
            <CardContent className="p-8">
              <div className="space-y-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 rounded-full p-2">
                    <BookOpen className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Unlimited Books</h3>
                    <p className="text-gray-600">Add as many books as you want to your library</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 rounded-full p-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Rapid Barcode Scanning</h3>
                    <p className="text-gray-600">Lightning-fast scanning with our advanced camera technology</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 rounded-full p-2">
                    <Star className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">3D Visualization</h3>
                    <p className="text-gray-600">Beautiful, realistic book display with accurate proportions</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 rounded-full p-2">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">All Organizational Features</h3>
                    <p className="text-gray-600">Cover editing, metadata management, and smart sorting</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 text-center">
                  <span className="font-semibold">Free Forever</span> for your first 100 books • 
                  <span className="font-semibold"> Cancel anytime</span> • No hidden fees
                </p>
              </div>

              <Button 
                onClick={handleSubscribe}
                disabled={isLoading}
                size="lg"
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-lg py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02]"
                data-testid="button-subscribe"
              >
                {isLoading ? "Processing..." : "Subscribe to Shelfie Pro"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold mb-2">Why do I need to subscribe after 100 books?</h3>
              <p className="text-gray-600">
                Maintaining book metadata, cover images, and search functionality requires ongoing server costs. 
                The subscription helps us keep the service running smoothly while you build your massive library.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600">
                Absolutely! You can cancel your subscription at any time. Your library will remain accessible, 
                but you won't be able to add new books beyond the 100-book limit.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold mb-2">What happens to my existing books?</h3>
              <p className="text-gray-600">
                Your entire library stays exactly as it is. All your books, covers, and organization remain 
                permanently accessible whether you subscribe or not.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}