import React from 'react';
import { 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend 
} from 'recharts';

interface PieChartProps {
  data: any[];
  nameKey: string;
  valueKey: string;
  title?: string;
  height?: number;
}

const COLORS = [
  '#DC2626', // Crimson Red
  '#1A1A1A', // Jet Black
  '#4B5563', // Slate Gray
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
];

export function PieChart({ 
  data, 
  nameKey, 
  valueKey, 
  title, 
  height = 300 
}: PieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg p-6 bg-gray-50/50">
        <p className="text-sm font-medium text-gray-400">No data available for {title || 'chart'}</p>
      </div>
    );
  }

  // Ensure data structure matches Recharts expectations
  const formattedData = data.map(item => ({
    name: item[nameKey],
    value: Number(item[valueKey]) || 0
  })).filter(item => item.value > 0);

  if (formattedData.length === 0) {
    return (
      <div style={{ height }} className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg p-6 bg-gray-50/50">
        <p className="text-sm font-medium text-gray-400">No positive metrics available for {title || 'chart'}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">{title}</h4>}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={formattedData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#1A1A1A', 
                border: 'none', 
                borderRadius: '6px',
                color: '#FFF',
                fontSize: '12px'
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', color: '#4B5563' }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
