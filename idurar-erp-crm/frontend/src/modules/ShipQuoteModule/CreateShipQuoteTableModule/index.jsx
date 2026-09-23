import { ErpLayout } from '@/layout';
import CreateItem from '@/modules/ErpPanelModule/CreateItem';
import ShipQuoteTableForm from '@/modules/ShipQuoteModule/Forms/ShipQuoteTableForm';

export default function CreateShipQuoteTableModule({ config }) {
  return (
    <ErpLayout maxWidth={1280}>
      <CreateItem config={config} CreateForm={ShipQuoteTableForm} />
    </ErpLayout>
  );
}









