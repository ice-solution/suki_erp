import ReadShipQuoteModule from '@/modules/ShipQuoteModule/ReadShipQuoteModule';

export default function ShipQuoteRead() {
  const entity = 'shipquote';
  const Labels = {
    PANEL_TITLE: 'Ship Quote Details',
    DATATABLE_TITLE: 'ship quote list',
    ADD_NEW_ENTITY: 'add new ship quote',
    ENTITY_NAME: 'ship quote',
  };

  const config = {
    entity,
    ...Labels,
  };

  return <ReadShipQuoteModule config={config} />;
}


