import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ImageUpload } from '@/components/ai/ImageUpload';
import { CameraCapture } from '@/components/ai/CameraCapture';
import { AnalysisResultBox } from '@/components/ai/AnalysisResultBox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Camera, Sparkles, RotateCcw, ShieldCheck } from 'lucide-react';
import { analyzeImage, type AnalysisResponse } from '@/services/aiAnalysisService';

export default function PatientImageAnalysis() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');

  const handleImageSelect = useCallback((file: File, preview: string) => {
    setImageFile(file);
    setImagePreview(preview);
    setAnalysis(null);
    setShowCamera(false);
  }, []);

  const handleClear = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setAnalysis(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!imageFile) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeImage(imageFile);
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageFile]);

  const handleReset = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setAnalysis(null);
    setShowCamera(false);
  }, []);

  return (
    <DashboardLayout role="patient">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-hero-bg rounded-2xl p-6 md:p-8"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl gradient-bg shrink-0">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                AI Dental Image Analysis
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Upload or capture a dental image and let our AI analyze it for potential conditions. 
                This is a screening tool — always consult your dentist for a clinical diagnosis.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Input Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Capture or Upload Image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Upload
                  </TabsTrigger>
                  <TabsTrigger value="camera" className="gap-2">
                    <Camera className="w-4 h-4" />
                    Camera
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-4">
                  <ImageUpload
                    onImageSelect={handleImageSelect}
                    currentPreview={imagePreview}
                    onClear={handleClear}
                  />
                </TabsContent>

                <TabsContent value="camera" className="mt-4">
                  <AnimatePresence mode="wait">
                    {imagePreview && !showCamera ? (
                      <motion.div
                        key="camera-preview"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="relative rounded-xl overflow-hidden border border-border bg-muted"
                      >
                        <img
                          src={imagePreview}
                          alt="Captured"
                          className="w-full h-64 object-contain bg-muted"
                        />
                        <div className="absolute bottom-3 right-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { handleClear(); setShowCamera(true); }}
                            className="bg-background/90 backdrop-blur-sm"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Retake
                          </Button>
                        </div>
                      </motion.div>
                    ) : (
                      <CameraCapture
                        key="camera-stream"
                        onCapture={handleImageSelect}
                        onClose={() => setActiveTab('upload')}
                      />
                    )}
                  </AnimatePresence>
                </TabsContent>
              </Tabs>

              {/* Analyze Button */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  className="flex-1 gradient-bg border-0 h-11"
                  disabled={!imageFile || isAnalyzing}
                  onClick={handleAnalyze}
                >
                  {isAnalyzing ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="mr-2"
                      >
                        <Sparkles className="w-4 h-4" />
                      </motion.div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze Image
                    </>
                  )}
                </Button>
                {(imageFile || analysis) && (
                  <Button variant="outline" onClick={handleReset} className="h-11">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Start Over
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Loading State */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card>
                <CardContent className="p-8 flex flex-col items-center gap-4">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="p-5 rounded-2xl gradient-bg"
                  >
                    <Sparkles className="w-8 h-8 text-primary-foreground" />
                  </motion.div>
                  <div className="text-center">
                    <h3 className="font-display font-semibold text-foreground mb-1">
                      Analyzing your image...
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Our AI is examining the dental image for potential conditions.
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                        className="w-2 h-2 rounded-full bg-primary"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis Results */}
        <AnimatePresence>
          {analysis && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <AnalysisResultBox analysis={analysis} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-muted/50 border-border">
            <CardContent className="p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-foreground mb-1">Important Disclaimer</p>
                <p className="text-xs text-muted-foreground">
                  This AI analysis is for informational purposes only and does not constitute a medical diagnosis. 
                  Always consult with a qualified dental professional for proper evaluation and treatment.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
