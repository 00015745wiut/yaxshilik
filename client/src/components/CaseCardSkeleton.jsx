export default function CaseCardSkeleton() {
  return (
    <div className="flex flex-col bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
      <div className="aspect-video bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="space-y-1.5 pt-1">
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>
        <div className="h-2.5 bg-gray-200 rounded-full w-full mt-2" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-10 bg-gray-200 rounded-lg mt-1" />
      </div>
    </div>
  );
}
