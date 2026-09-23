import { ErpLayout } from '@/layout';
import ErpPanel from '@/modules/ErpPanelModule';
import DataTable from './DataTable';

export default function QuoteDataTableModule({ config }) {
  return (
    <ErpLayout maxWidth={1280}>
      <ErpPanel config={config} DataTableModule={DataTable}></ErpPanel>
    </ErpLayout>
  );
}
