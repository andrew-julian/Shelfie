import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionCheck } from "@/hooks/useSubscriptionCheck";
import { SubscriptionMilestoneModal } from "@/components/subscription-milestone-modal";
import Home from "@/pages/home";
import ScanPage from "@/pages/scan";
import Landing from "@/pages/Landing";
import Settings from "@/pages/Settings";
import Billing from "@/pages/billing";
import Subscription from "@/pages/subscription";
import SubscriptionSuccess from "@/pages/subscription-success";
import RefreshProgress from "@/pages/refresh-progress";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const { 
    showMilestoneModal, 
    closeMilestoneModal, 
    bookCount 
  } = useSubscriptionCheck();

  return (
    <>
      <Switch>
        {isLoading || !isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            <Route path="/" component={Home} />
            <Route path="/scan" component={ScanPage} />
            <Route path="/settings" component={Settings} />
            <Route path="/billing" component={Billing} />
            <Route path="/subscription" component={Subscription} />
            <Route path="/subscription-success" component={SubscriptionSuccess} />
            <Route path="/refresh-progress" component={RefreshProgress} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
      
      {/* Global Subscription Milestone Modal */}
      {isAuthenticated && (
        <SubscriptionMilestoneModal 
          open={showMilestoneModal}
          onClose={closeMilestoneModal}
          bookCount={bookCount}
        />
      )}
    </>
  );
}

function App() {
  // Log deployment version for debugging
  useEffect(() => {
    console.log('🚀 DEPLOYMENT VERSION: v2025.01.25.18:00');
    console.log('🚀 Build timestamp:', new Date().toISOString());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        {/* Build timestamp indicator for debugging - make it very visible */}
        <div 
          className="fixed bottom-2 left-2 bg-red-500 text-white px-3 py-2 rounded-lg font-bold text-sm z-[9999] shadow-lg border-2 border-white"
          style={{ fontSize: '14px' }}
        >
          🚀 {new Date().toISOString().slice(0, 19).replace('T', ' ')}
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
