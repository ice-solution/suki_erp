import { ErpLayout } from '@/layout';
import CreateItem from '@/modules/ErpPanelModule/CreateItem';
import ShipQuoteTableForm from '@/modules/ShipQuoteModule/Forms/ShipQuoteTableForm';

export default function CreateShipQuoteTableModule({ config }) {
  return (
    <ErpLayout>
      <CreateItem config={config} CreateForm={ShipQuoteTableForm} />
    </ErpLayout>
  );
}









