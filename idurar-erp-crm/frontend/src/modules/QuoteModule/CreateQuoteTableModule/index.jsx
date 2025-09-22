import { ErpLayout } from '@/layout';
import CreateItem from '@/modules/ErpPanelModule/CreateItem';
import QuoteTableForm from '@/modules/QuoteModule/Forms/QuoteTableForm';

export default function CreateQuoteTableModule({ config }) {
  return (
    <ErpLayout>
      <CreateItem config={config} CreateForm={QuoteTableForm} />
    </ErpLayout>
  );
}
