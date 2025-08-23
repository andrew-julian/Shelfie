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
    refetchInterval: 30000, // Check every 30 seconds
  });

  useEffect(() => {
    if (isLoading || !userDetails || hasCheckedMilestone) return;

    const bookCount = userDetails.bookCount || 0;
    const isSubscribed = userDetails.subscriptionStatus === 'active';
    
    // Show milestone modal if user has 100+ books but no active subscription
    if (bookCount >= 100 && !isSubscribed) {
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