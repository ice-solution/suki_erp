import UpdateSupplierQuoteTableModule from '@/modules/SupplierQuoteModule/UpdateSupplierQuoteTableModule';

export default function SupplierQuoteTableUpdate() {
  const entity = 'supplierquote';
  const Labels = {
    PANEL_TITLE: 'Update Supplier Quote (Table Form)',
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

  return <UpdateSupplierQuoteTableModule config={config} />;
}
