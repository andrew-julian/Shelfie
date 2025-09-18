import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export type ScannerType = 'scanbot' | 'strich';

export function useScannerPreference() {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['/api/user/preferences'],
  });

  const updatePreferenceMutation = useMutation({
    mutationFn: async (scannerType: ScannerType) => {
      const response = await apiRequest('PATCH', '/api/user/preferences', { scannerType });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
    },
    onError: (error) => {
      console.error('Failed to update scanner preference:', error);
      // You can add a toast here if needed
    },
  });

  const scannerType: ScannerType = (preferences as any)?.scannerType || 'scanbot';

  return {
    scannerType,
    isLoading,
    updateScannerType: updatePreferenceMutation.mutate,
    isUpdating: updatePreferenceMutation.isPending,
  };
}