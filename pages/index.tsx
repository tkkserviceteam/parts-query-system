import { useState } from 'react';
import FrontPage from '@/components/FrontPage';
import AdminPage from '@/components/AdminPage';

export default function Home() {
  const [page, setPage] = useState<'front' | 'admin'>('front');

  return (
    <>
      {page === 'front' && <FrontPage onSwitchToAdmin={() => setPage('admin')} />}
      {page === 'admin' && <AdminPage onSwitchToFront={() => setPage('front')} />}
    </>
  );
}
