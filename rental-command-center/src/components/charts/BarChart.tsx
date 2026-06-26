import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface BarChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  title?: string;
  color?: string;
  height?: number;
}

export function BarChart({ 
  data, 
  xKey, 
  yKey, 
  title, 
  color = '#DC2626', 
  height = 300 
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg p-6 bg-gray-50/50">
        <p className="text-sm font-medium text-gray-400">No data available for {title || 'chart'}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">{title}</h4>}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis 
              dataKey={xKey} 
              stroke="#9CA3AF" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#9CA3AF" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false}
              dx={-10}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1A1A1A', 
                border: 'none', 
                borderRadius: '6px',
                color: '#FFF',
                fontSize: '12px'
              }}
              labelStyle={{ fontWeight: 'bold', color: '#EF4444' }}
            />
            <Bar 
              dataKey={yKey} 
              fill={color} 
              radius={[4, 4, 0, 0]} 
              maxBarSize={45}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
