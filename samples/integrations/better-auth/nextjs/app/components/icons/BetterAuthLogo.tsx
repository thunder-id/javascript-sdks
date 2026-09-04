export default function BetterAuthLogo({ size = 16, fill = 'currentColor' }: { size?: number; fill?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="6" fill={fill} />
      <path
        d="M7 17V7h5.2c2.1 0 3.4 1.1 3.4 2.9 0 1.2-.6 2-1.6 2.4 1.2.4 1.9 1.3 1.9 2.6 0 1.9-1.4 3.1-3.6 3.1H7Zm2.6-2.1h2.5c1 0 1.6-.5 1.6-1.3s-.6-1.3-1.6-1.3H9.6v2.6Zm0-4.5h2.2c.9 0 1.5-.5 1.5-1.2s-.6-1.2-1.5-1.2H9.6v2.4Z"
        fill="var(--color-card, #fff)"
      />
    </svg>
  )
}
