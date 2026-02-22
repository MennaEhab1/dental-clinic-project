import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign } from 'lucide-react';
import type { Service } from '@/types';
import { Link } from 'react-router-dom';

interface ServiceCardProps {
  service: Service;
  variant?: 'default' | 'compact';
}

const specialtyColors: Record<string, string> = {
  general: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  orthodontics: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  cosmetic: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'oral-surgery': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  pediatric: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  endodontics: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  periodontics: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  prosthodontics: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

export function ServiceCard({ service, variant = 'default' }: ServiceCardProps) {
  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:shadow-soft transition-shadow"
      >
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
          <img
            src={service.image}
            alt={service.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate">{service.name}</h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {service.duration} min
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-primary">
              <DollarSign className="w-3 h-3" />
              {service.price}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden shadow-card hover:shadow-elevated transition-shadow h-full">
        <div className="relative h-44">
          <img
            src={service.image}
            alt={service.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <Badge className={`${specialtyColors[service.specialty]} border-0`}>
              {service.specialty.replace('-', ' ')}
            </Badge>
          </div>
        </div>
        <CardContent className="p-5">
          <h3 className="font-display font-semibold text-lg text-foreground mb-2">
            {service.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {service.description}
          </p>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{service.duration} min</span>
            </div>
            <div className="flex items-center gap-1 text-primary font-semibold">
              <DollarSign className="w-4 h-4" />
              <span>{service.price}</span>
            </div>
          </div>
          <Link to={`/booking?service=${service.id}`}>
            <Button className="w-full gradient-bg border-0">
              Book This Service
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}
