"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Step1Accounts } from "@/components/onboarding/steps/Step1Accounts";
import { Step2Finances } from "@/components/onboarding/steps/Step2Finances";
import { Step3Goals } from "@/components/onboarding/steps/Step3Goals";
import { Step4Retirement } from "@/components/onboarding/steps/Step4Retirement";

export default function OnboardingPage() {
  const router = useRouter();
  const { data, isLoading, refetch } = trpc.user.getOnboardingStatus.useQuery();
  
  const [activeStep, setActiveStep] = useState<number | null>(null);

  useEffect(() => {
    if (data?.allComplete) {
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    }
  }, [data?.allComplete, router]);

  if (isLoading || !data) {
    return <div className="p-12 text-center text-gray-500">Determinando status do seu onboarding...</div>;
  }

  const { steps } = data;
  
  // Array of progress bools
  const stepBools = [steps.accounts, steps.finances, steps.goals, steps.retirement];
  const completedCount = stepBools.filter(Boolean).length;
  const progressPercent = (completedCount / 4) * 100;

  const handleStepComplete = () => {
    setActiveStep(null);
    refetch(); // fetch fresh status to update the checks
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6">
      
      {/* Visual Shell mapping to the 4 steps */}
      <OnboardingShell 
        steps={steps} 
        progressPercent={progressPercent} 
        onOpenStep={(idx: number) => setActiveStep(idx)}
      />

      {/* Forms/Modals rendering depending on active state */}
      <Step1Accounts 
        isOpen={activeStep === 1} 
        onClose={() => setActiveStep(null)} 
        onSuccess={handleStepComplete} 
      />
      <Step2Finances 
        isOpen={activeStep === 2} 
        onClose={() => setActiveStep(null)} 
        onSuccess={handleStepComplete} 
      />
      <Step3Goals 
        isOpen={activeStep === 3} 
        onClose={() => setActiveStep(null)} 
        onSuccess={handleStepComplete} 
      />
      <Step4Retirement 
        isOpen={activeStep === 4} 
        onClose={() => setActiveStep(null)} 
        onSuccess={handleStepComplete} 
      />
      
      {data.allComplete && (
        <div className="mt-8 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-800 text-center flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-2">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-bold text-lg mb-1">Tudo pronto!</h3>
          <p>Sua Bússola Financeira foi montada. Redirecionando para seu painel...</p>
        </div>
      )}
    </div>
  );
}
