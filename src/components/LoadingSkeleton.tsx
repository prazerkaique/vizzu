import React from 'react';

interface LoadingSkeletonProps {
  theme?: 'dark' | 'light';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ theme = 'dark' }) => {
  const isDark = theme === 'dark';

  return (
    <div className={'flex-1 overflow-y-auto p-4 md:p-6 ' + (isDark ? 'bg-black' : 'bg-gray-50')}>
      <div className="max-w-6xl mx-auto animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-200') + ' w-10 h-10 rounded-xl'}></div>
            <div>
              <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-200') + ' h-5 w-40 rounded mb-2'}></div>
              <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-200') + ' h-3 w-28 rounded'}></div>
            </div>
          </div>
          <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-200') + ' h-10 w-24 rounded-lg'}></div>
        </div>

        {/* Card skeleton */}
        <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-4 mb-4'}>
          <div className="flex items-start gap-4">
            <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-200') + ' w-12 h-12 rounded-xl'}></div>
            <div className="flex-1">
              <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-200') + ' h-4 w-48 rounded mb-2'}></div>
              <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-200') + ' h-3 w-full rounded mb-1'}></div>
              <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-200') + ' h-3 w-3/4 rounded'}></div>
            </div>
          </div>
        </div>

        {/* Grid skeleton */}
        <div className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200') + ' rounded-xl border p-4'}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-xl overflow-hidden'}>
                <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-200') + ' aspect-square'}></div>
                <div className="p-2.5">
                  <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-200') + ' h-2 w-12 rounded mb-2'}></div>
                  <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-200') + ' h-3 w-full rounded'}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Skeleton para grid de produtos (usado em vários lugares)
export const ProductGridSkeleton: React.FC<{ theme?: 'dark' | 'light'; count?: number }> = ({
  theme = 'dark',
  count = 20
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-3 animate-pulse">
      {[...Array(count)].map((_, i) => (
        <div key={i} className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' rounded-lg overflow-hidden'}>
          <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-200') + ' aspect-square'}></div>
          <div className="p-2">
            <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-200') + ' h-2 w-10 rounded mb-1.5'}></div>
            <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-200') + ' h-2.5 w-full rounded'}></div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Skeleton para grid de modelos (cards portrait 3/4)
export const ModelGridSkeleton: React.FC<{ theme?: 'dark' | 'light'; count?: number }> = ({
  theme = 'dark',
  count = 8
}) => {
  const isDark = theme === 'dark';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
      {[...Array(count)].map((_, i) => (
        <div key={i} className={(isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-100') + ' rounded-2xl border overflow-hidden'}>
          <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' aspect-[3/4]'}></div>
          <div className="p-3">
            <div className={(isDark ? 'bg-neutral-700' : 'bg-gray-200') + ' h-3.5 w-20 rounded mb-2'}></div>
            <div className="flex gap-1">
              <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' h-4 w-12 rounded'}></div>
              <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' h-4 w-10 rounded'}></div>
              <div className={(isDark ? 'bg-neutral-800' : 'bg-gray-100') + ' h-4 w-14 rounded'}></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
