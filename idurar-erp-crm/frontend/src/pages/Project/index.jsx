import dayjs from 'dayjs';
import { Tag, Typography } from 'antd';
import ProjectDataTableModule from '@/modules/ProjectModule/ProjectDataTableModule';
import { useMoney, useDate } from '@/settings';
import useLanguage from '@/locale/useLanguage';

const { Text } = Typography;

export default function Project() {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const entity = 'project';
  const { moneyFormatter } = useMoney();

  const searchConfig = {
    entity: 'project',
    displayLabels: ['invoiceNumber', 'description'],
    searchFields: 'invoiceNumber,description',
  };
  const deleteModalLabels = ['invoiceNumber', 'description'];
  
  const dataTableColumns = [
    {
      title: 'Invoice Number',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
    },
    {
      title: translate('Description'),
      dataIndex: 'description',
      key: 'description',
      render: (text) => text || '-',
    },
    {
      title: translate('Cost By'),
      dataIndex: 'costBy',
      key: 'costBy',
      render: (costBy) => (
        <Tag color={costBy === '我方' ? 'blue' : 'green'}>
          {costBy}
        </Tag>
      ),
    },
    {
      title: translate('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusColors = {
          'draft': 'default',
          'pending': 'processing',
          'in_progress': 'blue',
          'completed': 'success',
          'cancelled': 'error',
          'on hold': 'warning'
        };
        return <Tag color={statusColors[status] || 'default'}>{translate(status)}</Tag>;
      },
    },
    {
      title: '成本價',
      dataIndex: 'costPrice',
      key: 'costPrice',
      onCell: () => ({
        style: {
          textAlign: 'right',
          whiteSpace: 'nowrap',
        },
      }),
      render: (amount) => moneyFormatter({ amount: amount || 0 }),
    },
    {
      title: 'S_price',
      dataIndex: 'sPrice',
      key: 'sPrice',
      onCell: () => ({
        style: {
          textAlign: 'right',
          whiteSpace: 'nowrap',
        },
      }),
      render: (amount) => moneyFormatter({ amount: amount || 0 }),
    },
    {
      title: '判頭費',
      dataIndex: 'contractorFee',
      key: 'contractorFee',
      onCell: () => ({
        style: {
          textAlign: 'right',
          whiteSpace: 'nowrap',
        },
      }),
      render: (amount) => moneyFormatter({ amount: amount || 0 }),
    },
    {
      title: '毛利',
      dataIndex: 'grossProfit',
      key: 'grossProfit',
      onCell: () => ({
        style: {
          textAlign: 'right',
          whiteSpace: 'nowrap',
        },
      }),
      render: (amount) => (
        <span style={{ color: amount >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {moneyFormatter({ amount: amount || 0 })}
        </span>
      ),
    },
    {
      title: translate('Start Date'),
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => date ? dayjs(date).format(dateFormat) : '-',
    },
  ];

  const Labels = {
    PANEL_TITLE: translate('project management'),
    DATATABLE_TITLE: translate('project_list'),
    ADD_NEW_ENTITY: translate('add_new_project'),
    ENTITY_NAME: translate('project'),
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
  
  return <ProjectDataTableModule config={config} />;
}
