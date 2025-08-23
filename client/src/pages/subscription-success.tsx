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

  // For testing: allow access without session_id if we're in development
  const isDevelopment = import.meta.env.DEV;
  
  // If no session_id and not in development, redirect to home
  useEffect(() => {
    if (!sessionId && !isDevelopment) {
      setLocation("/");
    }
  }, [sessionId, setLocation, isDevelopment]);

  if ((!sessionId && !isDevelopment) || !user || !userDetails) {
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