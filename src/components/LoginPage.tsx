
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Chrome } from 'lucide-react';

const LoginPage = () => {
  const { signInWithGoogle } = useAuth();
  const { toast } = useToast();

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: "There was an error signing in with Google. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <img 
              src="https://hospitalityfn.com/wp-content/uploads/2025/05/Screenshot-2025-05-21-at-12.33.28%E2%80%AFPM-768x297.png" 
              alt="Hospitality FN Logo" 
              className="h-12 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">
            Welcome to Article Generator
          </CardTitle>
          <p className="text-slate-600">
            Sign in to create satirical hospitality industry content
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleGoogleLogin}
            className="w-full bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            size="lg"
          >
            <Chrome className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>
          
          <div className="text-center text-sm text-slate-500 mt-4">
            By signing in, you agree to use our platform responsibly and follow our content guidelines.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
