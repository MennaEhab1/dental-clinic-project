import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/layout/MainLayout';
import { CheckCircle, Calendar, Home } from 'lucide-react';

export default function BookingConfirmation() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg mx-auto text-center"
        >
          <div className="w-20 h-20 rounded-full gradient-bg mx-auto flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-primary-foreground" />
          </div>
          
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Booking Confirmed!
          </h1>
          
          <p className="text-muted-foreground mb-8">
            Your appointment has been successfully scheduled. You will receive a 
            confirmation email with all the details shortly.
          </p>

          <div className="bg-card border border-border rounded-2xl p-6 mb-8 text-left">
            <h2 className="font-semibold text-foreground mb-4">What's Next?</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Check your email for the appointment confirmation and details.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add the appointment to your calendar to receive a reminder.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Arrive 10 minutes early to complete any necessary paperwork.
                </p>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/patient/appointments">
              <Button className="gradient-bg border-0 w-full sm:w-auto">
                <Calendar className="w-4 h-4 mr-2" />
                View My Appointments
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="w-full sm:w-auto">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
}
