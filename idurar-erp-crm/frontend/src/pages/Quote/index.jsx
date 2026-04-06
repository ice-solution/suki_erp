import dayjs from 'dayjs';
import { Tag } from 'antd';
import { tagColor } from '@/utils/statusTagColor';
import QuoteDataTableModule from '@/modules/QuoteModule/QuoteDataTableModule';
import { useMoney, useDate } from '@/settings';
import useLanguage from '@/locale/useLanguage';

export default function Quote() {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const entity = 'quote';
  const { moneyFormatter } = useMoney();

  const searchConfig = {
    entity: 'quote',
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
        const quoteType = record.numberPrefix || 'QU';
        return `${quoteType}-${number}`;
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
      title: '制單人',
      dataIndex: 'updatedBy',
      width: 150,
      ellipsis: false,
      render: (_, record) => {
        const u = record.updatedBy || record.createdBy;
        if (!u) return '-';
        const name =
          (u.name || '') + (u.surname ? ` ${u.surname}` : '');
        return (name.trim() || u.email || '-');
      },
    },
    {
      title: translate('Date'),
      dataIndex: 'date',
      width: 110,
      ellipsis: false,
      render: (date) => {
        return dayjs(date).format(dateFormat);
      },
    },
    {
      title: translate('Total'),
      dataIndex: 'total',
      width: 120,
      ellipsis: false,
      onCell: () => {
        return {
          style: {
            textAlign: 'right',
            whiteSpace: 'nowrap',
            direction: 'ltr',
          },
        };
      },
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
        const statusColors = {
          'draft': 'default',
          'pending': 'processing',
          'sent': 'warning',
          'accepted': 'success',
          'declined': 'error',
          'cancelled': 'default',
          'on hold': 'default'
        };
        return <Tag color={statusColors[status] || 'default'}>{translate(status)}</Tag>;
      },
    },
    {
      title: translate('Completed'),
      dataIndex: 'isCompleted',
      width: 90,
      ellipsis: false,
      render: (isCompleted) => {
        return isCompleted ? 
          <Tag color="success">{translate('Yes')}</Tag> : 
          <Tag color="default">{translate('No')}</Tag>;
      },
    },
    {
      title: '轉換狀態',
      dataIndex: 'converted',
      width: 100,
      render: (converted, record) => {
        if (converted && converted.to === 'invoice') {
          return <Tag color="green">已轉Invoice</Tag>;
        }
        return <Tag color="default">未轉換</Tag>;
      },
    },
  ];

  const Labels = {
    PANEL_TITLE: translate('quotation'),
    DATATABLE_TITLE: translate('quotation_list'),
    ADD_NEW_ENTITY: translate('add_new_quotation'),
    ENTITY_NAME: translate('quotation'),
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
  return <QuoteDataTableModule config={config} />;
}
