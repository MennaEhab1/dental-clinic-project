import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, Edit, Trash2, Stethoscope } from "lucide-react";
import { adminSpecialityService } from "@/services/api";
import { toast } from "@/hooks/use-toast";

interface Speciality {
  id: number;
  name: string;
  description: string;
}

export default function AdminSpecialities() {
  const [specialities, setSpecialities] = useState<Speciality[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpeciality, setEditingSpeciality] = useState<Speciality | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  useEffect(() => {
    fetchSpecialities();
  }, []);

  const fetchSpecialities = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("https://smart-teeth-care.runasp.net/api/AdminSpeciality", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      const data = await res.json();
      setSpecialities(data || []);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load specialities", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSpecialities = specialities.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (speciality?: Speciality) => {
    if (speciality) {
      setEditingSpeciality(speciality);
      setFormData({ name: speciality.name, description: speciality.description });
    } else {
      setEditingSpeciality(null);
      setFormData({ name: "", description: "" });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSpeciality(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token");
      if (editingSpeciality) {
        await fetch(`https://smart-teeth-care.runasp.net/api/AdminSpeciality/${editingSpeciality.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: editingSpeciality.id,
            name: formData.name.trim(),
            description: formData.description.trim(),
          }),
        });
        setSpecialities((prev) =>
          prev.map((s) =>
            s.id === editingSpeciality.id
              ? { ...s, name: formData.name.trim(), description: formData.description.trim() }
              : s
          )
        );
        toast({ title: "Success", description: "Speciality updated successfully" });
      } else {
        const res = await fetch("https://smart-teeth-care.runasp.net/api/AdminSpeciality", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: 0,
            name: formData.name.trim(),
            description: formData.description.trim(),
          }),
        });
        const newItem = await res.json();
        await fetchSpecialities();
        toast({ title: "Success", description: "Speciality added successfully" });
      }
      handleCloseDialog();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save speciality", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this speciality?")) return;
    try {
      await fetch(`https://smart-teeth-care.runasp.net/api/AdminSpeciality/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      setSpecialities((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Success", description: "Speciality deleted successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to delete speciality", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Speciality Management
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage dental specialities and their descriptions
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg border-0" onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" /> Add Speciality
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingSpeciality ? "Edit Speciality" : "Add New Speciality"}
                </DialogTitle>
                <DialogDescription>
                  {editingSpeciality
                    ? "Update the speciality information below."
                    : "Fill in the details to add a new speciality."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    placeholder="e.g. Orthodontics"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe this speciality..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    className="w-full gradient-bg border-0"
                    onClick={handleSave}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Speciality"}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search specialities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <LoadingCard />
        ) : filteredSpecialities.length === 0 ? (
          <Card>
            <CardContent className="pt-12 text-center pb-12">
              <p className="text-muted-foreground">No specialities found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filteredSpecialities.map((speciality, i) => (
              <motion.div
                key={speciality.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="hover:shadow-card transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded-xl gradient-bg shrink-0">
                        <Stethoscope className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">{speciality.name}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {speciality.description || "No description"}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenDialog(speciality)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(speciality.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}