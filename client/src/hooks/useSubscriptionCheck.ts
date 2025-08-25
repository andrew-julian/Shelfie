import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

interface UserDetails {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  bookCount?: number;
  subscriptionStatus?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export function useSubscriptionCheck() {
  const [location] = useLocation();
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [hasCheckedMilestone, setHasCheckedMilestone] = useState(false);

  // Fetch user details
  const { data: userDetails, isLoading } = useQuery<UserDetails>({
    queryKey: ["/api/user/details"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: true, // Only refetch when connection is restored
    // Only refetch manually when needed (e.g., after subscription changes)
  });

  useEffect(() => {
    if (isLoading || !userDetails) return;

    const bookCount = userDetails.bookCount || 0;
    const isSubscribed = userDetails.subscriptionStatus === 'active';
    
    // Don't show milestone modal on subscription success page
    const isOnSuccessPage = location === '/subscription-success';
    
    console.log('Subscription check:', { 
      bookCount, 
      isSubscribed, 
      hasCheckedMilestone, 
      isOnSuccessPage,
      location,
      subscriptionStatus: userDetails.subscriptionStatus 
    });
    
    // Show milestone modal if user has 100+ books but no active subscription
    // BUT NOT if they're on the success page (where success modal should show instead)
    if (bookCount >= 100 && !isSubscribed && !hasCheckedMilestone && !isOnSuccessPage) {
      console.log('Triggering milestone modal!');
      setShowMilestoneModal(true);
      setHasCheckedMilestone(true);
    }
  }, [userDetails, isLoading, hasCheckedMilestone, location]);

  const closeMilestoneModal = () => {
    setShowMilestoneModal(false);
  };

  const resetMilestoneCheck = () => {
    setHasCheckedMilestone(false);
  };

  return {
    showMilestoneModal,
    closeMilestoneModal,
    resetMilestoneCheck,
    userDetails,
    bookCount: userDetails?.bookCount || 0,
    isSubscribed: userDetails?.subscriptionStatus === 'active'
  };
}