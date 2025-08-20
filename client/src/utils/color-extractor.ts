// Utility to extract dominant color from book cover images
export const extractDominantColor = async (imageUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Create canvas to sample image colors
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve('#2d3748'); // Fallback color
          return;
        }

        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0);
        
        // Sample pixels from all four edges to get consensus color
        const samples: number[] = [];
        const edgeThickness = Math.min(8, Math.min(img.width, img.height) * 0.05); // 5% of smallest dimension
        
        // Sample top edge
        for (let x = 0; x < img.width; x += 3) {
          for (let y = 0; y < edgeThickness; y += 2) {
            try {
              const pixel = ctx.getImageData(x, y, 1, 1).data;
              const r = pixel[0];
              const g = pixel[1];
              const b = pixel[2];
              const a = pixel[3];
              
              // Skip transparent pixels
              if (a < 128) continue;
              
              // Skip very light/white pixels (likely text or highlights)
              if (r > 240 && g > 240 && b > 240) continue;
              
              // Convert to single number for frequency counting
              samples.push((r << 16) | (g << 8) | b);
            } catch (e) {
              // Ignore sampling errors
            }
          }
        }
        
        // Sample bottom edge
        for (let x = 0; x < img.width; x += 3) {
          for (let y = img.height - edgeThickness; y < img.height; y += 2) {
            try {
              const pixel = ctx.getImageData(x, y, 1, 1).data;
              const r = pixel[0];
              const g = pixel[1];
              const b = pixel[2];
              const a = pixel[3];
              
              if (a < 128) continue;
              if (r > 240 && g > 240 && b > 240) continue;
              
              samples.push((r << 16) | (g << 8) | b);
            } catch (e) {
              // Ignore sampling errors
            }
          }
        }
        
        // Sample left edge
        for (let y = 0; y < img.height; y += 3) {
          for (let x = 0; x < edgeThickness; x += 2) {
            try {
              const pixel = ctx.getImageData(x, y, 1, 1).data;
              const r = pixel[0];
              const g = pixel[1];
              const b = pixel[2];
              const a = pixel[3];
              
              if (a < 128) continue;
              if (r > 240 && g > 240 && b > 240) continue;
              
              samples.push((r << 16) | (g << 8) | b);
            } catch (e) {
              // Ignore sampling errors
            }
          }
        }
        
        // Sample right edge
        for (let y = 0; y < img.height; y += 3) {
          for (let x = img.width - edgeThickness; x < img.width; x += 2) {
            try {
              const pixel = ctx.getImageData(x, y, 1, 1).data;
              const r = pixel[0];
              const g = pixel[1];
              const b = pixel[2];
              const a = pixel[3];
              
              if (a < 128) continue;
              if (r > 240 && g > 240 && b > 240) continue;
              
              samples.push((r << 16) | (g << 8) | b);
            } catch (e) {
              // Ignore sampling errors
            }
          }
        }
        
        if (samples.length === 0) {
          resolve('#2d3748'); // Fallback if no samples
          return;
        }
        
        // Find most frequent color
        const colorCounts: { [key: number]: number } = {};
        samples.forEach(color => {
          colorCounts[color] = (colorCounts[color] || 0) + 1;
        });
        
        // Get the most common color
        let dominantColor = 0;
        let maxCount = 0;
        
        Object.entries(colorCounts).forEach(([colorStr, count]) => {
          if (count > maxCount) {
            maxCount = count;
            dominantColor = parseInt(colorStr);
          }
        });
        
        // Convert back to RGB and darken slightly for back cover
        const r = Math.floor((dominantColor >> 16) * 0.8); // Darken by 20%
        const g = Math.floor(((dominantColor >> 8) & 255) * 0.8);
        const b = Math.floor((dominantColor & 255) * 0.8);
        
        resolve(`rgb(${r}, ${g}, ${b})`);
        
      } catch (error) {
        console.warn('Failed to extract color from image:', error);
        resolve('#2d3748'); // Fallback color
      }
    };
    
    img.onerror = () => {
      resolve('#2d3748'); // Fallback color
    };
    
    img.src = imageUrl;
  });
};

// Cache colors to avoid reprocessing the same image
const colorCache = new Map<string, string>();

export const getCachedDominantColor = async (imageUrl: string): Promise<string> => {
  if (colorCache.has(imageUrl)) {
    return colorCache.get(imageUrl)!;
  }
  
  const color = await extractDominantColor(imageUrl);
  colorCache.set(imageUrl, color);
  return color;
};