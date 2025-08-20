import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Camera, Search } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    ScanbotSDK: any;
  }
}

const LICENSE_KEY =
  "Tu3s2Bzp5RnZNZJmKHbry5Y32pUWdf" +
  "dumS5FCKm8gGFUDdS46kSS9L19WGtW" +
  "mLc7+TkeT6Vkj1U2R+sCZC7Mn7ySOz" +
  "WNKCWyJlM3O7cbiE3tpir7Aq94p7v2" +
  "bkyJEIZMCP62faX30EXS/VrJPirfWf" +
  "XOAdUtuXKGNb2tX/rWnUzngyE9MDFh" +
  "RAqmumfSgZJ7UA72vRGPVA9tLpOKR6" +
  "LxAa5it5RZSm8WsUgcxraRWxy+2VNW" +
  "FjPOBlOPfu8OdEZUV7hAuZOPj9paw8" +
  "JOKuvPT2ahcw9n8sca45J0muhtvb2H" +
  "cLbB1wfAcLRR9xR+82dT6U1uw87E/i" +
  "al9FO6NSPg7g==\nU2NhbmJvdFNESw" +
  "psb2NhbGhvc3R8dmFuYWhlaW0uY29t" +
  "LmF1CjE3NTYzMzkxOTkKODM4ODYwNw" +
  "o4\n";

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScannerModal({ isOpen, onClose }: ScannerModalProps) {
  const [manualIsbn, setManualIsbn] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const scanbotSDK = useRef<any>(null);
  const { toast } = useToast();

  const lookupMutation = useMutation({
    mutationFn: async (isbn: string) => {
      setIsLookingUp(true);
      const response = await fetch(`/api/books/lookup/${isbn}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to lookup book');
      }
      
      return response.json();
    },
    onSuccess: async (bookData) => {
      // Add book to library
      const addResponse = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookData),
      });
      
      if (addResponse.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/books'] });
        toast({
          title: "Success!",
          description: "Book added to your library",
        });
        handleClose();
      } else {
        const error = await addResponse.json();
        throw new Error(error.message || 'Failed to add book');
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsLookingUp(false);
    },
  });

  const startScanner = async () => {
    if (!window.ScanbotSDK || !isSDKLoaded) {
      toast({
        title: "Scanner Error",
        description: "Scanner SDK is not loaded. Please enter ISBN manually.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsScanning(true);
      
      // Create proper Scanbot SDK configuration
      const config = new window.ScanbotSDK.UI.Config.BarcodeScannerScreenConfiguration();
      
      // Configure barcode formats
      config.scannerConfiguration.barcodeFormats = [
        'EAN_8', 'EAN_13', 'UPC_A', 'UPC_E',
        'CODE_39', 'CODE_93', 'CODE_128',
        'ITF', 'RSS_14', 'RSS_EXPANDED'
      ];
      
      // Configure UI
      config.topBarConfiguration.title = 'Scan Book Barcode';
      config.userGuidanceConfiguration.title = 'Position barcode in the frame';
      config.userGuidanceConfiguration.background.fillColor = '#000000CC';
      
      // Create and present the scanner
      const result = await window.ScanbotSDK.UI.createBarcodeScanner(config);
      
      setIsScanning(false);
      
      if (result && result.items && result.items.length > 0) {
        const scannedCode = result.items[0].barcode.text;
        if (scannedCode && scannedCode.length >= 10) {
          lookupMutation.mutate(scannedCode);
        } else {
          toast({
            title: "Invalid Barcode",
            description: "Please scan a valid ISBN barcode (10-13 digits).",
            variant: "destructive",
          });
        }
      } else {
        // User cancelled or no barcode found
        console.log('Scanner cancelled or no barcode detected');
      }
    } catch (error) {
      console.error('Scanbot scanning error:', error);
      setIsScanning(false);
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please enter ISBN manually.",
        variant: "destructive",
      });
    }
  };

  const stopScanner = () => {
    // Scanbot SDK handles scanner lifecycle automatically
    // No need to manually dispose when using UI components
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanner();
    setManualIsbn("");
    onClose();
  };

  const handleManualLookup = () => {
    const isbn = manualIsbn.trim();
    if (isbn && (isbn.length === 10 || isbn.length === 13)) {
      lookupMutation.mutate(isbn);
    } else {
      toast({
        title: "Invalid ISBN",
        description: "Please enter a valid 10 or 13 digit ISBN",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isOpen && !isSDKLoaded) {
      const loadScanbotSDK = async () => {
        try {
          // Load Scanbot SDK dynamically
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/scanbot-web-sdk@7.2.0/bundle/ScanbotSDK.ui2.min.js';
          script.onload = async () => {
            try {
              // Initialize the SDK
              await window.ScanbotSDK.initialize({
                licenseKey: LICENSE_KEY,
                enginePath: 'https://cdn.jsdelivr.net/npm/scanbot-web-sdk@7.2.0/bundle/bin/complete/',
              });
              setIsSDKLoaded(true);
            } catch (error) {
              console.error('Failed to initialize Scanbot SDK:', error);
              toast({
                title: "Scanner Initialization Error",
                description: "Failed to initialize barcode scanner. Please enter ISBN manually.",
                variant: "destructive",
              });
            }
          };
          script.onerror = () => {
            console.error('Failed to load Scanbot SDK script');
            toast({
              title: "Scanner Load Error",
              description: "Failed to load barcode scanner. Please enter ISBN manually.",
              variant: "destructive",
            });
          };
          document.head.appendChild(script);
        } catch (error) {
          console.error('Error loading Scanbot SDK:', error);
        }
      };
      
      loadScanbotSDK();
    } else if (!isOpen) {
      stopScanner();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" data-testid="modal-scanner">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Scan Book Barcode</span>
            <Button variant="ghost" size="icon" onClick={handleClose} data-testid="button-close-scanner">
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Camera Preview */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
            <div 
              ref={scannerRef} 
              className="w-full h-full" 
              data-testid="camera-preview" 
            />
            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button 
                  onClick={startScanner} 
                  className="primary-button" 
                  disabled={!isSDKLoaded}
                  data-testid="button-start-scanner"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {isSDKLoaded ? 'Start Scanner' : 'Loading Scanner...'}
                </Button>
              </div>
            )}
            {isScanning && (
              <>
                <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white text-sm px-3 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-coral-red rounded-full animate-pulse"></div>
                    <span>Scanning for barcodes...</span>
                  </div>
                </div>
                <Button
                  onClick={stopScanner}
                  className="absolute top-4 right-4 bg-coral-red text-white hover:bg-red-600"
                  size="sm"
                  data-testid="button-stop-scanner"
                >
                  Stop
                </Button>
              </>
            )}
          </div>
          
          {/* Manual ISBN Input */}
          <div className="space-y-4">
            <div className="text-center text-gray-600 text-sm">
              Can't scan? Enter ISBN manually
            </div>
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Enter 10 or 13-digit ISBN"
                value={manualIsbn}
                onChange={(e) => setManualIsbn(e.target.value)}
                className="flex-1"
                data-testid="input-manual-isbn"
              />
              <Button 
                onClick={handleManualLookup}
                disabled={lookupMutation.isPending || isLookingUp}
                data-testid="button-lookup-isbn"
              >
                {(lookupMutation.isPending || isLookingUp) ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Loading State */}
        {(lookupMutation.isPending || isLookingUp) && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full mx-4 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Looking up book...</h3>
              <p className="text-gray-600 text-sm">Fetching book details from Rainforest API</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
