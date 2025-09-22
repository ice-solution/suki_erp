import useLanguage from '@/locale/useLanguage';
import CreateInvoiceTableModule from '@/modules/InvoiceModule/CreateInvoiceTableModule';

export default function InvoiceTableCreate() {
  const entity = 'invoice';
  const translate = useLanguage();
  const Labels = {
    PANEL_TITLE: translate('invoice'),
    DATATABLE_TITLE: translate('invoice_list'),
    ADD_NEW_ENTITY: translate('add_new_invoice'),
    ENTITY_NAME: translate('invoice'),
    CREATE_ENTITY: translate('save_invoice'),
  };

  const configPage = {
    entity,
    ...Labels,
  };
  return <CreateInvoiceTableModule config={configPage} />;
}
