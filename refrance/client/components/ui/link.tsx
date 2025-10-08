import NextLink from 'next/link';
import { ReactNode } from 'react';

interface LinkProps {
  to?: string;
  href?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Unified Link component that works with both Next.js routing patterns
 * Maps React Router's 'to' prop to Next.js 'href' prop for compatibility
 */
export function Link({ to, href, children, className, onClick, ...props }: LinkProps) {
  const destination = to || href || '/';
  
  return (
    <NextLink href={destination} className={className} onClick={onClick} {...props}>
      {children}
    </NextLink>
  );
}

export default Link;