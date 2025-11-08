import dayjs from 'dayjs';
import { Tag } from 'antd';
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
      render: (number, record) => {
        const prefix = record.numberPrefix || 'INV';
        return `${prefix}-${number}`;
      },
    },
    {
      title: translate('Clients'),
      dataIndex: 'clients',
      render: (clients, record) => {
        let clientsToShow = [];
        
        // New format: clients array
        if (clients && Array.isArray(clients) && clients.length > 0) {
          clientsToShow = clients;
        }
        // Old format: single client field
        else if (record.client && record.client.name) {
          clientsToShow = [record.client];
        }
        // If clients exists but is not an array (might be a single object)
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
        return dayjs(date).format(dateFormat);
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
      render: (total, record) => {
        return moneyFormatter({ amount: total, currency_code: record.currency });
      },
    },
    {
      title: translate('Address'),
      dataIndex: 'address',
      render: (address) => address || '-',
      width: 150,
      ellipsis: true,
    },
    {
      title: translate('Contact Person'),
      dataIndex: 'contactPerson',
      render: (contactPerson) => contactPerson || '-',
      width: 120,
    },
    {
      title: translate('paid'),
      dataIndex: 'credit',
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
    },
    {
      title: translate('Payment'),
      dataIndex: 'paymentStatus',
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
