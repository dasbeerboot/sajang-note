import AuthButtons from '@/components/AuthButtons';

export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto bg-base-100 p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6">사장노트 로그인</h1>
        <p className="text-center mb-8">
          소셜 계정으로 간편하게 로그인하고 사장노트의 모든 기능을 이용해보세요.
        </p>
        <AuthButtons />
      </div>
    </div>
  );
} 