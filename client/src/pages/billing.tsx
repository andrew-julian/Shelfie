import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, Crown, Calendar, DollarSign, BookOpen, CheckCircle, XCircle, AlertCircle, TestTube, Trash2, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserDetails {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  bookCount?: number;
  subscriptionStatus?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Billing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user details with subscription info
  const { data: userDetails, isLoading } = useQuery<UserDetails>({
    queryKey: ["/api/user/details"],
  });

  // Test subscription activation mutation
  const testSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/test-subscription-success");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/details"] });
      toast({
        title: "Test Subscription Activated",
        description: "Your account has been upgraded to Pro for testing purposes.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to activate test subscription",
        variant: "destructive",
      });
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cancel-subscription");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/details"] });
      toast({
        title: "Subscription Canceled",
        description: "Your subscription has been canceled. You can still use your library.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  // Reset to free plan mutation (for testing)
  const resetToFreeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/reset-subscription");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/details"] });
      toast({
        title: "Reset to Free Plan",
        description: "Your account has been reset to the free plan for testing.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset subscription",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'past_due':
        return <Badge variant="destructive" className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertCircle className="w-3 h-3 mr-1" />Past Due</Badge>;
      case 'canceled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Canceled</Badge>;
      case 'free':
      default:
        return <Badge variant="secondary">Free Plan</Badge>;
    }
  };

  const isSubscribed = userDetails?.subscriptionStatus === 'active';
  const isOver100Books = (userDetails?.bookCount || 0) >= 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back-to-home">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
          </Link>
          
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="h-8 w-8 text-orange-500" />
            <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          </div>
          <p className="text-gray-600">Manage your Shelfie subscription and billing information</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crown className="h-6 w-6 text-orange-500" />
                    <div>
                      <CardTitle>Current Plan</CardTitle>
                      <CardDescription>Your current subscription status and details</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(userDetails?.subscriptionStatus)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <BookOpen className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{userDetails?.bookCount || 0}</div>
                    <div className="text-sm text-gray-600">Books in Library</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">
                      {isSubscribed ? '$17' : '$0'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {isSubscribed ? 'per year' : 'Free plan'}
                    </div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Calendar className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">
                      {isSubscribed ? '∞' : '100'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {isSubscribed ? 'Unlimited books' : 'Book limit'}
                    </div>
                  </div>
                </div>

                {isSubscribed && userDetails?.subscriptionExpiresAt && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Active Subscription</span>
                    </div>
                    <p className="text-green-700 mt-1">
                      Your subscription renews on {formatDate(userDetails.subscriptionExpiresAt)}
                    </p>
                  </div>
                )}

                {!isSubscribed && isOver100Books && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-orange-800">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Upgrade Available</span>
                    </div>
                    <p className="text-orange-700 mt-1">
                      You've reached {userDetails?.bookCount} books! Upgrade to unlimited for just $17/year.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Link href="/subscription">
                        <Button className="bg-orange-500 hover:bg-orange-600">
                          Upgrade Now
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => testSubscriptionMutation.mutate()}
                        disabled={testSubscriptionMutation.isPending}
                        className="text-xs"
                      >
                        <TestTube className="w-3 h-3 mr-1" />
                        Test Upgrade
                      </Button>
                    </div>
                  </div>
                )}

                {!isSubscribed && !isOver100Books && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-800">
                      <BookOpen className="h-5 w-5" />
                      <span className="font-medium">Free Plan</span>
                    </div>
                    <p className="text-blue-700 mt-1">
                      You can add up to 100 books for free. You have {100 - (userDetails?.bookCount || 0)} books remaining.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your account details and billing information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <div className="mt-1 text-gray-900">{userDetails?.email || 'Not provided'}</div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Name</label>
                      <div className="mt-1 text-gray-900">
                        {userDetails?.firstName && userDetails?.lastName 
                          ? `${userDetails.firstName} ${userDetails.lastName}`
                          : 'Not provided'
                        }
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Member Since</label>
                      <div className="mt-1 text-gray-900">
                        {userDetails?.createdAt ? formatDate(userDetails.createdAt) : 'Unknown'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Customer ID</label>
                      <div className="mt-1 text-gray-900 font-mono text-sm">
                        {userDetails?.stripeCustomerId || 'Not created'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Details */}
            {isSubscribed && (
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Details</CardTitle>
                  <CardDescription>Technical details about your active subscription</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Subscription ID</label>
                        <div className="mt-1 text-gray-900 font-mono text-sm">
                          {userDetails?.stripeSubscriptionId || 'Not available'}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Status</label>
                        <div className="mt-1">
                          {getStatusBadge(userDetails?.subscriptionStatus)}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Next Billing Date</label>
                        <div className="mt-1 text-gray-900">
                          {userDetails?.subscriptionExpiresAt 
                            ? formatDate(userDetails.subscriptionExpiresAt)
                            : 'Not available'
                          }
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Plan</label>
                        <div className="mt-1 text-gray-900">Shelfie Unlimited Annual ($17/year)</div>
                      </div>
                    </div>

                    {/* Subscription Management */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Manage Subscription</h4>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => cancelSubscriptionMutation.mutate()}
                          disabled={cancelSubscriptionMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Cancel Subscription
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => resetToFreeMutation.mutate()}
                          disabled={resetToFreeMutation.isPending}
                          className="text-xs"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Reset to Free (Test)
                        </Button>
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-2">
                        Canceling will end your subscription at the next billing cycle. Your library will remain accessible but you won't be able to add books beyond the 100-book limit.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Features Included */}
            <Card>
              <CardHeader>
                <CardTitle>Plan Features</CardTitle>
                <CardDescription>
                  {isSubscribed ? 'Features included in your Pro subscription' : 'Compare Free vs Pro features'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-700">Book limit</span>
                    <span className="font-medium text-gray-900">
                      {isSubscribed ? 'Unlimited' : '100 books'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-700">Barcode scanning</span>
                    <span className="font-medium text-gray-900">
                      {isSubscribed ? 'Unlimited rapid scanning' : 'Basic scanning'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-700">3D visualization</span>
                    <span className="font-medium text-gray-900">
                      {isSubscribed ? 'Enhanced 3D library' : 'Standard view'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-700">Book metadata</span>
                    <span className="font-medium text-gray-900">Full details & cover art</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-700">Cloud sync</span>
                    <span className="font-medium text-gray-900">Automatic backup</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}