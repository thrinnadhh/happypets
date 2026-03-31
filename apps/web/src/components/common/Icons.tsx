export function HeartIcon({
  filled = false,
  className = "h-5 w-5",
}: {
  filled?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} className={className}>
      <path
        d="M12 20.5 4.5 13.4C2 10.9 2 6.9 4.5 4.4a4.6 4.6 0 0 1 6.5 0L12 5.4l1-1a4.6 4.6 0 0 1 6.5 0c2.5 2.5 2.5 6.5 0 9L12 20.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarIcon({ className = "h-4 w-4" }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="m12 2.4 2.8 5.7 6.3.9-4.5 4.4 1.1 6.2L12 16.6l-5.7 3 1.1-6.2L2.9 9l6.3-.9L12 2.4Z" />
    </svg>
  );
}

export function CartIcon({ className = "h-5 w-5" }: { className?: string }): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M3 4h2l2.1 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="19" r="1.4" fill="currentColor" />
      <circle cx="18" cy="19" r="1.4" fill="currentColor" />
    </svg>
  );
}
