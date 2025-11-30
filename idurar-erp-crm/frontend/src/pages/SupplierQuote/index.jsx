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
    entity: 'client',
    displayLabels: ['name'],
    searchFields: 'name',
  };
  const deleteModalLabels = ['number', 'clients.name'];
  const dataTableColumns = [
    {
      title: translate('Number'),
      dataIndex: 'number',
      render: (number, record) => {
        const quoteType = record.numberPrefix || 'QU';
        return `${quoteType}-${number}`;
      },
    },
    {
      title: translate('Clients'),
      dataIndex: 'clients',
      render: (clients, record) => {
        // 處理新舊數據格式
        let clientsToShow = [];
        
        // 新格式：clients數組
        if (clients && Array.isArray(clients) && clients.length > 0) {
          clientsToShow = clients;
        }
        // 舊格式：單個client字段
        else if (record.client && record.client.name) {
          clientsToShow = [record.client];
        }
        // 如果clients存在但不是數組（可能是單個對象）
        else if (clients && clients.name) {
          clientsToShow = [clients];
        }
        
        if (clientsToShow.length === 0) return '-';
        if (clientsToShow.length === 1) return clientsToShow[0].name;
        
        return (
          <div>
            {clientsToShow.slice(0, 2).map((client, index) => (
              <Tag key={client._id || index} style={{ marginBottom: 2 }}>
                {client.name}
              </Tag>
            ))}
            {clientsToShow.length > 2 && (
              <Tag style={{ marginBottom: 2 }}>
                +{clientsToShow.length - 2} more
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: translate('Date'),
      dataIndex: 'date',
      render: (date) => {
        return dayjs(date).format(dateFormat);
      },
    },
    {
      title: translate('expired Date'),
      dataIndex: 'expiredDate',
      render: (date) => {
        return date ? dayjs(date).format(dateFormat) : '-';
      },
    },
    {
      title: translate('Total'),
      dataIndex: 'total',
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
      title: translate('Status'),
      dataIndex: 'status',
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
      render: (isCompleted) => {
        return isCompleted ? 
          <Tag color="success">{translate('Yes')}</Tag> : 
          <Tag color="default">{translate('No')}</Tag>;
      },
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
