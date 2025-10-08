import { useRouter } from 'next/router';
import NextLink from 'next/link';
import React from 'react';

// Custom hook to replace useNavigate from React Router
export function useNavigate() {
  const router = useRouter();
  
  return (path: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      router.replace(path);
    } else {
      router.push(path);
    }
  };
}

// Custom hook to replace useParams from React Router
export function useParams<T = Record<string, string>>(): T {
  const router = useRouter();
  return router.query as T;
}

// Custom hook to replace useSearchParams from React Router
export function useSearchParams() {
  const router = useRouter();
  
  const searchParams = {
    get: (key: string) => {
      const value = router.query[key];
      return Array.isArray(value) ? value[0] : value;
    }
  };
  
  const setSearchParams = (params: Record<string, string>) => {
    router.push({
      pathname: router.pathname,
      query: { ...router.query, ...params }
    });
  };
  
  return [searchParams, setSearchParams];
}

// Custom hook to replace useLocation from React Router
export function useLocation() {
  const router = useRouter();
  
  return {
    pathname: router.pathname,
    search: router.asPath.includes('?') ? router.asPath.substring(router.asPath.indexOf('?')) : '',
    hash: router.asPath.includes('#') ? router.asPath.substring(router.asPath.indexOf('#')) : '',
    state: null
  };
}

// Wrapper component to handle React Router to Next.js Link transition
interface LinkProps extends React.HTMLAttributes<HTMLAnchorElement> {
  to?: string;
  href?: string;
  children: React.ReactNode;
}

export function Link({ to, href, children, className, onClick, ...props }: LinkProps) {
  const linkHref = href || to;
  
  if (!linkHref) {
    console.error('Link component requires either "to" or "href" prop');
    return <span className={className} {...props}>{children}</span>;
  }
  
  return (
    <NextLink href={linkHref} className={className} onClick={onClick} {...props}>
      {children}
    </NextLink>
  );
}

export default Link;