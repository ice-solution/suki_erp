import CreateSupplierQuoteTableModule from '@/modules/SupplierQuoteModule/CreateSupplierQuoteTableModule';

export default function SupplierQuoteTableCreate() {
  const entity = 'supplierquote';
  const Labels = {
    PANEL_TITLE: 'Create Supplier Quote (Table Form)',
    DATATABLE_TITLE: 'supplier quote list',
    ADD_NEW_ENTITY: 'add new supplier quote',
    ENTITY_NAME: 'supplier quote',
    CREATE_ENTITY: 'save supplier quote',
    UPDATE_ENTITY: 'update supplier quote',
  };

  const config = {
    entity,
    ...Labels,
  };

  return <CreateSupplierQuoteTableModule config={config} />;
}
