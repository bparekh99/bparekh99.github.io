
import ArticleGenerator from '@/components/ArticleGenerator';
import ProtectedRoute from '@/components/ProtectedRoute';

const Index = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <ArticleGenerator />
      </div>
    </ProtectedRoute>
  );
};

export default Index;
