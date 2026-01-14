import { ErpLayout } from '@/layout';
import ErpPanel from '@/modules/ErpPanelModule';
import DataTable from './DataTable';

export default function ShipQuoteDataTableModule({ config }) {
  return (
    <ErpLayout>
      <ErpPanel config={config} DataTableModule={DataTable}></ErpPanel>
    </ErpLayout>
  );
}



