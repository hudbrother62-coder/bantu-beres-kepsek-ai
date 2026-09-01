import Link from 'next/link';

export function Brand({ compact = false, href = '/' }: { compact?: boolean; href?: string }) {
  return (
    <Link className={compact ? 'brand brand--compact' : 'brand'} href={href} aria-label="Bantu Beres Kepsek AI">
      <span className="brand__mark" aria-hidden="true">
        <span>BB</span>
        <i />
      </span>
      <span className="brand__copy">
        <strong>Bantu Beres</strong>
        <small>Kepsek AI</small>
      </span>
    </Link>
  );
}
