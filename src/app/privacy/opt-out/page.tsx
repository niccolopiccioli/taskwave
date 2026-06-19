import { Suspense } from 'react';
import PrivacyOptOutPage from './page-content';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PrivacyOptOutPage />
    </Suspense>
  );
}
