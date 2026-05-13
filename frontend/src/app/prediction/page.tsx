import MarketPredictionPage from '@/components/analysis/MarketPredictionPage';

export const metadata = {
  title: 'Dự báo AI — FiinQuant',
  description: 'Dự báo giá cổ phiếu bằng AI với XAI explainability',
};

export default function PredictionRoute() {
  return <MarketPredictionPage />;
}
