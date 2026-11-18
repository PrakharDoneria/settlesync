import { BottomNav } from '@/components/BottomNav';
import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-neo-white">
      <Dashboard />
      <BottomNav />
    </main>
  );
}
