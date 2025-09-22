import { ErpLayout } from '@/layout';
import CreateItem from '@/modules/ErpPanelModule/CreateItem';
import InvoiceTableForm from '@/modules/InvoiceModule/Forms/InvoiceTableForm';

export default function CreateInvoiceTableModule({ config }) {
  return (
    <ErpLayout>
      <CreateItem config={config} CreateForm={InvoiceTableForm} />
    </ErpLayout>
  );
}
