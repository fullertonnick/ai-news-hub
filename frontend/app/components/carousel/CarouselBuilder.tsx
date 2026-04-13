'use client';
import { useCarouselStore } from '../../stores/useCarouselStore';
import StepIndicator from './StepIndicator';
import Step1Copy from './Step1Copy';
import Step2Visuals from './Step2Visuals';
import Step3Edit from './Step3Edit';
import Step4Export from './Step4Export';

export default function CarouselBuilder() {
  const { currentStep } = useCarouselStore();

  return (
    <div className="flex flex-col h-full">
      <StepIndicator />
      <div className="flex-1 overflow-y-auto">
        {currentStep === 1 && <Step1Copy />}
        {currentStep === 2 && <Step2Visuals />}
        {currentStep === 3 && <Step3Edit />}
        {currentStep === 4 && <Step4Export />}
      </div>
    </div>
  );
}
