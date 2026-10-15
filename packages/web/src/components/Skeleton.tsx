export function Skeleton() {
  return (
    <div className="bg-white dark:bg-lms-dark-card rounded-2xl border border-lms-border dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="h-32 bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
      <div className="p-5">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4 animate-pulse"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-4 animate-pulse"></div>
        <div className="flex justify-between mt-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
