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
import Subscription from "@/pages/subscription";
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
            <Route path="/subscription" component={Subscription} />
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
