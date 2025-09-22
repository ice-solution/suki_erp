import UpdateQuoteTableModule from '@/modules/QuoteModule/UpdateQuoteTableModule';

export default function QuoteTableUpdate() {
  const entity = 'quote';
  const Labels = {
    PANEL_TITLE: 'Update Quote (Table Form)',
    DATATABLE_TITLE: 'quote list',
    ADD_NEW_ENTITY: 'add new quote',
    ENTITY_NAME: 'quote',
    CREATE_ENTITY: 'save quote',
    UPDATE_ENTITY: 'update quote',
  };

  const config = {
    entity,
    ...Labels,
  };

  return <UpdateQuoteTableModule config={config} />;
}
