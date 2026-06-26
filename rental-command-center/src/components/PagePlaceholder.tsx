import React from 'react';

interface PagePlaceholderProps {
  title: string;
  description: string;
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-lg text-gray-600 mb-6">{description}</p>
      <div className="bg-gray-100 border border-gray-200 rounded-lg p-8 w-full max-w-2xl border-dashed">
        <p className="text-gray-500 font-medium text-sm tracking-wide uppercase">Content coming soon...</p>
      </div>
    </div>
  );
}
