// import { motion } from 'framer-motion';
// import { AlertTriangle, CheckCircle, Info, Shield } from 'lucide-react';
// import { Card, CardContent } from '@/components/ui/card';
// import { Progress } from '@/components/ui/progress';
// import type { AnalysisResponse } from '@/services/aiAnalysisService';

// interface AnalysisResultBoxProps {
//   analysis: AnalysisResponse;
// }

// const severityConfig = {
//   low: {
//     icon: CheckCircle,
//     color: 'text-success',
//     bg: 'bg-success/10',
//     border: 'border-success/20',
//     label: 'Low Risk',
//   },
//   moderate: {
//     icon: Info,
//     color: 'text-warning',
//     bg: 'bg-warning/10',
//     border: 'border-warning/20',
//     label: 'Moderate',
//   },
//   high: {
//     icon: AlertTriangle,
//     color: 'text-destructive',
//     bg: 'bg-destructive/10',
//     border: 'border-destructive/20',
//     label: 'High Priority',
//   },
// };

// export function AnalysisResultBox({ analysis }: AnalysisResultBoxProps) {
//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.5, ease: 'easeOut' }}
//       className="space-y-4"
//     >
//       {/* Summary Card */}
//       <motion.div
//         initial={{ opacity: 0, scale: 0.95 }}
//         animate={{ opacity: 1, scale: 1 }}
//         transition={{ delay: 0.1 }}
//       >
//         <Card className="border-primary/20 bg-primary/5">
//           <CardContent className="p-4 flex items-start gap-3">
//             <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
//               <Shield className="w-5 h-5 text-primary" />
//             </div>
//             <div>
//               <h4 className="font-semibold text-sm text-foreground mb-1">Analysis Summary</h4>
//               <p className="text-sm text-muted-foreground">{analysis.summary}</p>
//               <p className="text-xs text-muted-foreground mt-2">
//                 Analyzed on {new Date(analysis.analyzedAt).toLocaleString()}
//               </p>
//             </div>
//           </CardContent>
//         </Card>
//       </motion.div>

//       {/* Individual Findings */}
//       <div className="space-y-3">
//         {analysis.results.map((result, index) => {
//           const config = severityConfig[result.severity];
//           const Icon = config.icon;
//           return (
//             <motion.div
//               key={result.id}
//               initial={{ opacity: 0, x: -20 }}
//               animate={{ opacity: 1, x: 0 }}
//               transition={{ delay: 0.2 + index * 0.15 }}
//             >
//               <Card className={`border ${config.border}`}>
//                 <CardContent className="p-4 space-y-3">
//                   <div className="flex items-start justify-between gap-3">
//                     <div className="flex items-start gap-3">
//                       <div className={`p-2 rounded-lg ${config.bg} shrink-0 mt-0.5`}>
//                         <Icon className={`w-4 h-4 ${config.color}`} />
//                       </div>
//                       <div>
//                         <h5 className="font-semibold text-sm text-foreground">
//                           {result.condition}
//                         </h5>
//                         <span className={`text-xs font-medium ${config.color}`}>
//                           {config.label}
//                         </span>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Confidence Bar */}
//                   <div className="space-y-1.5">
//                     <div className="flex justify-between text-xs">
//                       <span className="text-muted-foreground">Confidence</span>
//                       <span className="font-medium text-foreground">{result.confidence}%</span>
//                     </div>
//                     <Progress value={result.confidence} className="h-1.5" />
//                   </div>

//                   <p className="text-sm text-muted-foreground">{result.description}</p>

//                   <div className="p-3 rounded-lg bg-muted/50">
//                     <p className="text-xs font-medium text-foreground mb-1">💡 Recommendation</p>
//                     <p className="text-xs text-muted-foreground">{result.recommendation}</p>
//                   </div>
//                 </CardContent>
//               </Card>
//             </motion.div>
//           );
//         })}
//       </div>
//     </motion.div>
//   );
// }













import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { AnalysisResponse } from '@/services/aiAnalysisService';

interface AnalysisResultBoxProps {
  analysis: AnalysisResponse;
}

const severityConfig = {
  low: {
    icon: CheckCircle,
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/20',
  },
  moderate: {
    icon: Info,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
  },
  high: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
  },
};

export function AnalysisResultBox({ analysis }: AnalysisResultBoxProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="space-y-4"
    >
      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
              <Shield className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1">
              <h4 className="font-semibold text-sm text-foreground mb-1">
                Analysis Summary
              </h4>

              <p className="text-sm text-muted-foreground">
                {analysis.summary}
              </p>

              {analysis.results.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50">
                  <p className="text-xs font-medium text-foreground mb-1">
                    💡 Recommendation
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {analysis.results[0].recommendation}
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-3">
                Analyzed on {new Date(analysis.analyzedAt).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results */}
      <div className="space-y-3">
        {analysis.results.map((result, index) => {
          const config = severityConfig[result.severity];
          const Icon = config.icon;

          return (
            <motion.div
              key={result.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.15 }}
            >
              <Card className={`border ${config.border}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${config.bg} shrink-0 mt-0.5`}
                    >
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>

                    <div>
                      <h5 className="font-semibold text-sm text-foreground">
                        {result.condition}
                      </h5>
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        Confidence
                      </span>

                      <span className="font-medium text-foreground">
                        {result.confidence}%
                      </span>
                    </div>

                    <Progress
                      value={result.confidence}
                      className="h-1.5"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}