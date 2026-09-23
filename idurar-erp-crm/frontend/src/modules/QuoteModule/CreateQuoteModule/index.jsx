import { ErpLayout } from '@/layout';
import CreateItem from '@/modules/ErpPanelModule/CreateItem';
import QuoteForm from '@/modules/QuoteModule/Forms/QuoteForm';

export default function CreateQuoteModule({ config }) {
  return (
    <ErpLayout maxWidth={1280}>
      <CreateItem config={config} CreateForm={QuoteForm} />
    </ErpLayout>
  );
}
