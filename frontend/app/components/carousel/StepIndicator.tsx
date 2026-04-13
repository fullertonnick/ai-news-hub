'use client';
import { useCarouselStore, type PipelineStep } from '../../stores/useCarouselStore';
import { Check } from 'lucide-react';

const STEPS: { num: PipelineStep; label: string; approvalKey?: string }[] = [
  { num: 1, label: 'Copy', approvalKey: 'copy' },
  { num: 2, label: 'Visuals', approvalKey: 'visuals' },
  { num: 3, label: 'Edit' , approvalKey: 'edit' },
  { num: 4, label: 'Export' },
];

export default function StepIndicator() {
  const { currentStep, setStep, approvals, slides } = useCarouselStore();
  const hasSlides = slides.length > 0;

  return (
    <div className="flex items-center gap-1 px-4 py-3 border-b border-white/5 overflow-x-auto flex-shrink-0">
      {STEPS.map((s, i) => {
        const approved = s.approvalKey ? approvals[s.approvalKey as keyof typeof approvals] : false;
        const active = currentStep === s.num;
        const reachable = s.num === 1 || (hasSlides && s.num <= currentStep + 1);

        return (
          <div key={s.num} className="flex items-center">
            <button
              onClick={() => reachable && setStep(s.num)}
              disabled={!reachable}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                active ? 'bg-brand-orange/20 text-brand-orange border border-brand-orange/30'
                : approved ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : reachable ? 'text-gray-500 hover:text-white border border-transparent'
                : 'text-gray-700 border border-transparent cursor-not-allowed'
              }`}>
              {approved ? <Check size={12} /> : <span className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center text-[10px]">{s.num}</span>}
              {s.label}
            </button>
            {i < STEPS.length - 1 && <div className="w-6 h-px bg-white/10 mx-1" />}
          </div>
        );
      })}
    </div>
  );
}
