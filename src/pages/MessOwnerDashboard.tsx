import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Plus, Users, TrendingUp, Edit, Trash2 } from 'lucide-react';

interface Mess {
  id: string;
  name: string;
  description: string;
  location: string;
}

interface Dish {
  id: string;
  name: string;
  price: number;
}

interface Stats {
  todayVisitors: number;
  totalVisitors: number;
}

const MessOwnerDashboard = () => {
  const [mess, setMess] = useState<Mess | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [stats, setStats] = useState<Stats>({ todayVisitors: 0, totalVisitors: 0 });
  const [loading, setLoading] = useState(true);
  const [dishDialogOpen, setDishDialogOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [dishForm, setDishForm] = useState({ name: '', price: '' });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchMessData();
    }
  }, [user]);

  const fetchMessData = async () => {
    if (!user) return;

    try {
      // Fetch mess data
      const { data: messData, error: messError } = await supabase
        .from('messes')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (messError && messError.code !== 'PGRST116') {
        throw messError;
      }

      if (messData) {
        setMess(messData);
        
        // Fetch dishes
        const { data: dishesData, error: dishesError } = await supabase
          .from('dishes')
          .select('*')
          .eq('mess_id', messData.id);

        if (dishesError) throw dishesError;
        setDishes(dishesData || []);

        // Fetch statistics
        await fetchStats(messData.id);
      }
    } catch (error) {
      console.error('Error fetching mess data:', error);
      toast({
        title: "Error",
        description: "Failed to load mess data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (messId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's visitors
      const { data: todayData, error: todayError } = await supabase
        .from('daily_visitors')
        .select('visitor_count')
        .eq('mess_id', messId)
        .eq('date', today)
        .single();

      if (todayError && todayError.code !== 'PGRST116') {
        throw todayError;
      }

      // Get total visitors
      const { data: totalData, error: totalError } = await supabase
        .from('daily_visitors')
        .select('visitor_count')
        .eq('mess_id', messId);

      if (totalError) throw totalError;

      const todayVisitors = todayData?.visitor_count || 0;
      const totalVisitors = totalData?.reduce((sum, record) => sum + record.visitor_count, 0) || 0;

      setStats({ todayVisitors, totalVisitors });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateMess = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messes')
        .insert({
          name: 'My Mess',
          description: 'A great place to eat',
          location: 'Campus',
          owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setMess(data);
      toast({
        title: "Success",
        description: "Mess created successfully!"
      });
    } catch (error) {
      console.error('Error creating mess:', error);
      toast({
        title: "Error",
        description: "Failed to create mess",
        variant: "destructive"
      });
    }
  };

  const handleSaveDish = async () => {
    if (!mess || !dishForm.name || !dishForm.price) return;

    try {
      const dishData = {
        name: dishForm.name,
        price: parseFloat(dishForm.price),
        mess_id: mess.id
      };

      if (editingDish) {
        const { error } = await supabase
          .from('dishes')
          .update(dishData)
          .eq('id', editingDish.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('dishes')
          .insert(dishData);

        if (error) throw error;
      }

      setDishDialogOpen(false);
      setEditingDish(null);
      setDishForm({ name: '', price: '' });
      fetchMessData();

      toast({
        title: "Success",
        description: `Dish ${editingDish ? 'updated' : 'added'} successfully!`
      });
    } catch (error) {
      console.error('Error saving dish:', error);
      toast({
        title: "Error",
        description: "Failed to save dish",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDish = async (dishId: string) => {
    try {
      const { error } = await supabase
        .from('dishes')
        .delete()
        .eq('id', dishId);

      if (error) throw error;

      fetchMessData();
      toast({
        title: "Success",
        description: "Dish deleted successfully!"
      });
    } catch (error) {
      console.error('Error deleting dish:', error);
      toast({
        title: "Error",
        description: "Failed to delete dish",
        variant: "destructive"
      });
    }
  };

  const openDishDialog = (dish?: Dish) => {
    if (dish) {
      setEditingDish(dish);
      setDishForm({ name: dish.name, price: dish.price.toString() });
    } else {
      setEditingDish(null);
      setDishForm({ name: '', price: '' });
    }
    setDishDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Users className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!mess) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Mess Found</h3>
          <p className="text-muted-foreground mb-4">
            You haven't created a mess yet. Create one to get started!
          </p>
          <Button onClick={handleCreateMess}>
            <Plus className="h-4 w-4 mr-2" />
            Create My Mess
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{mess.name} - Owner Dashboard</h1>
        <p className="text-muted-foreground">Manage your mess menu and track visitors</p>
      </header>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayVisitors}</div>
            <p className="text-xs text-muted-foreground">
              Students planning to visit today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisitors}</div>
            <p className="text-xs text-muted-foreground">
              All time visitor count
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Menu Management */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Today's Menu</CardTitle>
              <CardDescription>Add and manage your dishes</CardDescription>
            </div>
            <Dialog open={dishDialogOpen} onOpenChange={setDishDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDishDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Dish
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingDish ? 'Edit Dish' : 'Add New Dish'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingDish ? 'Update the dish details' : 'Add a new dish to your menu'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="dish-name">Dish Name</Label>
                    <Input
                      id="dish-name"
                      value={dishForm.name}
                      onChange={(e) => setDishForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter dish name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dish-price">Price (₹)</Label>
                    <Input
                      id="dish-price"
                      type="number"
                      value={dishForm.price}
                      onChange={(e) => setDishForm(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="Enter price"
                    />
                  </div>
                  <Button onClick={handleSaveDish} className="w-full">
                    {editingDish ? 'Update Dish' : 'Add Dish'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {dishes.length > 0 ? (
            <div className="space-y-3">
              {dishes.map((dish) => (
                <div key={dish.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{dish.name}</h4>
                    <Badge variant="secondary">₹{dish.price}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDishDialog(dish)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDish(dish.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center font-semibold">
                  <span>Total Menu Price:</span>
                  <Badge>₹{dishes.reduce((sum, dish) => sum + Number(dish.price), 0)}</Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No dishes added yet</p>
              <Button onClick={() => openDishDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Dish
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MessOwnerDashboard;