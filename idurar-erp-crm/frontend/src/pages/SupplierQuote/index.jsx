import dayjs from 'dayjs';
import { Tag } from 'antd';
import { tagColor } from '@/utils/statusTagColor';
import SupplierQuoteDataTableModule from '@/modules/SupplierQuoteModule/SupplierQuoteDataTableModule';
import { useMoney, useDate } from '@/settings';
import useLanguage from '@/locale/useLanguage';

export default function SupplierQuote() {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const entity = 'supplierquote';
  const { moneyFormatter } = useMoney();

  const searchConfig = {
    entity: 'supplierquote',
    displayLabels: ['address', 'invoiceNumber'],
    searchFields: 'address,invoiceNumber,contactPerson',
  };
  const deleteModalLabels = ['number', 'clients.name'];
  const dataTableColumns = [
    {
      title: translate('Number'),
      dataIndex: 'number',
      width: 120,
      ellipsis: false,
      render: (number, record) => {
        const quoteType = record.numberPrefix && record.numberPrefix !== 'XX' ? record.numberPrefix : 'QU';
        return `${quoteType}-${number}`;
      },
    },
    {
      title: 'Quote Number',
      dataIndex: 'invoiceNumber',
      width: 130,
      ellipsis: false,
      render: (invoiceNumber) => invoiceNumber || '-',
    },
    {
      title: translate('Clients'),
      dataIndex: 'clients',
      width: 200,
      ellipsis: false,
      render: (clients, record) => {
        let clientsToShow = [];
        if (clients && Array.isArray(clients) && clients.length > 0) clientsToShow = clients;
        else if (record.client && record.client.name) clientsToShow = [record.client];
        else if (clients && clients.name) clientsToShow = [clients];
        if (clientsToShow.length === 0) return '-';
        const names = clientsToShow.map(c => c.name).filter(Boolean);
        if (names.length === 1) return names[0];
        return `${names.slice(0, 3).join('、')}${names.length > 3 ? ` +${names.length - 3}` : ''}`;
      },
    },
    {
      title: translate('suppliers'),
      dataIndex: ['supplier', 'name'],
      width: 150,
      ellipsis: false,
      render: (name, record) => record.supplier?.name || '-',
    },
    {
      title: translate('Date'),
      dataIndex: 'date',
      width: 110,
      ellipsis: false,
      render: (date) => dayjs(date).format(dateFormat),
    },
    {
      title: translate('Total'),
      dataIndex: 'total',
      width: 120,
      ellipsis: false,
      onCell: () => ({ style: { textAlign: 'right', whiteSpace: 'nowrap', direction: 'ltr' } }),
      render: (total, record) => moneyFormatter({ amount: total, currency_code: record.currency }),
    },
    {
      title: translate('Address'),
      dataIndex: 'address',
      width: 180,
      ellipsis: false,
      render: (address) => address || '-',
    },
    {
      title: translate('Contact Person'),
      dataIndex: 'contactPerson',
      width: 100,
      ellipsis: false,
      render: (contactPerson) => contactPerson || '-',
    },
    {
      title: translate('Status'),
      dataIndex: 'status',
      width: 100,
      ellipsis: false,
      render: (status) => {
        const statusColors = { draft: 'default', pending: 'processing', sent: 'warning', accepted: 'success', declined: 'error', cancelled: 'default', 'on hold': 'default' };
        return <Tag color={statusColors[status] || 'default'}>{translate(status)}</Tag>;
      },
    },
    {
      title: translate('Completed'),
      dataIndex: 'isCompleted',
      width: 90,
      ellipsis: false,
      render: (isCompleted) => (isCompleted ? <Tag color="success">{translate('Yes')}</Tag> : <Tag color="default">{translate('No')}</Tag>),
    },
  ];

  const Labels = {
    PANEL_TITLE: translate('supplier quotation'),
    DATATABLE_TITLE: translate('supplier quotation_list'),
    ADD_NEW_ENTITY: translate('add_new_supplier quotation'),
    ENTITY_NAME: translate('supplier quotation'),
  };

  const configPage = {
    entity,
    ...Labels,
  };
  const config = {
    ...configPage,
    dataTableColumns,
    searchConfig,
    deleteModalLabels,
  };
  return <SupplierQuoteDataTableModule config={config} />;
}
