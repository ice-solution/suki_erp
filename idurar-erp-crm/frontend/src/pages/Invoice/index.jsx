import dayjs from 'dayjs';
import { Tag } from 'antd';
import { Link } from 'react-router-dom';
import useLanguage from '@/locale/useLanguage';
import { tagColor } from '@/utils/statusTagColor';

import { useMoney, useDate } from '@/settings';
import InvoiceDataTableModule from '@/modules/InvoiceModule/InvoiceDataTableModule';
import { ErpLayout } from '@/layout';

export default function Invoice() {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const entity = 'invoice';
  const { moneyFormatter } = useMoney();

  const searchConfig = {
    entity: 'invoice',
    displayLabels: ['address', 'invoiceNumber'],
    searchFields: 'address,invoiceNumber,contactPerson',
  };
  const deleteModalLabels = ['number', 'client.name'];
  const dataTableColumns = [
    {
      title: translate('Number'),
      dataIndex: 'number',
      width: 120,
      ellipsis: false,
      render: (number, record) => {
        const quoteType = record.numberPrefix || 'SMI';
        const label = `${quoteType}-${number}`;
        if (!record._id) return label;
        return (
          <Link to={`/invoice/read/${record._id}`} onClick={(e) => e.stopPropagation()}>
            {label}
          </Link>
        );
      },
    },
    {
      title: translate('Clients'),
      dataIndex: 'clients',
      width: 200,
      ellipsis: false,
      render: (clients, record) => {
        let clientsToShow = [];
        if (clients && Array.isArray(clients) && clients.length > 0) {
          clientsToShow = clients;
        } else if (record.client && record.client.name) {
          clientsToShow = [record.client];
        } else if (clients && clients.name) {
          clientsToShow = [clients];
        }
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
      title: translate('paid'),
      dataIndex: 'credit',
      width: 120,
      ellipsis: false,
      onCell: () => ({ style: { textAlign: 'right', whiteSpace: 'nowrap', direction: 'ltr' } }),
      render: (total, record) => moneyFormatter({ amount: total, currency_code: record.currency }),
    },
    {
      title: translate('Status'),
      dataIndex: 'status',
      width: 100,
      ellipsis: false,
      render: (status) => {
        const statusColors = { draft: 'default', pending: 'processing', sent: 'warning', paid: 'success', overdue: 'error', cancelled: 'default', refunded: 'default' };
        return <Tag color={statusColors[status] || 'default'}>{translate(status)}</Tag>;
      },
    },
    {
      title: translate('Payment'),
      dataIndex: 'paymentStatus',
      width: 100,
      ellipsis: false,
      render: (paymentStatus) => {
        const colors = { paid: 'success', pending: 'processing', overdue: 'error', cancelled: 'default', refunded: 'default' };
        return <Tag color={colors[paymentStatus] || 'default'}>{translate(paymentStatus)}</Tag>;
      },
    },
  ];

  const Labels = {
    PANEL_TITLE: translate('invoice'),
    DATATABLE_TITLE: translate('invoice_list'),
    ADD_NEW_ENTITY: translate('add_new_invoice'),
    ENTITY_NAME: translate('invoice'),

    RECORD_ENTITY: translate('record_payment'),
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

  return (
    <ErpLayout>
      <InvoiceDataTableModule config={config} />
    </ErpLayout>
  );
}
