import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Search, MapPin, UtensilsCrossed } from 'lucide-react';

interface Mess {
  id: string;
  name: string;
  description: string;
  location: string;
  dishes: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}

const StudentDashboard = () => {
  const [messes, setMesses] = useState<Mess[]>([]);
  const [filteredMesses, setFilteredMesses] = useState<Mess[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [visitingMess, setVisitingMess] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchMesses();
  }, []);

  useEffect(() => {
    const filtered = messes.filter(mess =>
      mess.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMesses(filtered);
  }, [searchQuery, messes]);

  const fetchMesses = async () => {
    try {
      const { data: messesData, error: messesError } = await supabase
        .from('messes')
        .select(`
          id,
          name,
          description,
          location,
          dishes(id, name, price)
        `);

      if (messesError) throw messesError;

      setMesses(messesData || []);
      setFilteredMesses(messesData || []);
    } catch (error) {
      console.error('Error fetching messes:', error);
      toast({
        title: "Error",
        description: "Failed to load messes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVisitMess = async (messId: string) => {
    if (!user) return;

    setVisitingMess(messId);
    
    try {
      const { error } = await supabase
        .from('visits')
        .insert({
          student_id: user.id,
          mess_id: messId,
          date: new Date().toISOString().split('T')[0]
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Already Visited",
            description: "You've already marked this mess for today!",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Success",
          description: "Your visit has been recorded!"
        });
      }
    } catch (error) {
      console.error('Error recording visit:', error);
      toast({
        title: "Error",
        description: "Failed to record your visit",
        variant: "destructive"
      });
    } finally {
      setVisitingMess(null);
    }
  };

  const getTotalPrice = (dishes: Array<{ price: number }>) => {
    return dishes.reduce((total, dish) => total + Number(dish.price), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <UtensilsCrossed className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading messes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Student Dashboard</h1>
        <p className="text-muted-foreground">Find and visit your favorite mess</p>
      </header>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search mess by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button
          onClick={() => setSearchQuery('')}
          variant="outline"
          className="w-full sm:w-auto"
        >
          <MapPin className="h-4 w-4 mr-2" />
          Show All Nearby Messes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMesses.map((mess) => (
          <Card key={mess.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5" />
                {mess.name}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {mess.location || 'Location not specified'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {mess.description && (
                <p className="text-sm text-muted-foreground">{mess.description}</p>
              )}
              
              <div>
                <h4 className="font-semibold mb-2">Today's Menu:</h4>
                {mess.dishes.length > 0 ? (
                  <div className="space-y-2">
                    {mess.dishes.map((dish) => (
                      <div key={dish.id} className="flex justify-between items-center">
                        <span className="text-sm">{dish.name}</span>
                        <Badge variant="secondary">₹{dish.price}</Badge>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center font-semibold">
                        <span>Total:</span>
                        <Badge>₹{getTotalPrice(mess.dishes)}</Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No menu available today</p>
                )}
              </div>

              <Button
                onClick={() => handleVisitMess(mess.id)}
                className="w-full"
                disabled={visitingMess === mess.id}
              >
                {visitingMess === mess.id ? "Recording..." : "I'm Visiting"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMesses.length === 0 && (
        <div className="text-center py-12">
          <UtensilsCrossed className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No messes found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? 'Try a different search term' : 'No messes are available yet'}
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;