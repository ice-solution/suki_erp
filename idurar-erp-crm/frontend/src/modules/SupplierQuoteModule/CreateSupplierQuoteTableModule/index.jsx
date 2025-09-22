import { ErpLayout } from '@/layout';
import CreateItem from '@/modules/ErpPanelModule/CreateItem';
import SupplierQuoteTableForm from '@/modules/SupplierQuoteModule/Forms/SupplierQuoteTableForm';

export default function CreateSupplierQuoteTableModule({ config }) {
  return (
    <ErpLayout>
      <CreateItem config={config} CreateForm={SupplierQuoteTableForm} />
    </ErpLayout>
  );
}
