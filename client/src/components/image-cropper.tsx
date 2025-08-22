import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Crop, RotateCcw, Check, X } from "lucide-react";

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onCropComplete: (croppedImageData: string) => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ImageCropper({ isOpen, onClose, imageUrl, onCropComplete }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (isOpen && imageUrl) {
      setIsLoading(true);
      setImageLoaded(false);
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          
          // Set canvas size to fit the image while maintaining aspect ratio
          const maxWidth = 600;
          const maxHeight = 600;
          let { width, height } = img;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          setImageElement(img);
          
          // Initialize crop area to cover most of the image (remove potential edges)
          const margin = Math.min(width, height) * 0.05; // 5% margin
          setCropArea({
            x: margin,
            y: margin,
            width: width - (margin * 2),
            height: height - (margin * 2)
          });
          
          setImageLoaded(true);
          setIsLoading(false);
          drawCanvas();
        }
      };
      img.src = imageUrl;
    }
  }, [isOpen, imageUrl]);

  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [cropArea, imageLoaded]);

  const drawCanvas = () => {
    if (!canvasRef.current || !imageElement) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    
    // Draw overlay (darkened areas outside crop)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    
    // Top
    ctx.fillRect(0, 0, canvas.width, cropArea.y);
    // Bottom
    ctx.fillRect(0, cropArea.y + cropArea.height, canvas.width, canvas.height - (cropArea.y + cropArea.height));
    // Left
    ctx.fillRect(0, cropArea.y, cropArea.x, cropArea.height);
    // Right
    ctx.fillRect(cropArea.x + cropArea.width, cropArea.y, canvas.width - (cropArea.x + cropArea.width), cropArea.height);
    
    // Draw crop area border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
    
    // Draw corner handles
    const handleSize = 8;
    ctx.fillStyle = '#3b82f6';
    
    // Corner handles
    const corners = [
      { x: cropArea.x - handleSize/2, y: cropArea.y - handleSize/2 },
      { x: cropArea.x + cropArea.width - handleSize/2, y: cropArea.y - handleSize/2 },
      { x: cropArea.x - handleSize/2, y: cropArea.y + cropArea.height - handleSize/2 },
      { x: cropArea.x + cropArea.width - handleSize/2, y: cropArea.y + cropArea.height - handleSize/2 }
    ];
    
    corners.forEach(corner => {
      ctx.fillRect(corner.x, corner.y, handleSize, handleSize);
    });
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDragging(true);
    setDragStart(pos);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    
    const pos = getMousePos(e);
    const deltaX = pos.x - dragStart.x;
    const deltaY = pos.y - dragStart.y;
    
    // Update crop area (simple drag to resize from bottom-right)
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const newWidth = Math.max(50, Math.min(canvas.width - cropArea.x, cropArea.width + deltaX));
    const newHeight = Math.max(50, Math.min(canvas.height - cropArea.y, cropArea.height + deltaY));
    
    setCropArea(prev => ({
      ...prev,
      width: newWidth,
      height: newHeight
    }));
    
    setDragStart(pos);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetCrop = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const margin = Math.min(canvas.width, canvas.height) * 0.05;
    setCropArea({
      x: margin,
      y: margin,
      width: canvas.width - (margin * 2),
      height: canvas.height - (margin * 2)
    });
  };

  const applyCrop = () => {
    if (!canvasRef.current || !imageElement) return;
    
    const canvas = canvasRef.current;
    const img = imageElement;
    
    // Create a new canvas for the cropped image
    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) return;
    
    // Calculate the actual crop coordinates relative to the original image
    const scaleX = img.naturalWidth / canvas.width;
    const scaleY = img.naturalHeight / canvas.height;
    
    const actualCrop = {
      x: cropArea.x * scaleX,
      y: cropArea.y * scaleY,
      width: cropArea.width * scaleX,
      height: cropArea.height * scaleY
    };
    
    croppedCanvas.width = actualCrop.width;
    croppedCanvas.height = actualCrop.height;
    
    // Draw the cropped portion
    croppedCtx.drawImage(
      img,
      actualCrop.x, actualCrop.y, actualCrop.width, actualCrop.height,
      0, 0, actualCrop.width, actualCrop.height
    );
    
    // Convert to data URL
    const croppedImageData = croppedCanvas.toDataURL('image/jpeg', 0.95);
    onCropComplete(croppedImageData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" data-testid="dialog-crop-image">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-5 h-5" />
            Crop Book Cover
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-gray-500">Loading image...</div>
            </div>
          ) : (
            <>
              <div className="flex justify-center bg-gray-100 rounded-lg p-4">
                <canvas
                  ref={canvasRef}
                  className="border rounded cursor-crosshair max-w-full max-h-96"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  data-testid="canvas-crop-area"
                />
              </div>
              
              <div className="text-sm text-gray-600 text-center">
                Drag from the bottom-right corner to adjust the crop area. 
                The blue rectangle shows what will be kept.
              </div>
              
              <div className="flex justify-between">
                <Button
                  onClick={resetCrop}
                  variant="outline"
                  className="flex items-center gap-2"
                  data-testid="button-reset-crop"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex items-center gap-2"
                    data-testid="button-cancel-crop"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                  <Button
                    onClick={applyCrop}
                    className="bg-sky-blue hover:bg-sky-blue/90 text-white flex items-center gap-2"
                    data-testid="button-apply-crop"
                  >
                    <Check className="w-4 h-4" />
                    Apply Crop
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}