import CreateQuoteTableModule from '@/modules/QuoteModule/CreateQuoteTableModule';

export default function QuoteTableCreate() {
  const entity = 'quote';
  const Labels = {
    PANEL_TITLE: 'Create Quote (Table Form)',
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

  return <CreateQuoteTableModule config={config} />;
}
