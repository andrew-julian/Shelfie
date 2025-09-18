import { useState, useRef, useEffect } from 'react';
import { BarcodeReader, StrichSDK } from '@pixelverse/strichjs-sdk';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Camera, X, RotateCcw } from 'lucide-react';

interface StrichScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function StrichScanner({ isOpen, onClose, onScan }: StrichScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const barcodeReaderRef = useRef<BarcodeReader | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      initializeScanner();
    } else {
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [isOpen]);

  // Function to get the appropriate STRICH license key based on environment
  const getStrichLicenseKey = (): string => {
    const hostname = window.location.hostname;
    const origin = window.location.origin;
    
    console.log('🔑 STRICH LICENSE DETECTION START');
    console.log('🔑 Hostname:', hostname);
    console.log('🔑 Origin:', origin);
    
    // Check for the exact Replit preview domain first (license key is bound to specific origin)
    if (hostname === '72b7e87f-cee3-46f6-8a9a-935ead819261-00-2pbuxyzxmmug2.riker.replit.dev') {
      console.log('🔑 STRICH: Using development license key for specific Replit preview');
      return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MmE5Yjk0Ni02ZTZmLTQ1MzItYThlMC00ZDZlN2U3MTVkMjgiLCJpc3MiOiJzdHJpY2guaW8iLCJhdWQiOlsiaHR0cHM6Ly83MmI3ZTg3Zi1jZWUzLTQ2ZjYtOGE5YS05MzVlYWQ4MTkyNjEtMDAtMnBidXh5enhtbXVnMi5yaWtlci5yZXBsaXQuZGV2LyJdLCJpYXQiOjE3NTgxNTYxOTksIm5iZiI6MTc1ODE1NjE5OSwiY2FwYWJpbGl0aWVzIjp7fSwidmVyc2lvbiI6MX0.neYkpAEWx9xOovvfxcEV5HZKbUGIeAIT41zx_4T_c_I";
    }
    
    // Check if we're on production shelfie.site domain - use environment variable
    if (hostname === 'www.shelfie.site' || hostname === 'shelfie.site') {
      console.log('🔑 STRICH: Using production license key from environment for shelfie.site');
      const productionKey = import.meta.env.VITE_STRICH_LICENSE_KEY;
      if (productionKey) {
        return productionKey;
      }
    }
    
    // For other Replit domains or localhost/development, try environment variable
    if (hostname.includes('replit.dev') || hostname === 'localhost') {
      console.log('🔑 STRICH: Using environment license key for development/other Replit domains');
      const envKey = import.meta.env.VITE_STRICH_LICENSE_KEY;
      if (envKey) {
        return envKey;
      }
    }
    
    // Final fallback: try environment variable for any other domain
    const envKey = import.meta.env.VITE_STRICH_LICENSE_KEY;
    if (envKey) {
      console.log('🔑 STRICH: Using license key from environment variable');
      return envKey;
    }
    
    // If no environment key is set, throw error
    throw new Error('STRICH license key not configured. Please set VITE_STRICH_LICENSE_KEY environment variable.');
  };

  const initializeScanner = async () => {
    if (!scannerRef.current) return;
    
    setIsInitializing(true);
    setError(null);
    setPermissionDenied(false);

    try {
      // Initialize STRICH SDK with environment-based license key
      const licenseKey = getStrichLicenseKey();

      await StrichSDK.initialize(licenseKey);

      // Create scanner configuration
      const config = {
        selector: '#strich-scanner-container',
        engine: {
          // Look for common barcode types found on books  
          symbologies: ['ean13', 'ean8', 'code128', 'upca', 'upce'] as any,
          duplicateInterval: 2500,
        },
        localization: {
          cameraPermissionDenied: 'Camera permission is required for barcode scanning',
          cameraUnavailable: 'Camera is not available on this device',
        }
      };

      // Create and initialize the barcode reader
      const reader = new BarcodeReader(config);
      const result = await reader.initialize();
      
      barcodeReaderRef.current = result;

      // Set up detection handler
      barcodeReaderRef.current.detected = (detections) => {
        if (detections && detections.length > 0) {
          const barcode = detections[0].data;
          console.log('STRICH detected barcode:', barcode);
          
          // Clean up the barcode (remove hyphens and extra spaces)
          const cleanBarcode = barcode.replace(/[-\s]/g, '').trim();
          
          toast({
            title: "Barcode Detected",
            description: `Scanned: ${cleanBarcode}`,
            duration: 2000,
          });
          
          onScan(cleanBarcode);
          handleClose();
        }
      };

      // Start scanning
      await barcodeReaderRef.current.start();
      setIsScanning(true);
      setIsInitializing(false);

    } catch (err: any) {
      console.error('STRICH initialization error:', err);
      setIsInitializing(false);
      
      if (err.message?.includes('permission') || err.message?.includes('Permission')) {
        setPermissionDenied(true);
        setError('Camera permission denied. Please allow camera access and try again.');
      } else {
        setError(`Scanner initialization failed: ${err.message || 'Unknown error'}`);
      }
      
      toast({
        variant: "destructive",
        title: "Scanner Error",
        description: err.message || "Failed to initialize scanner",
      });
    }
  };

  const cleanup = () => {
    if (barcodeReaderRef.current) {
      barcodeReaderRef.current.destroy();
      barcodeReaderRef.current = null;
    }
    setIsScanning(false);
    setIsInitializing(false);
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  const retryInitialization = () => {
    cleanup();
    setTimeout(() => {
      initializeScanner();
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Scan Barcode (STRICH)</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            data-testid="button-close-scanner"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Scanner Container */}
        <div className="p-4">
          {isInitializing && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Initializing scanner...
              </p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
              
              {permissionDenied && (
                <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Please allow camera access in your browser settings and try again.
                  </p>
                </div>
              )}

              <Button
                onClick={retryInitialization}
                variant="outline"
                className="gap-2"
                data-testid="button-retry-scanner"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          )}

          {!isInitializing && !error && (
            <div>
              <div 
                id="strich-scanner-container"
                ref={scannerRef}
                className="relative w-full h-64 bg-black rounded-lg overflow-hidden"
                data-testid="strich-scanner-container"
              />
              
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Position a barcode in the camera view to scan
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-gray-700 flex justify-end">
          <Button
            variant="outline"
            onClick={handleClose}
            data-testid="button-cancel-scan"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}