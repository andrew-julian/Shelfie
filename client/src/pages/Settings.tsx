import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, ArrowLeft, Save, User, Globe, DollarSign, Ruler, RefreshCw, Database } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { UserPreferences } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [amazonDomain, setAmazonDomain] = useState("amazon.com.au");
  const [currency, setCurrency] = useState("AUD");
  const [measurementUnit, setMeasurementUnit] = useState("metric");

  // Fetch user preferences
  const { data: preferences, isLoading } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
  });

  // Update form state when preferences load
  useEffect(() => {
    if (preferences) {
      setAmazonDomain(preferences.amazonDomain || "amazon.com.au");
      setCurrency(preferences.currency || "AUD");
      setMeasurementUnit(preferences.measurementUnit || "metric");
    }
  }, [preferences]);

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: { amazonDomain: string; currency: string; measurementUnit: string }) => {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update preferences");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      toast({
        title: "Success",
        description: "Your preferences have been updated",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Refresh all books mutation
  const refreshAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/books/refresh-all', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh books');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Show progress message if available
      if (data.inProgress) {
        toast({
          title: "Refresh in Progress",
          description: data.message || "Book refresh has been started. You'll see updates as they complete.",
        });
        return;
      }
      
      toast({
        title: "Success",
        description: data.message || "All books have been refreshed with latest data",
      });
      
      // Invalidate books cache to show updated data
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
    },
    onError: (error: Error) => {
      // Check if it's a rate limiting error
      if (error.message.includes('rate limit')) {
        toast({
          title: "Rate Limited",
          description: "Please wait a moment before refreshing again.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to refresh books. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch books count for the refresh section
  const { data: books = [] } = useQuery({
    queryKey: ['/api/books'],
  });

  const handleSave = () => {
    updatePreferencesMutation.mutate({
      amazonDomain,
      currency,
      measurementUnit,
    });
  };

  const regionOptions = [
    { value: "amazon.com.au", label: "Australia (amazon.com.au)" },
    { value: "amazon.com", label: "United States (amazon.com)" },
    { value: "amazon.co.uk", label: "United Kingdom (amazon.co.uk)" },
    { value: "amazon.ca", label: "Canada (amazon.ca)" },
    { value: "amazon.de", label: "Germany (amazon.de)" },
    { value: "amazon.fr", label: "France (amazon.fr)" },
    { value: "amazon.it", label: "Italy (amazon.it)" },
    { value: "amazon.es", label: "Spain (amazon.es)" },
    { value: "amazon.co.jp", label: "Japan (amazon.co.jp)" },
    { value: "amazon.in", label: "India (amazon.in)" },
  ];

  const currencyOptions = [
    { value: "AUD", label: "Australian Dollar (AUD)" },
    { value: "USD", label: "US Dollar (USD)" },
    { value: "GBP", label: "British Pound (GBP)" },
    { value: "CAD", label: "Canadian Dollar (CAD)" },
    { value: "EUR", label: "Euro (EUR)" },
    { value: "JPY", label: "Japanese Yen (JPY)" },
    { value: "INR", label: "Indian Rupee (INR)" },
  ];

  const measurementOptions = [
    { value: "metric", label: "Metric (cm, kg)" },
    { value: "imperial", label: "Imperial (inches, lbs)" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="mr-4" data-testid="button-back">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Library
                </Button>
              </Link>
              <BookOpen className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* User Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                {(user as any)?.profileImageUrl ? (
                  <img 
                    src={(user as any).profileImageUrl} 
                    alt="Profile" 
                    className="h-16 w-16 rounded-full object-cover"
                    data-testid="img-profile-settings"
                  />
                ) : (
                  <div className="h-16 w-16 bg-gray-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid="text-user-name">
                    {(user as any)?.firstName && (user as any)?.lastName ? `${(user as any).firstName} ${(user as any).lastName}` : (user as any)?.firstName || 'User'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300" data-testid="text-user-email">
                    {(user as any)?.email || 'No email available'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Library Management Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Library Management
              </CardTitle>
              <CardDescription>
                Manage your book collection and refresh metadata
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-blue-500" />
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white" data-testid="text-books-count-settings">
                      {books.length} books
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      in your library
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => refreshAllMutation.mutate()}
                  disabled={refreshAllMutation.isPending || books.length === 0}
                  className="flex items-center gap-2"
                  data-testid="button-refresh-all-settings"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshAllMutation.isPending ? 'animate-spin' : ''}`} />
                  {refreshAllMutation.isPending ? 'Refreshing...' : 'Refresh All'}
                </Button>
              </div>
              
              {books.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No books in your library yet. Start by scanning some books!
                </div>
              )}
              
              {books.length > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  This will update all book information with the latest data from Amazon. 
                  The process may take a few minutes for large libraries.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Regional Preferences Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Regional Preferences
              </CardTitle>
              <CardDescription>
                Choose your preferred Amazon marketplace for book information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="amazon-domain" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Amazon Region
                </label>
                <Select value={amazonDomain} onValueChange={setAmazonDomain}>
                  <SelectTrigger data-testid="select-amazon-domain">
                    <SelectValue placeholder="Select Amazon region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="currency" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Currency
                </label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger data-testid="select-currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="measurement" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Ruler className="h-4 w-4 inline mr-1" />
                  Measurement Unit
                </label>
                <Select value={measurementUnit} onValueChange={setMeasurementUnit}>
                  <SelectTrigger data-testid="select-measurement">
                    <SelectValue placeholder="Select measurement unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {measurementOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={updatePreferencesMutation.isPending || isLoading}
              data-testid="button-save-preferences"
            >
              <Save className="h-4 w-4 mr-2" />
              {updatePreferencesMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}