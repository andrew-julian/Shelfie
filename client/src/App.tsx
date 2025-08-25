import { Switch, Route } from "wouter";
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        {/* Deployment version indicator for debugging */}
        <div 
          className="fixed bottom-2 right-2 text-xs text-gray-400 bg-gray-900/80 px-2 py-1 rounded text-[10px] font-mono pointer-events-none z-50"
          style={{ fontSize: '10px' }}
        >
          v2025.01.25.17:52
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
