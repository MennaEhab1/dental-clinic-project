import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingCard } from '@/components/common/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Filter, Package, Plus, Minus, Edit, AlertTriangle } from 'lucide-react';
import { pharmacyService } from '@/services/api';
import type { Medicine } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function AdminPharmacy() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editMedicine, setEditMedicine] = useState<Medicine | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [stockChange, setStockChange] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await pharmacyService.getAll();
        setMedicines(response.data);
      } catch (error) { console.error('Failed:', error); }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  const categories = [...new Set(medicines.map(m => m.category))];

  const filtered = medicines.filter(m => {
    const matchesSearch = `${m.name} ${m.genericName}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'all' || m.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const updateStock = (id: string, delta: number) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, stock: Math.max(0, m.stock + delta) } : m));
    toast({ title: 'Stock Updated' });
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) return <Badge className="bg-destructive/10 text-destructive">Out of Stock</Badge>;
    if (stock <= 20) return <Badge className="bg-warning/10 text-warning">Low Stock</Badge>;
    return <Badge className="bg-success/10 text-success">In Stock</Badge>;
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold text-foreground">Pharmacy Management</h1>
          <p className="text-muted-foreground text-sm">Manage medicines, stock levels, and availability</p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search medicines..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44"><Filter className="w-4 h-4 mr-2" /><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{medicines.length}</p>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-warning">{medicines.filter(m => m.stock > 0 && m.stock <= 20).length}</p>
            <p className="text-xs text-muted-foreground">Low Stock</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{medicines.filter(m => m.stock === 0).length}</p>
            <p className="text-xs text-muted-foreground">Out of Stock</p>
          </CardContent></Card>
        </div>

        {isLoading ? <LoadingCard /> : (
          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Medicine</th>
                    <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
                    <th className="pb-3 font-medium text-muted-foreground">Price</th>
                    <th className="pb-3 font-medium text-muted-foreground">Stock</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(med => (
                    <tr key={med.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3">
                        <div>
                          <p className="font-medium text-foreground">{med.name}</p>
                          <p className="text-xs text-muted-foreground">{med.genericName} • {med.manufacturer}</p>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground hidden md:table-cell">{med.category}</td>
                      <td className="py-3 text-foreground">${med.price.toFixed(2)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {med.stock <= 20 && med.stock > 0 && <AlertTriangle className="w-3.5 h-3.5 text-warning" />}
                          <span className="text-foreground font-medium">{med.stock}</span>
                          <span className="text-xs text-muted-foreground">{med.unit}</span>
                        </div>
                      </td>
                      <td className="py-3">{getStockBadge(med.stock)}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStock(med.id, -10)}><Minus className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStock(med.id, 10)}><Plus className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditMedicine(med); setStockChange(0); setEditOpen(true); }}><Edit className="w-3 h-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="font-display">Update Stock</DialogTitle></DialogHeader>
            {editMedicine && (
              <div className="space-y-4">
                <p className="font-medium text-foreground">{editMedicine.name}</p>
                <p className="text-sm text-muted-foreground">Current Stock: {editMedicine.stock} {editMedicine.unit}</p>
                <div className="space-y-2">
                  <Label>Adjust Stock By</Label>
                  <Input type="number" value={stockChange} onChange={e => setStockChange(Number(e.target.value))} placeholder="Enter amount (+/-)" />
                </div>
                <Button className="w-full gradient-bg border-0" onClick={() => { updateStock(editMedicine.id, stockChange); setEditOpen(false); }}>
                  Update Stock
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
