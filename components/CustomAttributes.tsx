'use client';

import { useEffect, useState } from 'react';
import { User, GraduationCap, ClipboardList, Info } from 'lucide-react';

interface CustomAttrDef {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean';
}

interface Props {
  attributes: Record<string, any> | null;
  theme?: 'blue' | 'green' | 'purple';
}

export default function CustomAttributes({ attributes, theme = 'blue' }: Props) {
  const [defs, setDefs] = useState<CustomAttrDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDefs() {
      try {
        // We fetch the definitions from the public settings or common API
        // Since MOE settings are protected, we might need a public/common settings API
        // For now, let's assume we can fetch them or pass them as props.
        // Actually, fetching them here is more dynamic.
        const res = await fetch('/api/common/settings?key=student_custom_attributes');
        const data = await res.json();
        if (data.success && data.value) {
          setDefs(data.value);
        }
      } catch (err) {
        console.error('Failed to fetch attribute definitions:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDefs();
  }, []);

  if (!attributes || Object.keys(attributes).length === 0) return null;

  const themeColors = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      border: 'border-blue-100'
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      border: 'border-green-100'
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      border: 'border-purple-100'
    }
  };

  const colors = themeColors[theme];

  return (
    <div className="mt-8">
      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Info className={`w-4 h-4 ${colors.icon}`} />
        Additional Information
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {defs.map((def) => {
          const value = attributes[def.name];
          if (value === undefined || value === null) return null;

          return (
            <div key={def.name} className={`p-3 ${colors.bg} rounded-lg flex items-start gap-3 border ${colors.border}`}>
              <ClipboardList className="w-4 h-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">{def.label}</p>
                <p className="font-medium text-sm">
                  {def.type === 'boolean' ? (value ? 'Yes' : 'No') : value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
