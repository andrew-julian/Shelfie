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
    setIsInitializing(true);
    setError(null);
    setPermissionDenied(false);

    try {
      if (!scannerRef.current) {
        throw new Error('Scanner container element not found');
      }

      // Initialize STRICH SDK with environment-based license key
      const licenseKey = getStrichLicenseKey();

      await StrichSDK.initialize(licenseKey);
      
      // Try to use HTML5 audio implementation which may behave differently with silent mode
      // than Web Audio API - similar to how YouTube videos work
      try {
        StrichSDK.setAudioImpl('html5');
        console.log('🔊 STRICH: Using HTML5 audio implementation for potential silent mode bypass');
      } catch (error) {
        console.log('🔊 STRICH: HTML5 audio implementation not available, using default');
      }

      // Create scanner configuration - STRICH needs selector but also support element  
      const config = {
        selector: '#strich-scanner-container', // Required by TypeScript interface
        element: scannerRef.current, // Actual element reference for reliable targeting
        engine: {
          // Look for common barcode types found on books  
          symbologies: ['ean13', 'ean8', 'code128', 'upca', 'upce'] as any,
          duplicateInterval: 2500,
        },
        feedback: {
          audio: {
            enabled: true  // Enable built-in STRICH beep sound on successful scan
          }
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
          
          // Provide multiple types of feedback for successful scan
          
          // 1. Vibration feedback (if supported)
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]); // Short double vibration pattern
          }
          
          // 2. Enhanced visual flash feedback with checkmark
          const flashDiv = document.createElement('div');
          flashDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(34, 197, 94, 0.7);
            z-index: 9999;
            pointer-events: none;
            animation: scanFlash 0.5s ease-out;
            box-shadow: inset 0 0 100px rgba(34, 197, 94, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
          `;
          
          // Add big checkmark emoji in the center
          const checkmark = document.createElement('div');
          checkmark.textContent = '✅';
          checkmark.style.cssText = `
            font-size: 120px;
            animation: checkmarkBounce 0.5s ease-out;
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
          `;
          flashDiv.appendChild(checkmark);
          
          // Add enhanced flash animation if not already added
          if (!document.querySelector('#scan-flash-style')) {
            const style = document.createElement('style');
            style.id = 'scan-flash-style';
            style.textContent = `
              @keyframes scanFlash {
                0% { 
                  opacity: 0; 
                  transform: scale(0.8);
                  filter: brightness(1);
                }
                30% { 
                  opacity: 0.9; 
                  transform: scale(1.02);
                  filter: brightness(1.3);
                }
                70% { 
                  opacity: 0.7; 
                  transform: scale(1);
                  filter: brightness(1.1);
                }
                100% { 
                  opacity: 0; 
                  transform: scale(0.98);
                  filter: brightness(1);
                }
              }
              
              @keyframes checkmarkBounce {
                0% { 
                  transform: scale(0) rotate(-10deg);
                  opacity: 0;
                }
                50% { 
                  transform: scale(1.3) rotate(5deg);
                  opacity: 1;
                }
                70% { 
                  transform: scale(1.1) rotate(-2deg);
                  opacity: 1;
                }
                100% { 
                  transform: scale(1) rotate(0deg);
                  opacity: 0.8;
                }
              }
            `;
            document.head.appendChild(style);
          }
          
          document.body.appendChild(flashDiv);
          setTimeout(() => {
            if (flashDiv.parentNode) {
              flashDiv.parentNode.removeChild(flashDiv);
            }
          }, 500);
          
          // 3. Enhanced toast notification
          toast({
            title: "✅ Barcode Scanned Successfully",
            description: `${cleanBarcode}`,
            duration: 2000,
          });
          
          onScan(cleanBarcode);
          // Keep scanner open for continuous scanning (like Scanbot)
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

          <div className="relative">
            {/* Always render scanner container for DOM element availability */}
            <div 
              id="strich-scanner-container"
              ref={scannerRef}
              className="relative w-full h-64 bg-black rounded-lg overflow-hidden"
              data-testid="strich-scanner-container"
            />
            
            {/* Loading overlay */}
            {isInitializing && (
              <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
                <div className="flex items-center space-x-3 text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  <span>Initializing scanner...</span>
                </div>
              </div>
            )}
            
            {!error && !isInitializing && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Position a barcode in the camera view to scan
                </p>
              </div>
            )}
          </div>
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