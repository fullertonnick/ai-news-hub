'use client';
import { useCarouselStore } from '../../stores/useCarouselStore';
import StepIndicator from './StepIndicator';
import Step1Copy from './Step1Copy';
import Step2Backgrounds from './Step2Backgrounds';
import Step3Cover from './Step3Cover';
import Step4CTA from './Step4CTA';
import Step5Compose from './Step5Compose';
import Step6Export from './Step6Export';

export default function CarouselBuilder() {
  const { currentStep } = useCarouselStore();

  return (
    <div className="flex flex-col h-full">
      <StepIndicator />
      <div className="flex-1 overflow-y-auto">
        {currentStep === 1 && <Step1Copy />}
        {currentStep === 2 && <Step2Backgrounds />}
        {currentStep === 3 && <Step3Cover />}
        {currentStep === 4 && <Step4CTA />}
        {currentStep === 5 && <Step5Compose />}
        {currentStep === 6 && <Step6Export />}
      </div>
    </div>
  );
}
