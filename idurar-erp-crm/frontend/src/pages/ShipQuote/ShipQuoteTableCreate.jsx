import CreateShipQuoteTableModule from '@/modules/ShipQuoteModule/CreateShipQuoteTableModule';

export default function ShipQuoteTableCreate() {
  const entity = 'shipquote';
  const Labels = {
    PANEL_TITLE: 'Create Ship Quote (Table Form)',
    DATATABLE_TITLE: 'ship quote list',
    ADD_NEW_ENTITY: 'add new ship quote',
    ENTITY_NAME: 'ship quote',
    CREATE_ENTITY: 'save ship quote',
    UPDATE_ENTITY: 'update ship quote',
  };

  const config = {
    entity,
    ...Labels,
  };

  return <CreateShipQuoteTableModule config={config} />;
}


