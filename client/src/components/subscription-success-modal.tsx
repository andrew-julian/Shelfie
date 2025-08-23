import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Crown, Star, Sparkles, Trophy, Check, BookOpen } from "lucide-react";

interface SubscriptionSuccessModalProps {
  open: boolean;
  onClose: () => void;
  bookCount: number;
}

export function SubscriptionSuccessModal({ 
  open, 
  onClose, 
  bookCount 
}: SubscriptionSuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-[95vw] sm:max-w-md sm:w-[90vw] lg:max-w-lg p-0 overflow-hidden bg-gradient-to-br from-green-50 via-white to-blue-50">
        <VisuallyHidden>
          <DialogTitle>Subscription Success - Welcome to Unlimited</DialogTitle>
          <DialogDescription>Your subscription is now active and you have unlimited access</DialogDescription>
        </VisuallyHidden>
        <div className="relative">
          {/* Success Header */}
          <div className="bg-gradient-to-r from-green-500 via-emerald-400 to-teal-400 p-4 sm:p-6 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            
            {/* Floating success elements */}
            <div className="absolute top-2 left-4 animate-bounce">
              <Star className="w-4 h-4 text-yellow-200" />
            </div>
            <div className="absolute top-4 right-6 animate-pulse">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="absolute bottom-3 left-6 animate-bounce delay-300">
              <Check className="w-4 h-4 text-white" />
            </div>
            <div className="absolute top-6 left-1/3 animate-pulse delay-150">
              <div className="w-1.5 h-1.5 bg-white/80 rotate-45"></div>
            </div>
            
            <div className="relative z-10">
              {/* Success Check */}
              <div className="inline-flex items-center justify-center bg-white text-green-600 rounded-full w-16 h-16 mb-4">
                <Check className="w-8 h-8" />
              </div>
              
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 leading-tight">
                Welcome to Unlimited!
              </h1>
              <p className="text-sm sm:text-base opacity-95 leading-relaxed px-2 sm:px-0">
                Payment successful — you're now part of the exclusive 100+ Club
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-4 sm:p-6">
            {/* Club Status */}
            <div className="text-center mb-5 sm:mb-6">
              <div className="inline-flex items-center justify-center bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full px-4 py-2 mb-4 font-bold text-sm">
                <Crown className="w-4 h-4 mr-2" />
                100+ CLUB MEMBER
              </div>
              
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 leading-tight">
                Your Library is Now Unlimited!
              </h2>
              <p className="text-gray-600 text-xs sm:text-sm px-2 sm:px-0">
                Start adding books beyond {bookCount} with no restrictions
              </p>
            </div>

            {/* Unlocked Features */}
            <div className="space-y-2.5 sm:space-y-3 mb-5 sm:mb-6">
              <div className="flex items-center gap-3 text-gray-700 bg-green-50 rounded-lg p-2.5 sm:p-3">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs sm:text-sm font-medium">Unlimited book additions — no limits</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 bg-green-50 rounded-lg p-2.5 sm:p-3">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs sm:text-sm font-medium">Rapid barcode scanning unlocked</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 bg-green-50 rounded-lg p-2.5 sm:p-3">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs sm:text-sm font-medium">Enhanced 3D library visualization</span>
              </div>
            </div>

            {/* Next Steps */}
            <div className="text-center mb-5 sm:mb-6">
              <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">
                Your subscription is active and ready to go!
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-center justify-center gap-2 text-blue-800 mb-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="font-semibold text-xs sm:text-sm">Ready to Add More Books?</span>
                </div>
                <p className="text-blue-700 text-xs leading-relaxed">
                  Use the scan button to quickly add your next batch of books with no restrictions
                </p>
              </div>
            </div>

            {/* Action Button */}
            <Button 
              onClick={onClose}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 sm:py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] text-sm sm:text-base"
              data-testid="button-start-unlimited"
            >
              Start Adding Unlimited Books
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}