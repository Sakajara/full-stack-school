const Spinner = ({ label = "Loading..." }: { label?: string }) => (
  <div className="flex items-center justify-center gap-3 p-8 text-sm text-gray-400" role="status">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500" />
    {label}
  </div>
);

export default Spinner;
