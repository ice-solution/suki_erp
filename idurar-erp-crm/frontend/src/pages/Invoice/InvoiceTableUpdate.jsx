import useLanguage from '@/locale/useLanguage';
import UpdateInvoiceTableModule from '@/modules/InvoiceModule/UpdateInvoiceTableModule';

export default function InvoiceTableUpdate() {
  const entity = 'invoice';
  const translate = useLanguage();
  const Labels = {
    PANEL_TITLE: translate('invoice'),
    DATATABLE_TITLE: translate('invoice_list'),
    ADD_NEW_ENTITY: translate('add_new_invoice'),
    ENTITY_NAME: translate('invoice'),
    UPDATE_ENTITY: translate('update_invoice'),
  };

  const configPage = {
    entity,
    ...Labels,
  };
  return <UpdateInvoiceTableModule config={configPage} />;
}
