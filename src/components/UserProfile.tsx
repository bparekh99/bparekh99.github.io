
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { LogOut } from 'lucide-react';

const UserProfile = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Sign Out Failed",
        description: "There was an error signing out. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-3 mb-6 p-4 bg-white rounded-lg border border-slate-200">
      <Avatar className="w-10 h-10">
        <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || user.email} />
        <AvatarFallback>
          {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="font-medium text-slate-800">
          {user.user_metadata?.full_name || user.email}
        </p>
        <p className="text-sm text-slate-500">{user.email}</p>
      </div>
      <Button 
        onClick={handleSignOut}
        variant="outline"
        size="sm"
        className="text-slate-600 hover:text-slate-800"
      >
        <LogOut className="w-4 h-4 mr-1" />
        Sign Out
      </Button>
    </div>
  );
};

export default UserProfile;
