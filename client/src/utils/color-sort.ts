// Color analysis for aesthetic book sorting
// This looks at the overall image composition, not just edges

interface ColorProfile {
  averageLightness: number;
  dominantHue: number;
  colorfulness: number;
  warmth: number; // warm (reds/oranges) vs cool (blues/greens)
}

// Analyze overall image color profile for sorting
export async function analyzeImageColors(imageUrl: string): Promise<ColorProfile> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Use smaller canvas for performance
      const size = 64;
      canvas.width = size;
      canvas.height = size;
      
      if (!ctx) {
        resolve({ averageLightness: 50, dominantHue: 0, colorfulness: 50, warmth: 0 });
        return;
      }
      
      ctx.drawImage(img, 0, 0, size, size);
      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      
      let totalR = 0, totalG = 0, totalB = 0;
      let totalLightness = 0;
      let pixelCount = 0;
      
      const hueHistogram = new Array(12).fill(0); // 12 hue buckets (30 degrees each)
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const alpha = data[i + 3];
        
        // Skip transparent pixels
        if (alpha < 128) continue;
        
        totalR += r;
        totalG += g;
        totalB += b;
        pixelCount++;
        
        // Calculate HSL for this pixel
        const hsl = rgbToHsl(r, g, b);
        totalLightness += hsl.l;
        
        // Only count colorful pixels for hue (ignore near-grayscale)
        if (hsl.s > 20) {
          const hueIndex = Math.floor(hsl.h / 30) % 12;
          hueHistogram[hueIndex]++;
        }
      }
      
      if (pixelCount === 0) {
        resolve({ averageLightness: 50, dominantHue: 0, colorfulness: 50, warmth: 0 });
        return;
      }
      
      const avgR = totalR / pixelCount;
      const avgG = totalG / pixelCount;
      const avgB = totalB / pixelCount;
      const averageLightness = totalLightness / pixelCount;
      
      // Find dominant hue
      const maxHueIndex = hueHistogram.indexOf(Math.max(...hueHistogram));
      const dominantHue = maxHueIndex * 30;
      
      // Calculate colorfulness (how vivid vs grayscale)
      const avgHsl = rgbToHsl(avgR, avgG, avgB);
      const colorfulness = avgHsl.s;
      
      // Calculate warmth (warm colors vs cool colors)
      // Warm: reds, oranges, yellows (hue 0-60, 300-360)
      // Cool: greens, blues, purples (hue 120-240)
      let warmth = 0;
      if (dominantHue <= 60 || dominantHue >= 300) {
        warmth = 1; // warm
      } else if (dominantHue >= 120 && dominantHue <= 240) {
        warmth = -1; // cool
      }
      
      resolve({
        averageLightness,
        dominantHue,
        colorfulness,
        warmth
      });
    };
    
    img.onerror = () => {
      resolve({ averageLightness: 50, dominantHue: 0, colorfulness: 50, warmth: 0 });
    };
    
    img.src = imageUrl;
  });
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { 
    h: h * 360, 
    s: s * 100, 
    l: l * 100 
  };
}

// Sort books by overall visual appeal and color harmony
export function sortBooksByOverallColor(booksWithProfiles: Array<{ book: any; profile: ColorProfile }>): any[] {
  return booksWithProfiles
    .sort((a, b) => {
      const profileA = a.profile;
      const profileB = b.profile;
      
      // Primary sort: lightness groups (dark books together, light books together)
      const lightnessGroupA = Math.floor(profileA.averageLightness / 25); // 0-3 groups
      const lightnessGroupB = Math.floor(profileB.averageLightness / 25);
      
      if (lightnessGroupA !== lightnessGroupB) {
        return lightnessGroupA - lightnessGroupB; // dark to light
      }
      
      // Secondary sort: warmth (warm colors together, cool colors together)
      if (profileA.warmth !== profileB.warmth) {
        return profileB.warmth - profileA.warmth; // warm first, then neutral, then cool
      }
      
      // Tertiary sort: hue progression within warm/cool groups
      const hueDistanceA = Math.abs(profileA.dominantHue - 0); // distance from red
      const hueDistanceB = Math.abs(profileB.dominantHue - 0);
      
      if (Math.abs(hueDistanceA - hueDistanceB) > 30) {
        return hueDistanceA - hueDistanceB;
      }
      
      // Final sort: colorfulness (vivid before muted within same hue)
      return profileB.colorfulness - profileA.colorfulness;
    })
    .map(item => item.book);
}