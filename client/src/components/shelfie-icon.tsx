interface ShelfieIconProps {
  className?: string;
  size?: number;
}

export default function ShelfieIcon({ className = "", size = 24 }: ShelfieIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Shelfie logo - orange gradient"
    >
      <defs>
        <linearGradient id="grad-orange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFA43A"/>
          <stop offset="100%" stopColor="#FF6432"/>
        </linearGradient>
      </defs>
      {/* Rounded square background */}
      <rect x="0" y="0" width="1024" height="1024" rx="220" fill="url(#grad-orange)"/>
      {/* Shelf */}
      <rect x="162" y="720" width="700" height="70" rx="35" fill="#FFFFFF"/>
      {/* Books (left to right, bottoms aligned just above shelf) */}
      {/* Baseline for books: 696 (24px above shelf) */}
      <rect x="277" y="416" width="110" height="280" rx="20" fill="#FFFFFF"/>
      <rect x="457" y="296" width="110" height="400" rx="20" fill="#FFFFFF"/>
      <rect x="637" y="176" width="110" height="520" rx="20" fill="#FFFFFF"/>
    </svg>
  );
}