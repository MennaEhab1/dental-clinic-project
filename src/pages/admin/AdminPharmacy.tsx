//AdminPharmacy.tsx
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoadingCard } from "@/components/common/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  Filter,
  Package,
  Plus,
  Minus,
  Edit,
  Trash2,
  AlertTriangle,
  Building2,
  ArrowLeft,
  Phone,
  Mail,
  Clock,
  MapPin,
} from "lucide-react";
import {
  adminPharmacyService,
  adminPharmacyMedicineService,
  pharmacyService,
  type Pharmacy,
  type PharmacyMedicineItem,
} from "@/services/api";
import { toast } from "@/hooks/use-toast";
import type { Medicine } from "@/types";

import { PharmacyLocationPicker } from "@/components/pharmacy/PharmacyLocationPicker";

type PharmacyFormState = {
  name: string;
  address: string;
  phone: string;
  email: string;
  openingTime: string;
  closingTime: string;
  latitude: number | null;
  longitude: number | null;
};

type MedicineFormState = {
  medicineId: string;
  medicineName: string;
  price: number;
  stock: number;
  unit: string;
};

const emptyPharmacyForm: PharmacyFormState = {
  name: "",
  address: "",
  phone: "",
  email: "",
  openingTime: "",
  closingTime: "",
  latitude: null,
  longitude: null,
};

const emptyMedicineForm: MedicineFormState = {
  medicineId: "",
  medicineName: "",
  price: 0,
  stock: 0,
  unit: "box",
};

function normalizePositiveIntId(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d+$/.test(raw)) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "";
  }
  const trailingDigits = raw.match(/(\d+)$/);
  if (!trailingDigits) return "";
  const parsed = Number(trailingDigits[1]);
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "";
}

export default function AdminPharmacy() {
  const [view, setView] = useState<"pharmacies" | "medicines">("pharmacies");

  // Pharmacies
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [isLoadingPharmacies, setIsLoadingPharmacies] = useState(true);
  const [pharmacySearch, setPharmacySearch] = useState("");

  // Selected pharmacy + its medicines
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(
    null,
  );
  const [medicines, setMedicines] = useState<PharmacyMedicineItem[]>([]);
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(false);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Shared saving state (disables buttons during any write)
  const [isSaving, setIsSaving] = useState(false);

  // Pharmacy dialog
  const [pharmacyDialogOpen, setPharmacyDialogOpen] = useState(false);
  const [editingPharmacy, setEditingPharmacy] = useState<Pharmacy | null>(null);
  const [pharmacyForm, setPharmacyForm] =
    useState<PharmacyFormState>(emptyPharmacyForm);

  // Medicine dialog
  const [medicineDialogOpen, setMedicineDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] =
    useState<PharmacyMedicineItem | null>(null);
  const [medicineForm, setMedicineForm] =
    useState<MedicineFormState>(emptyMedicineForm);
  const [catalogMedicines, setCatalogMedicines] = useState<Medicine[]>([]);
  const [isLoadingCatalogMedicines, setIsLoadingCatalogMedicines] =
    useState(false);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message.trim()) return error.message;
    return fallback;
  };

  const fetchMedicineCatalog = useCallback(async () => {
    try {
      setIsLoadingCatalogMedicines(true);

      // Prefer backend-linked medicines so IDs are guaranteed to exist server-side.
      const linkedResponse = await adminPharmacyMedicineService.getAll();
      const linkedById = new Map<string, Medicine>();

      for (const item of linkedResponse.data || []) {
        const normalizedId = normalizePositiveIntId(item.medicineId);
        if (!normalizedId || linkedById.has(normalizedId)) continue;

        linkedById.set(normalizedId, {
          id: normalizedId,
          name: item.medicineName || `Medicine ${normalizedId}`,
          genericName: item.genericName || "",
          category: item.category || "",
          manufacturer: item.manufacturer || "",
          price: item.price || 0,
          stock: item.stock || 0,
          unit: item.unit || "unit",
          description: "",
        });
      }

      if (linkedById.size > 0) {
        setCatalogMedicines(Array.from(linkedById.values()));
        return;
      }

      // Fallback: local/mock medicine catalog, but normalize ids to backend-safe integers.
      const response = await pharmacyService.getAll();
      const normalizedCatalog = (response.data || []).reduce<Medicine[]>(
        (acc, medicine) => {
          const normalizedId = normalizePositiveIntId(medicine.id);
          if (!normalizedId || acc.some((m) => m.id === normalizedId)) {
            return acc;
          }
          acc.push({ ...medicine, id: normalizedId });
          return acc;
        },
        [],
      );

      setCatalogMedicines(normalizedCatalog);
    } catch (error) {
      console.error("Failed to load medicine catalog:", error);
      toast({
        title: "Error",
        description: "Failed Loading Medicine",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCatalogMedicines(false);
    }
  }, []);

  const fetchPharmacies = useCallback(async () => {
    try {
      setIsLoadingPharmacies(true);
      const response = await adminPharmacyService.getAll();
      setPharmacies(response.data);
      if (!response.success) {
        toast({
          title: "Alert",
          description: response.message || "Failed Loading Info",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to fetch pharmacies:", error);
      toast({
        title: "Error",
        description: "Failed Loading Pharmacies",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPharmacies(false);
    }
  }, []);

  useEffect(() => {
    fetchPharmacies();
    fetchMedicineCatalog();
  }, [fetchPharmacies, fetchMedicineCatalog]);

  const fetchMedicines = async (pharmacyId: string) => {
    try {
      setIsLoadingMedicines(true);
      const response =
        await adminPharmacyMedicineService.getByPharmacy(pharmacyId);
      setMedicines(response.data);
      if (!response.success) {
        toast({
          title: "تنبيه",
          description: response.message || "Failed Loading Pharmacyة",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to fetch pharmacy medicines:", error);
      toast({
        title: "Error",
        description: "Failed Loading Pharmacy",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMedicines(false);
    }
  };

  const openMedicinesView = (pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setMedicineSearch("");
    setCategoryFilter("all");
    setView("medicines");
    fetchMedicines(pharmacy.id);
  };

  const backToPharmacies = () => {
    setView("pharmacies");
    setSelectedPharmacy(null);
    setMedicines([]);
  };

  // ---------------- Pharmacy CRUD ----------------

  const openCreatePharmacy = () => {
    setEditingPharmacy(null);
    setPharmacyForm(emptyPharmacyForm);
    setPharmacyDialogOpen(true);
  };

  const openEditPharmacy = async (pharmacy: Pharmacy) => {
    setIsSaving(true);
    try {
      const detailsResponse = await adminPharmacyService.getById(pharmacy.id);
      const source = detailsResponse.success ? detailsResponse.data : pharmacy;

      if (!detailsResponse.success && detailsResponse.message) {
        toast({
          title: "Alert",
          description: detailsResponse.message,
          variant: "destructive",
        });
      }

      setEditingPharmacy(source);
      setPharmacyForm({
        name: source.name,
        address: source.address,
        phone: source.phone,
        email: source.email ?? "",
        openingTime: source.openingTime ?? "",
        closingTime: source.closingTime ?? "",
        latitude: source.latitude ?? null,
        longitude: source.longitude ?? null,
      });
      setPharmacyDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed Loading Pharmacy"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const savePharmacy = async () => {
    if (!pharmacyForm.name.trim() || !pharmacyForm.address.trim()) {
      toast({
        title: "Missing Information",
        description: "Name and address of the pharmacy is requird",
        variant: "destructive",
      });
      return;
    }
    if (!pharmacyForm.openingTime || !pharmacyForm.closingTime) {
      toast({
        title: "Missing Information",
        description: "Opening and closing times are required",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSaving(true);
      const response = editingPharmacy
        ? await adminPharmacyService.update(editingPharmacy.id, pharmacyForm)
        : await adminPharmacyService.create(pharmacyForm);

      if (!response.success) {
        throw new Error(response.message || "Request failed");
      }

      toast({
        title: " Updated!",
        description: editingPharmacy
          ? "Pharmacy Info Updated successfully"
          : "New Pharmacy is added successfully",
      });
      setPharmacyDialogOpen(false);
      fetchPharmacies();
    } catch (error) {
      console.error("Failed to save pharmacy:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed Saving Pharmcay's Info"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deletePharmacy = async (pharmacy: Pharmacy) => {
    if (
      !window.confirm(`Are you sure you want to delete "${pharmacy.name}"?`)
    ) {
      return;
    }
    try {
      setIsSaving(true);
      const response = await adminPharmacyService.remove(pharmacy.id);
      if (!response.success) {
        throw new Error(response.message || "Request failed");
      }
      toast({
        title: "Done",
        description: "Pharmacy Successfully deleted",
      });
      setPharmacies((prev) => prev.filter((p) => p.id !== pharmacy.id));
    } catch (error) {
      console.error("Failed to delete pharmacy:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Couldn't delete Pharmacy"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------- Pharmacy Medicine CRUD ----------------

  const openCreateMedicine = () => {
    setEditingMedicine(null);
    setMedicineForm(emptyMedicineForm);
    if (catalogMedicines.length === 0) {
      fetchMedicineCatalog();
    }
    setMedicineDialogOpen(true);
  };

  const openEditMedicine = (item: PharmacyMedicineItem) => {
    const normalizedId = normalizePositiveIntId(item.medicineId);
    setEditingMedicine(item);
    setMedicineForm({
      medicineId: normalizedId || item.medicineId,
      medicineName: item.medicineName,
      price: item.price,
      stock: item.stock,
      unit: item.unit,
    });
    setMedicineDialogOpen(true);
  };

  const saveMedicine = async () => {
    if (!selectedPharmacy) return;
    const normalizedStock = Number.isFinite(medicineForm.stock)
      ? Math.max(0, Math.trunc(medicineForm.stock))
      : 0;

    if (normalizedStock <= 0) {
      toast({
        title: "Missing Data",
        description: "Stock has to be bigger than zero",
        variant: "destructive",
      });
      return;
    }

    if (!editingMedicine && !medicineForm.medicineId.trim()) {
      toast({
        title: "Missing Data",
        description: "Choose Medicine",
        variant: "destructive",
      });
      return;
    }

    const effectiveMedicineId = normalizePositiveIntId(
      editingMedicine ? editingMedicine.medicineId : medicineForm.medicineId,
    );
    if (!effectiveMedicineId) {
      toast({
        title: "معرف دواء غير صالح",
        description: "تعذر استخراج رقم دواء صالح. اختر دواء آخر.",
        variant: "destructive",
      });
      return;
    }

    if (
      !editingMedicine &&
      catalogMedicines.length > 0 &&
      !catalogMedicines.some((m) => String(m.id) === effectiveMedicineId)
    ) {
      toast({
        title: "Missing Data",
        description: "Choose Medicine",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSaving(true);
      const response = editingMedicine
        ? await adminPharmacyMedicineService.update(editingMedicine.id, {
            pharmacyId: selectedPharmacy.id,
            medicineId: effectiveMedicineId,
            stock: normalizedStock,
          })
        : await adminPharmacyMedicineService.create({
            pharmacyId: selectedPharmacy.id,
            medicineId: effectiveMedicineId,
            stock: normalizedStock,
          });

      if (!response.success) {
        throw new Error(response.message || "Request failed");
      }

      toast({
        title: "Done",
        description: editingMedicine
          ? "Updating Medicine Details"
          : "Medicine Added Successfully",
      });
      setMedicineDialogOpen(false);
      fetchMedicines(selectedPharmacy.id);
    } catch (error) {
      console.error("Failed to save pharmacy medicine:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, " Failed Saving Midicine Info  "),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMedicine = async (item: PharmacyMedicineItem) => {
    if (
      !window.confirm(`Are You Sure You Want To Remove ${item.medicineName}?`)
    ) {
      return;
    }
    if (!selectedPharmacy) return;
    try {
      setIsSaving(true);
      const response = await adminPharmacyMedicineService.remove(item.id, {
        pharmacyId: selectedPharmacy.id,
        medicineId: item.medicineId,
      });
      if (!response.success) {
        throw new Error(response.message || "Request failed");
      }
      toast({ title: "Done", description: "Medicine Sucessfully deleted" });
      setMedicines((prev) => prev.filter((m) => m.id !== item.id));
    } catch (error) {
      console.error("Failed to delete pharmacy medicine:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Couldn't Delete Medicine"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const quickAdjustStock = async (
    item: PharmacyMedicineItem,
    delta: number,
  ) => {
    if (!selectedPharmacy) return;
    const newStock = Math.max(0, item.stock + delta);
    const previousMedicines = medicines;
    try {
      setIsSaving(true);
      setMedicines((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, stock: newStock } : m)),
      );
      const response = await adminPharmacyMedicineService.update(item.id, {
        pharmacyId: selectedPharmacy.id,
        medicineId: item.medicineId,
        stock: newStock,
      });
      if (!response.success) {
        throw new Error(response.message || "Request failed");
      }
    } catch (error) {
      console.error("Failed to update stock:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed Updating Stock"),
        variant: "destructive",
      });
      setMedicines(previousMedicines);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPharmacies = pharmacies.filter((p) =>
    `${p.name} ${p.address}`
      .toLowerCase()
      .includes(pharmacySearch.toLowerCase()),
  );

  const categories = [
    ...new Set(medicines.map((m) => m.category).filter(Boolean)),
  ] as string[];

  const filteredMedicines = medicines.filter((m) => {
    const matchesSearch = `${m.medicineName} ${m.genericName ?? ""}`
      .toLowerCase()
      .includes(medicineSearch.toLowerCase());
    const matchesCat =
      categoryFilter === "all" || m.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const getStockBadge = (stock: number) => {
    if (stock === 0)
      return (
        <Badge className="bg-destructive/10 text-destructive">
          Out of Stock
        </Badge>
      );
    if (stock <= 20)
      return <Badge className="bg-warning/10 text-warning">Low Stock</Badge>;
    return <Badge className="bg-success/10 text-success">In Stock</Badge>;
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {view === "pharmacies" ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Pharmacy Management
                </h1>
                <p className="text-muted-foreground text-sm">
                  Manage pharmacies, their medicines, and stock levels
                </p>
              </div>
              <Button
                className="gradient-bg border-0 gap-2"
                onClick={openCreatePharmacy}
              >
                <Plus className="w-4 h-4" />
                Add Pharmacy
              </Button>
            </motion.div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search pharmacies by name or address..."
                value={pharmacySearch}
                onChange={(e) => setPharmacySearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {isLoadingPharmacies ? (
              <LoadingCard />
            ) : filteredPharmacies.length === 0 ? (
              <Card>
                <CardContent className="pt-12 text-center pb-12">
                  <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No pharmacies found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPharmacies.map((pharmacy) => (
                  <Card
                    key={pharmacy.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-white" />
                          </div>
                          <p className="font-medium text-foreground truncate">
                            {pharmacy.name}
                          </p>
                        </div>
                        {pharmacy.isActive === false && (
                          <Badge className="bg-muted text-muted-foreground shrink-0">
                            Inactive
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        {pharmacy.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span className="truncate">{pharmacy.address}</span>
                          </div>
                        )}
                        {pharmacy.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span>{pharmacy.phone}</span>
                          </div>
                        )}
                        {/* {pharmacy.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{pharmacy.email}</span>
                          </div>
                        )} */}
                        {(pharmacy.openingTime || pharmacy.closingTime) && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {pharmacy.openingTime ?? "—"} -{" "}
                              {pharmacy.closingTime ?? "—"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1 gap-1.5"
                          onClick={() => openMedicinesView(pharmacy)}
                        >
                          <Package className="w-3.5 h-3.5" />
                          Medicines
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEditPharmacy(pharmacy)}
                          disabled={isSaving}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deletePharmacy(pharmacy)}
                          disabled={isSaving}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 -ml-2 mb-1 text-muted-foreground"
                  onClick={backToPharmacies}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Pharmacies
                </Button>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {selectedPharmacy?.name}
                </h1>
                <p className="text-muted-foreground text-sm">
                  Manage medicines, stock levels, and availability
                </p>
              </div>
              <Button
                className="gradient-bg border-0 gap-2"
                onClick={openCreateMedicine}
              >
                <Plus className="w-4 h-4" />
                Add Medicine
              </Button>
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search medicines..."
                  value={medicineSearch}
                  onChange={(e) => setMedicineSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-44">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {medicines.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Items</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-warning">
                    {
                      medicines.filter((m) => m.stock > 0 && m.stock <= 20)
                        .length
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">Low Stock</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">
                    {medicines.filter((m) => m.stock === 0).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Out of Stock</p>
                </CardContent>
              </Card>
            </div>

            {isLoadingMedicines ? (
              <LoadingCard />
            ) : filteredMedicines.length === 0 ? (
              <Card>
                <CardContent className="pt-12 text-center pb-12">
                  <p className="text-muted-foreground">No medicines found</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 font-medium text-muted-foreground">
                          Medicine
                        </th>
                        <th className="pb-3 font-medium text-muted-foreground hidden md:table-cell">
                          Category
                        </th>
                        <th className="pb-3 font-medium text-muted-foreground">
                          Price
                        </th>
                        <th className="pb-3 font-medium text-muted-foreground">
                          Stock
                        </th>
                        <th className="pb-3 font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="pb-3 font-medium text-muted-foreground text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMedicines.map((med) => (
                        <tr
                          key={med.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3">
                            <div>
                              <p className="font-medium text-foreground">
                                {med.medicineName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {med.genericName || "—"}
                                {med.manufacturer
                                  ? ` • ${med.manufacturer}`
                                  : ""}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 text-muted-foreground hidden md:table-cell">
                            {med.category || "—"}
                          </td>
                          <td className="py-3 text-foreground">
                            ${med.price.toFixed(2)}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {med.stock <= 20 && med.stock > 0 && (
                                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                              )}
                              <span className="text-foreground font-medium">
                                {med.stock}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {med.unit}
                              </span>
                            </div>
                          </td>
                          <td className="py-3">{getStockBadge(med.stock)}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => quickAdjustStock(med, -10)}
                                disabled={isSaving}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => quickAdjustStock(med, 10)}
                                disabled={isSaving}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditMedicine(med)}
                                disabled={isSaving}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => deleteMedicine(med)}
                                disabled={isSaving}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Pharmacy Create/Edit Dialog */}
        <Dialog open={pharmacyDialogOpen} onOpenChange={setPharmacyDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle className="font-display">
                {editingPharmacy ? "Edit Pharmacy" : "Add Pharmacy"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-4">
              <div className="space-y-2">
                <Label>Pharmacy Name</Label>
                <Input
                  value={pharmacyForm.name}
                  onChange={(e) =>
                    setPharmacyForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Lunare Central Pharmacy"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={pharmacyForm.address}
                  onChange={(e) =>
                    setPharmacyForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="Street, city"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={pharmacyForm.phone}
                    onChange={(e) =>
                      setPharmacyForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="+20..."
                  />
                </div>
                {/* <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={pharmacyForm.email}
                    onChange={(e) =>
                      setPharmacyForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="pharmacy@example.com"
                  />
                </div> */}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Opening Time</Label>
                  <Input
                    type="time"
                    value={pharmacyForm.openingTime}
                    onChange={(e) =>
                      setPharmacyForm((f) => ({
                        ...f,
                        openingTime: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Closing Time</Label>
                  <Input
                    type="time"
                    value={pharmacyForm.closingTime}
                    onChange={(e) =>
                      setPharmacyForm((f) => ({
                        ...f,
                        closingTime: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <PharmacyLocationPicker
                mapKey={editingPharmacy?.id ?? "new"}
                latitude={pharmacyForm.latitude}
                longitude={pharmacyForm.longitude}
                onLocationChange={(lat, lng, address) =>
                  setPharmacyForm((f) => ({
                    ...f,
                    latitude: lat,
                    longitude: lng,
                    address: address ?? f.address,
                  }))
                }
              />

              <div className="flex gap-2 pt-2">
                <Button
                  className="w-full gradient-bg border-0"
                  onClick={savePharmacy}
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : editingPharmacy
                      ? "Save Changes"
                      : "Add Pharmacy"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setPharmacyDialogOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Pharmacy Medicine Create/Edit Dialog */}
        <Dialog open={medicineDialogOpen} onOpenChange={setMedicineDialogOpen}>
          <DialogContent className="max-w-sm max-h-[90vh] px-4 py-7">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingMedicine ? "Edit Medicine" : "Add Medicine"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {editingMedicine ? (
                <p className="font-medium text-foreground">
                  {editingMedicine.medicineName}
                </p>
              ) : (
                <div className="space-y-2">
                  <Label>Medicine</Label>
                  <Select
                    value={medicineForm.medicineId}
                    onValueChange={(value) => {
                      const selected = catalogMedicines.find(
                        (item) => String(item.id) === value,
                      );
                      setMedicineForm((f) => ({
                        ...f,
                        medicineId: value,
                        medicineName: selected?.name ?? "",
                        price: selected?.price ?? f.price,
                        unit: selected?.unit ?? f.unit,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select medicine from catalog" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingCatalogMedicines && (
                        <SelectItem value="__loading" disabled>
                          Loading medicines...
                        </SelectItem>
                      )}
                      {!isLoadingCatalogMedicines &&
                        catalogMedicines.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.name} ({item.genericName})
                          </SelectItem>
                        ))}
                      {!isLoadingCatalogMedicines &&
                        catalogMedicines.length === 0 && (
                          <SelectItem value="__empty" disabled>
                            No medicines found
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editingMedicine ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={medicineForm.price}
                        onChange={(e) =>
                          setMedicineForm((f) => ({
                            ...f,
                            price: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Stock</Label>
                      <Input
                        type="number"
                        min={0}
                        value={medicineForm.stock}
                        onChange={(e) =>
                          setMedicineForm((f) => ({
                            ...f,
                            stock: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input
                      value={medicineForm.unit}
                      onChange={(e) =>
                        setMedicineForm((f) => ({ ...f, unit: e.target.value }))
                      }
                      placeholder="box, strip, bottle..."
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    min={0}
                    value={medicineForm.stock}
                    onChange={(e) =>
                      setMedicineForm((f) => ({
                        ...f,
                        stock: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              )}
              <div className="sticky bottom-0 bg-background pt-4 flex gap-2">
                <Button
                  className="w-full gradient-bg border-0"
                  onClick={saveMedicine}
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Saving..."
                    : editingMedicine
                      ? "Save Changes"
                      : "Add Medicine"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setMedicineDialogOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
