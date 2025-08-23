import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Star, Sparkles, Trophy, ArrowRight, BookOpen } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.error("Missing VITE_STRIPE_PUBLIC_KEY environment variable");
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface SubscriptionMilestoneModalProps {
  open: boolean;
  onClose: () => void;
  bookCount: number;
}

export function SubscriptionMilestoneModal({ 
  open, 
  onClose, 
  bookCount 
}: SubscriptionMilestoneModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/create-subscription");
      return response.json();
    },
    onSuccess: async (data) => {
      const stripe = await stripePromise;
      if (!stripe) {
        toast({
          title: "Payment Error",
          description: "Unable to load payment system. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (error) {
        toast({
          title: "Payment Error", 
          description: error.message,
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-gradient-to-br from-orange-50 via-white to-blue-50">
        <div className="relative">
          {/* Celebration Header */}
          <div className="bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-400 p-8 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            
            {/* Floating celebration elements */}
            <div className="absolute top-4 left-8 animate-bounce">
              <Star className="w-6 h-6 text-yellow-200" />
            </div>
            <div className="absolute top-6 right-12 animate-pulse">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="absolute bottom-4 left-12 animate-bounce delay-300">
              <Trophy className="w-7 h-7 text-yellow-200" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white/20 rounded-full p-3 mr-4">
                  <Crown className="w-8 h-8 text-yellow-200" />
                </div>
                <div className="bg-white/20 text-white border border-white/30 text-lg px-4 py-2 rounded-full">
                  Incredible Achievement!
                </div>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                You've Built Something Amazing!
              </h1>
              <p className="text-xl opacity-90">
                <span className="font-bold">{bookCount} books</span> in your digital library
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 rounded-full px-4 py-2 mb-4">
                <BookOpen className="w-5 h-5" />
                <span className="font-semibold">Library Milestone Reached</span>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                You're Officially a Serious Book Collector!
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Most people never reach 100 books. You've joined an elite group of dedicated readers who've built something truly impressive. Your library represents countless hours of curiosity, learning, and passion.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-orange-500">{bookCount}</div>
                <div className="text-sm text-gray-500">Books Collected</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-blue-500">Top 5%</div>
                <div className="text-sm text-gray-500">Of Collectors</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-green-500">$17/yr</div>
                <div className="text-sm text-gray-500">To Continue</div>
              </div>
            </div>

            {/* Why Continue */}
            <div className="bg-white rounded-lg border p-6 mb-8">
              <h3 className="font-bold text-lg mb-4">Keep Building Your Legacy</h3>
              <div className="space-y-3 text-gray-600">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Add unlimited books to your growing collection</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Keep the momentum going with rapid barcode scanning</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Your beautiful 3D library visualization awaits more books</span>
                </div>
              </div>
            </div>

            {/* Price Justification */}
            <div className="text-center mb-8">
              <p className="text-gray-600 mb-2">
                That's less than <span className="font-bold text-orange-500">$0.05 per day</span>
              </p>
              <p className="text-sm text-gray-500">
                Less than a single coffee per month for unlimited book cataloging
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handleSubscribe}
                disabled={isLoading}
                size="lg"
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-lg py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02]"
                data-testid="button-subscribe-milestone"
              >
                {isLoading ? (
                  "Processing..."
                ) : (
                  <>
                    Continue Building Your Library
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
              
              <Button 
                variant="ghost"
                onClick={onClose}
                className="w-full text-gray-500 hover:text-gray-700"
                data-testid="button-maybe-later"
              >
                Maybe later - I'll stop at {bookCount} books
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}