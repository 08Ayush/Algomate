import { PageLoader } from '@/components/ui/PageLoader';

export default function Loading() {
  return <PageLoader message="Loading Admin Panel" subMessage="Fetching college and department data..." />;
}
