"use client";

import React from "react";

interface StatusSteps {
  accounts: boolean;
  finances: boolean;
  goals: boolean;
  retirement: boolean;
}

interface ShellProps {
  steps: StatusSteps;
  progressPercent: number;
  onOpenStep: (stepNumber: number) => void;
}

export function OnboardingShell({ steps, progressPercent, onOpenStep }: ShellProps) {
  
  const stepItems = [
    {
      id: 1,
      tag: 'accounts',
      title: "Conecte suas contas",
      desc: "Comece a mapear seus gastos e otimizar suas despesas",
      isComplete: steps.accounts,
    },
    {
      id: 2,
      tag: 'finances',
      title: "Adicione suas informações financeiras",
      desc: "Cadastre seus investimentos, bens, financiamentos e dívidas",
      isComplete: steps.finances,
    },
    {
      id: 3,
      tag: 'goals',
      title: "Crie seus projetos",
      desc: "Defina seus principais objetivos e quanto precisa investir por mês",
      isComplete: steps.goals,
    },
    {
      id: 4,
      tag: 'retirement',
      title: "Planeje sua aposentadoria",
      desc: "Defina sua visão de independência financeira",
      isComplete: steps.retirement,
    },
  ];

  // SVG parameters
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="flex flex-col lg:flex-row gap-8 w-full bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-gray-200">
      
      {/* Left side: List of steps */}
      <div className="w-full lg:w-[60%] flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo ao FinanceOS</h1>
          <p className="text-gray-500">Configure seu perfil para aproveitar todo o poder da inteligência artificial.</p>
        </div>

        <div className="flex flex-col gap-4 mt-4">
          {stepItems.map((s) => (
            <div 
              key={s.id} 
              onClick={() => onOpenStep(s.id)}
              className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className="mt-1 flex-shrink-0">
                {s.isComplete ? (
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-500 flex items-center justify-center transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <h3 className={`font-semibold ${s.isComplete ? 'text-gray-900 line-through decoration-gray-300 opacity-80' : 'text-gray-900'}`}>
                  {s.id}. {s.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right side: SVG Compass */}
      <div className="w-full lg:w-[40%] flex flex-col items-center justify-center bg-gray-50 rounded-2xl p-8 border border-gray-100">
        <div className="relative flex items-center justify-center">
          <svg className="transform -rotate-90 w-48 h-48 drop-shadow-sm">
            {/* Background track */}
            <circle
              cx="96"
              cy="96"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-gray-200"
            />
            {/* Progress line */}
            <circle
              cx="96"
              cy="96"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-indigo-600 transition-all duration-1000 ease-in-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-bold text-gray-900">{Math.round(progressPercent)}%</span>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-8 max-w-[250px]">
          {progressPercent < 100 
            ? "Complete os passos para desbloquear sua Bússola Financeira" 
            : "Muito bem! Sua bússola está pronta."
          }
        </p>
      </div>

    </div>
  );
}
