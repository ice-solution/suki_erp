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
    // 可用單號/關鍵字搵 project：
    // - Quote number（目前 Project.invoiceNumber）
    // - Project name / address / P.O number
    // - EO 單（usedContractorFees.eoNumber / usedContractorFees.invoiceNo）
    // - 另外後端亦會用 S/SML/SMI 等關聯單據號反查 project
    displayLabels: ['invoiceNumber', 'name'],
    searchFields:
      'invoiceNumber,name,address,poNumber,usedContractorFees.eoNumber,usedContractorFees.invoiceNo',
  };
  const deleteModalLabels = ['invoiceNumber', 'name'];
  
  const dataTableColumns = [
    {
      title: 'Quote Number',
      dataIndex: 'invoices',
      key: 'quoteNumber',
      render: (_, record) => {
        const acceptedShip = (record?.shipQuotations || []).find((q) => q?.isCompleted === true);
        if (acceptedShip) {
          if (acceptedShip.invoiceNumber) return acceptedShip.invoiceNumber;
          if (acceptedShip.numberPrefix && acceptedShip.number) {
            return `${acceptedShip.numberPrefix}-${acceptedShip.number}`;
          }
        }

        const acceptedQuotation = (record?.quotations || []).find((q) => q?.status === 'accepted');
        if (acceptedQuotation) {
          if (acceptedQuotation.invoiceNumber) return acceptedQuotation.invoiceNumber;
          if (acceptedQuotation.numberPrefix && acceptedQuotation.number) {
            return `${acceptedQuotation.numberPrefix}-${acceptedQuotation.number}`;
          }
        }

        // Project.invoiceNumber 在此頁面實際上也存的是 Quote Number
        return record?.invoiceNumber || '-';
      },
    },
    {
      title: translate('Project Name'),
      dataIndex: 'name',
      key: 'name',
      render: (text) => text || '-',
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
      dataIndex: 'contractorFees',
      key: 'contractorFee',
      onCell: () => ({
        style: {
          textAlign: 'right',
          whiteSpace: 'nowrap',
        },
      }),
      render: (contractorFees, record) => {
        // 支持新格式（contractorFees 數組）和舊格式（contractorFee 單一值）
        let totalFee = 0;
        if (contractorFees && Array.isArray(contractorFees) && contractorFees.length > 0) {
          totalFee = contractorFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
        } else if (record.contractorFee !== undefined) {
          totalFee = record.contractorFee || 0;
        }
        return moneyFormatter({ amount: totalFee });
      },
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
