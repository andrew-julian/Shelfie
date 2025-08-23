interface ShelfieIconProps {
  className?: string;
  size?: number;
}

export default function ShelfieIcon({ className = "", size = 24 }: ShelfieIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bookshelf Structure */}
      <rect x="4" y="28" width="24" height="2" rx="1" fill="currentColor" />
      <rect x="4" y="20" width="24" height="2" rx="1" fill="currentColor" />
      <rect x="4" y="12" width="24" height="2" rx="1" fill="currentColor" />
      
      {/* Books on shelves */}
      {/* Top shelf books */}
      <rect x="6" y="14" width="3" height="6" rx="0.5" fill="#FF6B35" />
      <rect x="10" y="14" width="2.5" height="6" rx="0.5" fill="#4A90E2" />
      <rect x="13.5" y="14" width="3.5" height="6" rx="0.5" fill="#F39C12" />
      <rect x="18" y="14" width="2" height="6" rx="0.5" fill="#27AE60" />
      <rect x="21" y="14" width="3" height="6" rx="0.5" fill="#9B59B6" />
      <rect x="25" y="14" width="2" height="6" rx="0.5" fill="#E74C3C" />
      
      {/* Middle shelf books */}
      <rect x="6" y="22" width="2.5" height="6" rx="0.5" fill="#3498DB" />
      <rect x="9.5" y="22" width="3" height="6" rx="0.5" fill="#E67E22" />
      <rect x="13.5" y="22" width="2" height="6" rx="0.5" fill="#2ECC71" />
      <rect x="16.5" y="22" width="3.5" height="6" rx="0.5" fill="#8E44AD" />
      <rect x="21" y="22" width="2.5" height="6" rx="0.5" fill="#F1C40F" />
      <rect x="24.5" y="22" width="2.5" height="6" rx="0.5" fill="#E91E63" />
      
      {/* Top decorative element */}
      <circle cx="16" cy="6" r="3" fill="#FF6B35" opacity="0.8" />
      <circle cx="16" cy="6" r="1.5" fill="white" />
    </svg>
  );
}