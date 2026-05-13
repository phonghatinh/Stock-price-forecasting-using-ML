/* Dashboard page */
import MarketDashboard from '@/components/market/MarketDashboard';

export const metadata = {
  title: 'Dashboard — FiinQuant AI',
  description: 'Tổng quan thị trường chứng khoán Việt Nam real-time',
};

export default function DashboardPage() {
  return <MarketDashboard />;
}
