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
    Quagga: any;
  }
}

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScannerModal({ isOpen, onClose }: ScannerModalProps) {
  const [manualIsbn, setManualIsbn] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);
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

  const startScanner = () => {
    if (!videoRef.current || !window.Quagga) {
      toast({
        title: "Scanner Error",
        description: "Camera scanner is not available. Please enter ISBN manually.",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);

    window.Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: videoRef.current,
        constraints: {
          width: 640,
          height: 480,
          facingMode: "environment"
        },
      },
      decoder: {
        readers: ["ean_reader", "ean_8_reader", "code_128_reader"]
      },
    }, (err: any) => {
      if (err) {
        console.log(err);
        toast({
          title: "Camera Error",
          description: "Could not access camera. Please enter ISBN manually.",
          variant: "destructive",
        });
        setIsScanning(false);
        return;
      }
      window.Quagga.start();
    });

    window.Quagga.onDetected((data: any) => {
      const isbn = data.codeResult.code;
      if (isbn && isbn.length >= 10) {
        window.Quagga.stop();
        setIsScanning(false);
        lookupMutation.mutate(isbn);
      }
    });
  };

  const stopScanner = () => {
    if (window.Quagga) {
      window.Quagga.stop();
    }
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
    if (isOpen) {
      // Load QuaggaJS dynamically
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/quagga@0.12.1/dist/quagga.min.js';
      script.onload = () => {
        // QuaggaJS loaded
      };
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    } else {
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
            <div ref={videoRef} className="w-full h-full" data-testid="camera-preview" />
            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button onClick={startScanner} className="bg-primary text-white" data-testid="button-start-scanner">
                  <Camera className="w-4 h-4 mr-2" />
                  Start Camera
                </Button>
              </div>
            )}
            {isScanning && (
              <>
                <div className="scanner-overlay absolute inset-0">
                  <div className="absolute inset-4 border-2 border-white border-opacity-30 rounded"></div>
                  <div className="scan-line"></div>
                </div>
                <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white text-sm px-2 py-1 rounded">
                  Position barcode in frame
                </div>
                <Button
                  onClick={stopScanner}
                  className="absolute top-4 right-4 bg-black bg-opacity-50 text-white"
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
