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
            
            {/* Floating celebration elements */}
            <div className="absolute top-2 left-4 animate-bounce">
              <Star className="w-4 h-4 text-yellow-200" />
            </div>
            <div className="absolute top-3 right-6 animate-pulse">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-3">
                <div className="bg-white/20 rounded-full p-2 mr-3">
                  <Crown className="w-6 h-6 text-yellow-200" />
                </div>
                <div className="bg-white/20 text-white border border-white/30 text-sm px-3 py-1 rounded-full">
                  Library Milestone!
                </div>
              </div>
              
              <h1 className="text-xl sm:text-2xl font-bold mb-1">
                Amazing Achievement!
              </h1>
              <p className="text-lg opacity-90">
                <span className="font-bold">{bookCount} books</span> collected
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                You're a Serious Book Collector!
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Most people never reach 100 books. You've joined the top 5% of collectors.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="text-center p-3 bg-white rounded-lg shadow-sm border">
                <div className="text-xl font-bold text-orange-500">{bookCount}</div>
                <div className="text-xs text-gray-500">Books</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg shadow-sm border">
                <div className="text-xl font-bold text-blue-500">Top 5%</div>
                <div className="text-xs text-gray-500">Collectors</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg shadow-sm border">
                <div className="text-xl font-bold text-green-500">$17/yr</div>
                <div className="text-xs text-gray-500">Continue</div>
              </div>
            </div>

            {/* Benefits */}
            <div className="bg-white rounded-lg border p-4 mb-6">
              <h3 className="font-bold text-base mb-3">Keep Building Your Legacy</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                  <span>Add unlimited books</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>Rapid barcode scanning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>Beautiful 3D visualization</span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="text-center mb-6">
              <p className="text-gray-600 text-sm">
                Just <span className="font-bold text-orange-500">$0.05/day</span> • Less than one coffee per month
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handleSubscribe}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-all transform hover:scale-[1.02]"
                data-testid="button-subscribe-milestone"
              >
                {isLoading ? (
                  "Processing..."
                ) : (
                  <>
                    Continue Building Your Library
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
              
              <Button 
                variant="ghost"
                onClick={onClose}
                className="w-full text-gray-500 hover:text-gray-700 text-sm py-2"
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