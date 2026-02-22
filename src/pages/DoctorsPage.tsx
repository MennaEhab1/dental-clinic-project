import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MainLayout } from '@/components/layout/MainLayout';
import { DoctorCard } from '@/components/doctors/DoctorCard';
import { LoadingPage } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { doctorService } from '@/services/api';
import type { Doctor, DentalSpecialty } from '@/types';

const specialties: { value: DentalSpecialty | 'all'; label: string }[] = [
  { value: 'all', label: 'All Specialists' },
  { value: 'general', label: 'General' },
  { value: 'cosmetic', label: 'Cosmetic' },
  { value: 'orthodontics', label: 'Orthodontics' },
  { value: 'oral-surgery', label: 'Oral Surgery' },
  { value: 'pediatric', label: 'Pediatric' },
  { value: 'endodontics', label: 'Endodontics' },
];

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<DentalSpecialty | 'all'>('all');

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await doctorService.getAll();
        setDoctors(response.data);
        setFilteredDoctors(response.data);
      } catch (error) {
        console.error('Failed to fetch doctors:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    let filtered = doctors;

    if (selectedSpecialty !== 'all') {
      filtered = filtered.filter(d => d.specialty === selectedSpecialty);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.firstName.toLowerCase().includes(query) ||
        d.lastName.toLowerCase().includes(query) ||
        d.bio.toLowerCase().includes(query)
      );
    }

    setFilteredDoctors(filtered);
  }, [searchQuery, selectedSpecialty, doctors]);

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
              Meet Our <span className="gradient-text">Expert Team</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Our dedicated team of dental professionals is committed to providing 
              you with the highest quality care in a comfortable environment.
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
                placeholder="Search doctors..."
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

      {/* Doctors Grid */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          {filteredDoctors.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map((doctor, index) => (
                <motion.div
                  key={doctor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <DoctorCard doctor={doctor} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground">
                No doctors found matching your criteria.
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
