import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/MainLayout";
import { DoctorCard } from "@/components/doctors/DoctorCard";
import { ServiceCard } from "@/components/services/ServiceCard";
import {
  Calendar,
  Shield,
  Clock,
  Star,
  CheckCircle,
  ArrowRight,
  Stethoscope,
  Sparkles,
  Users,
  Award,
} from "lucide-react";
import { doctorService, serviceService } from "@/services/api";
import type { Doctor, Service } from "@/types";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const features = [
  {
    icon: Shield,
    title: "Safe & Sterile",
    description:
      "State-of-the-art sterilization and infection control protocols.",
  },
  {
    icon: Clock,
    title: "Flexible Hours",
    description: "Extended hours and weekend appointments available.",
  },
  {
    icon: Star,
    title: "Expert Team",
    description: "Board-certified specialists with years of experience.",
  },
  {
    icon: CheckCircle,
    title: "Modern Technology",
    description: "Latest dental technology for accurate diagnosis.",
  },
];

const stats = [
  { value: "15+", label: "Years Experience" },
  { value: "50K+", label: "Happy Patients" },
  { value: "12", label: "Expert Dentists" },
  { value: "98%", label: "Success Rate" },
];

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Patient",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    content:
      "The best dental experience I've ever had. The staff is incredibly friendly and the results exceeded my expectations.",
    rating: 5,
  },
  {
    name: "Michael Torres",
    role: "Patient",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    content:
      "Dr. Chen's orthodontic treatment completely transformed my smile. I couldn't be happier with the results!",
    rating: 5,
  },
  {
    name: "Emily Parker",
    role: "Patient",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    content:
      "My kids actually look forward to their dental visits now. Dr. Patel makes everything so fun and comfortable for them.",
    rating: 5,
  },
];

export default function LandingPage() {
  const [featuredDoctors, setFeaturedDoctors] = useState<Doctor[]>([]);
  const [featuredServices, setFeaturedServices] = useState<Service[]>([]);

  useEffect(() => {
    const loadFeaturedData = async () => {
      try {
        const [doctorsRes, servicesRes] = await Promise.all([
          doctorService.getAll(),
          serviceService.getAll(),
        ]);

        setFeaturedDoctors(doctorsRes.data.slice(0, 3));
        setFeaturedServices(servicesRes.data.slice(0, 4));
      } catch (error) {
        console.error("Failed to load landing data", error);
      }
    };

    loadFeaturedData();
  }, []);

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero-bg">
        <div className="container mx-auto px-4 py-16 md:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Trusted by 50,000+ patients
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
                Your Perfect Smile{" "}
                <span className="gradient-text">Starts Here</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                Experience exceptional dental care with our team of expert
                dentists. From routine checkups to advanced treatments, we're
                here to give you the smile you deserve.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/booking">
                  <Button size="lg" className="gradient-bg border-0">
                    <Calendar className="w-5 h-5 mr-2" />
                    Book Appointment
                  </Button>
                </Link>
                <Link to="/services">
                  <Button size="lg" variant="outline">
                    Explore Services
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="text-center"
                  >
                    <p className="text-2xl md:text-3xl font-display font-bold gradient-text">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-elevated">
                <img
                  src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&h=600&fit=crop"
                  alt="Dental Care"
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>

              {/* Floating Cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -bottom-6 -left-6 bg-card p-4 rounded-2xl shadow-card border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                    <Stethoscope className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Expert Care</p>
                    <p className="text-sm text-muted-foreground">
                      12 Specialists
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                className="absolute -top-4 -right-4 bg-card p-4 rounded-2xl shadow-card border border-border"
              >
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <img
                        key={i}
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=patient${i}`}
                        alt=""
                        className="w-8 h-8 rounded-full border-2 border-card"
                      />
                    ))}
                  </div>
                  <div className="ml-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className="w-3 h-3 text-warning fill-warning"
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">4.9 Rating</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            {...fadeInUp}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose <span className="gradient-text">DentalCare</span>?
            </h2>
            <p className="text-muted-foreground">
              We combine expertise, technology, and compassion to deliver
              exceptional dental care for you and your family.
            </p>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                className="p-6 rounded-2xl bg-background border border-border hover:shadow-card transition-shadow group"
              >
                <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            {...fadeInUp}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12"
          >
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Our <span className="gradient-text">Services</span>
              </h2>
              <p className="text-muted-foreground max-w-lg">
                Comprehensive dental services to meet all your oral health
                needs.
              </p>
            </div>
            <Link to="/services">
              <Button variant="outline">
                View All Services
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredServices.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <ServiceCard service={service} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Doctors Section */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4">
          <motion.div
            {...fadeInUp}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12"
          >
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Meet Our <span className="gradient-text">Experts</span>
              </h2>
              <p className="text-muted-foreground max-w-lg">
                Our team of experienced dentists is committed to your oral
                health.
              </p>
            </div>
            <Link to="/doctors">
              <Button variant="outline">
                View All Doctors
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredDoctors.map((doctor, index) => (
              <motion.div
                key={doctor.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <DoctorCard doctor={doctor} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            {...fadeInUp}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              What Our <span className="gradient-text">Patients Say</span>
            </h2>
            <p className="text-muted-foreground">
              Real stories from real patients about their experience with us.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-card border border-border"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-warning fill-warning"
                    />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6">
                  {testimonial.content}
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl gradient-bg p-8 md:p-12 lg:p-16 overflow-hidden"
          >
            <div className="relative z-10 max-w-2xl">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready for Your Best Smile?
              </h2>
              <p className="text-primary-foreground/80 mb-8">
                Schedule your appointment today and take the first step towards
                a healthier, brighter smile. New patients welcome!
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/booking">
                  <Button size="lg" variant="secondary">
                    <Calendar className="w-5 h-5 mr-2" />
                    Book Appointment
                  </Button>
                </Link>
                <a href="tel:+15551234567">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    Call Us Now
                  </Button>
                </a>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute right-0 top-0 w-1/3 h-full opacity-10">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="currentColor"
                  className="text-primary-foreground"
                />
              </svg>
            </div>
          </motion.div>
        </div>
      </section>
    </MainLayout>
  );
}
