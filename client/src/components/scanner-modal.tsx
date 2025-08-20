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
  "Mpyhq9Yxr3GGf71QkTvpTbBG6PIXby" +
  "GOpm3xLZKbBoXQb0nzg7kFsrOj1p6j" +
  "62fXcgBHMXh4c8qGHH+b8enoC7C1Gz" +
  "aLjmDGkNnW5TrFcrxc/gSzGROlwx7M" +
  "UZBnTpsNKeFKTBbBDlC1EDcTG2xsMZ" +
  "KWHZD3SDINOsZBgnDLKpk2LtV8ChX5" +
  "lns/8kVnLNOkXE/TddX6zHIBc+iGH5" +
  "QrsR97c/WXMkAn5YdPaiPvKgdiwAp/" +
  "pszIOcrGRZDTkUUmGm4l4oWClQriue" +
  "AL0z/H7feafqbQ435IZcAwd6AIRhUc" +
  "IHDSpexl7qk+o1n7OuCD/ZuU9wPjQ2" +
  "GjtJ/k6+/XZQ==\nU2NhbmJvdFNESw" +
  "psb2NhbGhvc3R8Ym9va3NjYW4udmFu" +
  "YWhlaW0uY29tLmF1CjE3NTYzMzkxOT" +
  "kKODM4ODYwNwo4\n";

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
    if (!window.ScanbotSDK) {
      toast({
        title: "Scanner Error",
        description: "Scanner SDK is not loaded. Please enter ISBN manually.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsScanning(true);
      console.log('Starting Scanbot scanner...');
      
      // Create configuration using the simple approach
      const config = new window.ScanbotSDK.UI.Config.BarcodeScannerScreenConfiguration();
      
      console.log('Creating barcode scanner with config:', config);
      
      // Create and present the scanner
      const result = await window.ScanbotSDK.UI.createBarcodeScanner(config);
      
      setIsScanning(false);
      console.log('Scanner result:', result);
      
      if (result && result.items && result.items.length > 0) {
        const scannedCode = result.items[0].barcode.text;
        console.log('Scanned barcode:', scannedCode);
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
        console.log('Scanner cancelled or no barcode detected');
      }
    } catch (error) {
      console.error('Scanbot scanning error:', error);
      setIsScanning(false);
      toast({
        title: "Camera Error",
        description: `Could not access camera: ${error.message}. Please enter ISBN manually.`,
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
              console.log('Scanbot SDK script loaded, initializing...');
              // Initialize the SDK
              await window.ScanbotSDK.initialize({
                licenseKey: LICENSE_KEY,
                enginePath: 'https://cdn.jsdelivr.net/npm/scanbot-web-sdk@7.2.0/bundle/bin/complete/',
              });
              console.log('Scanbot SDK initialized successfully');
              setIsSDKLoaded(true);
            } catch (error) {
              console.error('Failed to initialize Scanbot SDK:', error);
              toast({
                title: "Scanner Initialization Error",
                description: `Failed to initialize barcode scanner: ${error.message}. Please enter ISBN manually.`,
                variant: "destructive",
              });
            }
          };
          script.onerror = (error) => {
            console.error('Failed to load Scanbot SDK script:', error);
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
                  disabled={!window.ScanbotSDK}
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
