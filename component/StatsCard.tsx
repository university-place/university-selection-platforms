'use client';

interface StatsCardProps {
  label: string;
  value: number | string;
  icon?: string;
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'red';
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  green: 'bg-green-100 text-green-700',
  orange: 'bg-orange-100 text-orange-700',
  red: 'bg-red-100 text-red-700',
};

export function StatsCard({
  label,
  value,
  icon,
  color = 'blue',
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <span className="text-2xl">{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
