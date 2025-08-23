import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

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
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [hasCheckedMilestone, setHasCheckedMilestone] = useState(false);

  // Fetch user details
  const { data: userDetails, isLoading } = useQuery<UserDetails>({
    queryKey: ["/api/user/details"],
    refetchInterval: 5000, // Check every 5 seconds for testing
    staleTime: 0, // Always refetch to ensure accuracy
  });

  useEffect(() => {
    if (isLoading || !userDetails) return;

    const bookCount = userDetails.bookCount || 0;
    const isSubscribed = userDetails.subscriptionStatus === 'active';
    
    console.log('Subscription check:', { bookCount, isSubscribed, hasCheckedMilestone, userDetails });
    
    // Show milestone modal if user has 100+ books but no active subscription
    if (bookCount >= 100 && !isSubscribed && !hasCheckedMilestone) {
      console.log('Triggering milestone modal!');
      setShowMilestoneModal(true);
      setHasCheckedMilestone(true);
    }
  }, [userDetails, isLoading, hasCheckedMilestone]);

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