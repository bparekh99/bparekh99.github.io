
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Newspaper, Users, TrendingUp, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ArticleOutput {
  headline: string;
  article: string;
  excerpt: string;
  socialCaption: string;
}

const ArticleGenerator = () => {
  const [idea, setIdea] = useState('');
  const [articleType, setArticleType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<ArticleOutput | null>(null);
  const { toast } = useToast();

  const articleTypes = [
    {
      value: 'breaking-news',
      label: 'Breaking News',
      icon: <Newspaper className="w-4 h-4" />,
      description: 'Fake industry announcements, satirical trends, parody press releases'
    },
    {
      value: 'guest-relations',
      label: 'Guest Relations',
      icon: <Users className="w-4 h-4" />,
      description: 'Fictional complaints, satirical reviews, "overheard at the front desk"'
    },
    {
      value: 'industry-deep-dives',
      label: 'Industry Deep Dives',
      icon: <TrendingUp className="w-4 h-4" />,
      description: 'Fake investigations, satirical profiles, parody trend analyses'
    },
    {
      value: 'travel-tourism',
      label: 'Travel & Tourism',
      icon: <MapPin className="w-4 h-4" />,
      description: 'Fake destination guides, satirical advisories, parody announcements'
    }
  ];

  const checkContentAppropriate = (text: string): boolean => {
    const inappropriatePatterns = [
      /\b(fuck|shit|damn|hell|ass|bitch|bastard)\b/i,
      /\b(kill|murder|death|violence|harm|hurt)\b/i,
      /\b(illegal|drugs|cocaine|marijuana|heroin)\b/i,
      /\b(hate|racism|sexism|discrimination)\b/i,
      /\b(sexual|porn|explicit)\b/i
    ];
    
    return !inappropriatePatterns.some(pattern => pattern.test(text));
  };

  const generateArticle = async () => {
    if (idea.length < 100) {
      toast({
        title: "Idea too short",
        description: "Please enter at least 100 words for your article idea.",
        variant: "destructive"
      });
      return;
    }

    if (!articleType) {
      toast({
        title: "Select article type",
        description: "Please choose an article type before generating.",
        variant: "destructive"
      });
      return;
    }

    if (!checkContentAppropriate(idea)) {
      toast({
        title: "Inappropriate Content Detected",
        description: "Your content contains inappropriate language or themes that are not suitable for a public satirical publication. Please revise your idea to avoid profanity, violence, illegal activities, or discriminatory content.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-article', {
        body: {
          idea: idea,
          articleType: articleType
        }
      });

      if (error) {
        throw error;
      }

      if (data && data.headline && data.article && data.excerpt && data.socialCaption) {
        setOutput(data);
        toast({
          title: "Article Generated!",
          description: "Your satirical hospitality article is ready.",
        });
      } else {
        throw new Error('Invalid response format from AI');
      }
    } catch (error) {
      console.error('Error generating article:', error);
      toast({
        title: "Generation Failed",
        description: "There was an error generating your article. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const wordCount = idea.trim().split(/\s+/).filter(word => word.length > 0).length;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-slate-800">Hospitality FN Article Generator</h1>
        <p className="text-lg text-slate-600">Transform your ideas into satirical hospitality industry content</p>
      </div>

      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="w-5 h-5" />
            Article Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Your Article Idea (minimum 100 words)
            </label>
            <Textarea
              placeholder="Enter your satirical idea for the hospitality industry. Be creative but keep it appropriate for a public humor publication..."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-500">
                Word count: {wordCount}
              </p>
              {wordCount < 100 && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  {100 - wordCount} words needed
                </Badge>
              )}
              {wordCount >= 100 && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Ready to generate
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Article Type
            </label>
            <Select value={articleType} onValueChange={setArticleType}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your article category" />
              </SelectTrigger>
              <SelectContent>
                {articleTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      {type.icon}
                      <div>
                        <p className="font-medium">{type.label}</p>
                        <p className="text-xs text-slate-500">{type.description}</p>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={generateArticle}
            disabled={isGenerating || wordCount < 100 || !articleType}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {isGenerating ? 'Generating Article...' : 'Generate Satirical Article'}
          </Button>
        </CardContent>
      </Card>

      {output && (
        <div className="space-y-6">
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-800">Generated Article</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Headline</h3>
                <p className="text-xl font-bold text-slate-800 p-3 bg-white rounded border">
                  {output.headline}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Article ({output.article.split(' ').length} words)</h3>
                <div className="bg-white p-4 rounded border max-h-96 overflow-y-auto">
                  {output.article.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="mb-4 text-slate-700 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Excerpt (50 words)</h3>
                <p className="bg-white p-3 rounded border text-slate-700 italic">
                  {output.excerpt}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-700 mb-2">Social Media Caption</h3>
                <p className="bg-white p-3 rounded border text-slate-700">
                  {output.socialCaption}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border border-slate-200 bg-slate-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-slate-600">
              <p className="font-medium mb-2">Content Guidelines:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Keep content satirical but professional</li>
                <li>No profanity, violence, illegal activities, or discriminatory content</li>
                <li>Avoid referencing real companies or people</li>
                <li>Focus on hospitality industry humor and satire</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArticleGenerator;
