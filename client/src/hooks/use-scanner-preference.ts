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
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scannerType }),
      });
      if (!response.ok) throw new Error('Failed to update preference');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
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