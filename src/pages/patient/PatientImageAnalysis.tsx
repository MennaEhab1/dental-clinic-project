import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ImageUpload } from '@/components/ai/ImageUpload';
import { CameraCapture } from '@/components/ai/CameraCapture';
import { AnalysisResultBox } from '@/components/ai/AnalysisResultBox';
import { AIChatWidget } from '@/components/ai/AIChatWidget';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  Upload,
  Camera,
  Sparkles,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

import {
  analyzeImage,
  type AnalysisResponse,
} from '@/services/aiAnalysisService';

export default function PatientImageAnalysis() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);

  const [activeTab, setActiveTab] = useState('upload');

  // ✅ الشات يفتح بعد التحليل فقط
  const [showChat, setShowChat] = useState(false);

  const handleImageSelect = useCallback(
    (file: File, preview: string) => {
      setImageFile(file);
      setImagePreview(preview);

      // reset analysis
      setAnalysis(null);

      // اقفل الشات عند تغيير الصورة
      setShowChat(false);
    },
    []
  );

  const handleClear = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);

    setAnalysis(null);
    setShowChat(false);
  }, []);

  // ✅ تحليل الصورة
  const handleAnalyze = useCallback(async () => {
    if (!imageFile) return;

    setIsAnalyzing(true);

    try {
      const result = await analyzeImage(imageFile);

      console.log('ANALYSIS RESULT:', result);

      setAnalysis(result);

      // لو فيه نتائج صحيحة خلي زرار الشات يشتغل
      if (result.results && result.results.length > 0) {
        setShowChat(false);
      }
    } catch (error) {
      console.error('Analysis failed:', error);

      setAnalysis({
        results: [],
        summary: '❌ Failed to analyze image.',
        analyzedAt: new Date().toISOString(),
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageFile]);

  const handleReset = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);

    setAnalysis(null);
    setShowChat(false);
  }, []);

  return (
    <DashboardLayout role="patient">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Hero */}
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
                Upload or capture a dental image and let our AI analyze it.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Upload / Camera */}
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

                <TabsTrigger value="upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </TabsTrigger>

                <TabsTrigger value="camera">
                  <Camera className="w-4 h-4 mr-2" />
                  Camera
                </TabsTrigger>

              </TabsList>

              {/* Upload */}
              <TabsContent value="upload" className="mt-4">
                <ImageUpload
                  onImageSelect={handleImageSelect}
                  currentPreview={imagePreview}
                  onClear={handleClear}
                />
              </TabsContent>

              {/* Camera */}
              <TabsContent value="camera" className="mt-4">
                <CameraCapture
                  onCapture={handleImageSelect}
                  onClose={() => setActiveTab('upload')}
                />
              </TabsContent>
            </Tabs>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">

              {/* Analyze */}
              <Button
                className="flex-1 gradient-bg border-0 h-11"
                disabled={!imageFile || isAnalyzing}
                onClick={handleAnalyze}
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze Image
                  </>
                )}
              </Button>

              {/* Chat */}
              <Button
                variant="secondary"
                className="flex-1 h-11"
                disabled={!analysis || analysis.results.length === 0}
                onClick={() => setShowChat(true)}
              >
                💬 Start Chat
              </Button>

              {/* Reset */}
              {(imageFile || analysis) && (
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="h-11"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>

          </CardContent>
        </Card>

        {/* Loading */}
        {isAnalyzing && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                AI is analyzing your image...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {analysis && !isAnalyzing && (
          <AnalysisResultBox analysis={analysis} />
        )}

        {/* Disclaimer */}
        <Card className="bg-muted/50 border-border">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />

            <div>
              <p className="text-xs font-medium text-foreground mb-1">
                Important Disclaimer
              </p>

              <p className="text-xs text-muted-foreground">
                This AI analysis is for informational purposes only and does not
                constitute a medical diagnosis.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ✅ الشات */}
      {showChat && <AIChatWidget />}
    </DashboardLayout>
  );
}