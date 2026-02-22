import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { ServiceCard } from '@/components/services/ServiceCard';
import { LoadingPage } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { serviceService } from '@/services/api';
import type { Service, DentalSpecialty } from '@/types';

const specialties: { value: DentalSpecialty | 'all'; label: string }[] = [
  { value: 'all', label: 'All Services' },
  { value: 'general', label: 'General' },
  { value: 'cosmetic', label: 'Cosmetic' },
  { value: 'orthodontics', label: 'Orthodontics' },
  { value: 'oral-surgery', label: 'Oral Surgery' },
  { value: 'pediatric', label: 'Pediatric' },
  { value: 'endodontics', label: 'Endodontics' },
  { value: 'periodontics', label: 'Periodontics' },
];

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<DentalSpecialty | 'all'>('all');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await serviceService.getAll();
        setServices(response.data);
        setFilteredServices(response.data);
      } catch (error) {
        console.error('Failed to fetch services:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    let filtered = services;

    if (selectedSpecialty !== 'all') {
      filtered = filtered.filter(s => s.specialty === selectedSpecialty);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    }

    setFilteredServices(filtered);
  }, [searchQuery, selectedSpecialty, services]);

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingPage />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="gradient-hero-bg py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Our <span className="gradient-text">Dental Services</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Comprehensive dental care for you and your family. From preventive 
              care to advanced treatments, we've got you covered.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 border-b border-border sticky top-16 md:top-20 bg-background/95 backdrop-blur-sm z-40">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {specialties.map((specialty) => (
                <Button
                  key={specialty.value}
                  variant={selectedSpecialty === specialty.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSpecialty(specialty.value)}
                  className={selectedSpecialty === specialty.value ? 'gradient-bg border-0' : ''}
                >
                  {specialty.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          {filteredServices.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredServices.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ServiceCard service={service} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground">
                No services found matching your criteria.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSpecialty('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
