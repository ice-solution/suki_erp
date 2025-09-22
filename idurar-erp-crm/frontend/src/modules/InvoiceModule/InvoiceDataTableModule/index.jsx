import ErpPanel from '@/modules/ErpPanelModule';
import InvoiceDataTable from './DataTable';

export default function InvoiceDataTableModule({ config }) {
  return <ErpPanel config={config} DataTableModule={InvoiceDataTable} />;
}