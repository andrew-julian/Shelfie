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
      <DialogContent className="max-w-md w-[90vw] sm:max-w-lg p-0 overflow-hidden bg-gradient-to-br from-orange-50 via-white to-blue-50">
        <div className="relative">
          {/* Celebration Header */}
          <div className="bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-400 p-6 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            
            {/* Floating celebration elements - confetti style */}
            <div className="absolute top-2 left-4 animate-bounce">
              <div className="w-2 h-2 bg-yellow-200 rotate-45"></div>
            </div>
            <div className="absolute top-4 right-6 animate-pulse">
              <div className="w-1.5 h-1.5 bg-white rotate-12"></div>
            </div>
            <div className="absolute bottom-3 left-6 animate-bounce delay-300">
              <div className="w-1 h-1 bg-yellow-200 rounded-full"></div>
            </div>
            <div className="absolute top-6 left-1/3 animate-pulse delay-150">
              <div className="w-1.5 h-1.5 bg-white/80 rotate-45"></div>
            </div>
            
            <div className="relative z-10">
              {/* 100+ Club Badge */}
              <div className="inline-flex items-center justify-center bg-yellow-400 text-orange-800 rounded-full px-4 py-2 mb-4 font-bold text-sm border-2 border-yellow-300">
                <Trophy className="w-4 h-4 mr-2" />
                100+ CLUB
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                Welcome to<br />the 100+ Club ✨
              </h1>
              <p className="text-base opacity-95 leading-relaxed">
                Congratulations — you've joined the top 5%<br />of collectors with over {bookCount} books!
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6">
            {/* Transition Statement */}
            <div className="text-center mb-6">
              <p className="text-gray-800 text-base font-medium leading-relaxed">
                To keep growing your library beyond 100 books,<br />
                it's time to upgrade to unlimited.
              </p>
            </div>

            {/* Offer Section */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Unlock Unlimited — just $17/year
              </h2>
              <p className="text-gray-600 text-sm">
                Less than one coffee per month for unlimited books, forever.
              </p>
            </div>

            {/* Value Bullets */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-gray-700">
                <BookOpen className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <span className="text-sm font-medium">Add unlimited books to your library</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium">Rapid barcode scanning</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <div className="w-5 h-5 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium">Beautiful 3D visualisation</span>
              </div>
            </div>

            {/* Call-to-Action */}
            <div className="space-y-4">
              <Button 
                onClick={handleSubscribe}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] text-base"
                data-testid="button-subscribe-milestone"
              >
                {isLoading ? (
                  "Processing..."
                ) : (
                  <>
                    Upgrade Now — Unlock Unlimited Books
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </>
                )}
              </Button>
              
              <div className="text-center">
                <Button 
                  variant="ghost"
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 text-sm py-1 px-0 h-auto font-normal"
                  data-testid="button-maybe-later"
                >
                  Not now — I'll stop at {bookCount} books.
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}