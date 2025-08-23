import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SubscriptionSuccessModal } from "@/components/subscription-success-modal";
import { useAuth } from "@/hooks/useAuth";

export default function SubscriptionSuccess() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if we have session_id in URL params
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');

  // Fetch user details to check subscription status
  const { data: userDetails } = useQuery({
    queryKey: ["/api/user/details"],
    enabled: !!sessionId && !!user,
  });

  const handleSuccess = () => {
    // Invalidate user details to refresh subscription status everywhere
    queryClient.invalidateQueries({ queryKey: ["/api/user/details"] });
    // Redirect back to home
    setLocation("/");
  };

  // If no session_id, redirect to home
  useEffect(() => {
    if (!sessionId) {
      setLocation("/");
    }
  }, [sessionId, setLocation]);

  if (!sessionId || !user || !userDetails) {
    return null; // Loading or redirecting
  }

  return (
    <SubscriptionSuccessModal
      open={true}
      onClose={handleSuccess}
      bookCount={userDetails.bookCount || 0}
    />
  );
}