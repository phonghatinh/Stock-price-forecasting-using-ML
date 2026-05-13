import AnalysisPage from '@/components/analysis/AnalysisPage';

export const metadata = {
  title: 'Phân tích XAI — FiinQuant AI',
};

interface Props {
  params: { ticker: string };
}

export default function TickerAnalysisPage({ params }: Props) {
  return <AnalysisPage ticker={params.ticker.toUpperCase()} />;
}
