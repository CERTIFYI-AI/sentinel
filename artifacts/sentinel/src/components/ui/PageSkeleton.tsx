import React from 'react';

interface PageSkeletonProps {
  title?: string;
  rows?: number;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({ title, rows = 5 }) => {
  return (
    <div className="animate-pulse space-y-4 p-6">
      {title && (
        <div className="h-8 bg-gray-200 rounded w-1/3 dark:bg-gray-700" />
      )}
      <div className="h-4 bg-gray-200 rounded w-2/3 dark:bg-gray-700" />
      <div className="grid grid-cols-4 gap-4 mt-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-gray-200 rounded dark:bg-gray-700" />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded dark:bg-gray-700" />
        ))}
      </div>
    </div>
  );
};

export default PageSkeleton;
