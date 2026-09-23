const Table = ({
  columns,
  renderRow,
  data,
  empty = "Nothing here yet.",
}: {
  columns: { header: string; accessor: string; className?: string }[];
  renderRow: (item: any) => React.ReactNode;
  data: any[];
  empty?: string;
}) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full mt-4">
        <thead>
          <tr className="text-left text-gray-500 text-sm">
            {columns.map((col) => (
              <th key={col.accessor} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length ? (
            data.map((item) => renderRow(item))
          ) : (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-sm text-gray-400">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
