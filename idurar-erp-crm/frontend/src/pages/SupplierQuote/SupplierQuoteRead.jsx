import useLanguage from '@/locale/useLanguage';
import ReadSupplierQuoteModule from '@/modules/SupplierQuoteModule/ReadSupplierQuoteModule';

export default function SupplierQuoteRead() {
  const translate = useLanguage();

  const entity = 'supplierquote';

  const Labels = {
    PANEL_TITLE: translate('supplier quote'),
    DATATABLE_TITLE: translate('supplier quote_list'),
    ADD_NEW_ENTITY: translate('add_new_supplier quote'),
    ENTITY_NAME: translate('supplier quote'),
  };

  const configPage = {
    entity,
    ...Labels,
  };
  return <ReadSupplierQuoteModule config={configPage} />;
}
