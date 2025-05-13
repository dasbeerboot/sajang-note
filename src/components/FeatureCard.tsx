import { ReactNode } from 'react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: ReactNode;
}

export default function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="card bg-base-300">
      <div className="card-body">
        <div className="flex justify-center mb-4">{icon}</div>
        <h3 className="card-title justify-center">{title}</h3>
        <p className="text-center">{description}</p>
      </div>
    </div>
  );
}
