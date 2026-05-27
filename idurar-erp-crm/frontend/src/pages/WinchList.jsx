import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal, Table, Tag } from 'antd';
import CrudModule from '@/modules/CrudModule/CrudModule';
import AssetStatusSummary from '@/components/AssetStatusSummary';
import { fields } from './WinchList/config';
import WinchForm from './WinchList/WinchForm';
import { request } from '@/request';
import useLanguage from '@/locale/useLanguage';
import { useDate, useMoney } from '@/settings';
import dayjs from 'dayjs';

export default function WinchList() {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const { moneyFormatter } = useMoney();
  const entity = 'winch';

  const [bindingModalOpen, setBindingModalOpen] = useState(false);
  const [bindingLoading, setBindingLoading] = useState(false);
  const [bindingRows, setBindingRows] = useState([]);

  const openBindingHistory = async (winchId) => {
    if (!winchId) return;
    setBindingModalOpen(true);
    setBindingLoading(true);
    setBindingRows([]);
    try {
      const res = await request.get({
        entity: 'winch/bindings',
        params: { winchId },
      });
      if (res?.success) {
        setBindingRows(res.result || []);
      } else {
        setBindingRows([]);
      }
    } catch (err) {
      console.error('查詢 winch bindings 失敗:', err);
      setBindingRows([]);
    } finally {
      setBindingLoading(false);
    }
  };

  const searchConfig = {
    displayLabels: ['serialNumber'],
    searchFields: 'serialNumber,supplierNumber,name,description',
  };
  const deleteModalLabels = ['serialNumber'];

  // 存儲 supplierNumber -> { id, address, invoiceNumber, installationDate, dismantlingDate, receiver } 的映射
  const [supplierQuoteMap, setSupplierQuoteMap] = useState({});

  const isSupplierQuoteCacheComplete = (c) =>
    c &&
    typeof c === 'object' &&
    Object.prototype.hasOwnProperty.call(c, 'installationDate') &&
    Object.prototype.hasOwnProperty.call(c, 'dismantlingDate') &&
    Object.prototype.hasOwnProperty.call(c, 'receiver');

  // 根據 supplierNumber 查找 SupplierQuote（含裝拆日期）
  const findSupplierQuoteInfo = async (supplierNumber) => {
    if (!supplierNumber) return null;
    const cached = supplierQuoteMap[supplierNumber];
    if (isSupplierQuoteCacheComplete(cached)) return cached;

    try {
      const response = await request.search({
        entity: 'supplierquote',
        options: {
          q: supplierNumber,
          fields:
            'numberPrefix,number,address,invoiceNumber,installationDate,dismantlingDate,receiver',
        },
      });

      if (response.success && response.result && response.result.length > 0) {
        const matchedQuote = response.result.find(quote => {
          const quoteNumber = `${quote.numberPrefix || 'S'}-${quote.number}`;
          return quoteNumber === supplierNumber;
        });

        if (matchedQuote) {
          const info = {
            id: matchedQuote._id,
            address: matchedQuote.address || null,
            invoiceNumber: matchedQuote.invoiceNumber || null,
            installationDate: matchedQuote.installationDate || null,
            dismantlingDate: matchedQuote.dismantlingDate || null,
            receiver: matchedQuote.receiver != null ? String(matchedQuote.receiver) : null,
          };
          setSupplierQuoteMap(prev => ({ ...prev, [supplierNumber]: info }));
          return info;
        }
      }
    } catch (error) {
      console.error('查找SupplierQuote失敗:', error);
    }
    return null;
  };

  // 從fields生成基本的列定義
  const getBaseColumns = () => {
    const baseColumns = [];
    
    // 序列號列（唯一識別）
    baseColumns.push({
      title: translate('serialNumber') || '序列號',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      render: (text, record) => (
        <span
          style={{ color: '#1890ff', cursor: 'pointer' }}
          onClick={() => openBindingHistory(record?._id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') openBindingHistory(record?._id);
          }}
        >
          {text || '-'}
        </span>
      ),
    });

    // Status列
    baseColumns.push({
      title: translate('status') || '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusOptions = fields.status.options;
        const selectedOption = statusOptions.find(opt => opt.value === status);
        return (
          <Tag bordered={false} color={selectedOption?.color}>
            {selectedOption?.label || status}
          </Tag>
        );
      },
    });

    // Supplier Quote Number 列（S單編號，可點擊）
    baseColumns.push({
      title: translate('Supplier Quote Number') || 'Supplier Quote Number',
      dataIndex: 'supplierNumber',
      key: 'supplierNumber',
      render: (supplierNumber, record) => {
        if (!supplierNumber || record.status !== 'in_use') {
          return '-';
        }
        const info = supplierQuoteMap[supplierNumber];
        const quoteId =
          info && typeof info === 'object' ? info.id : typeof info === 'string' ? info : null;
        if (quoteId) {
          return (
            <Link
              to={`/supplierquote/read/${quoteId}`}
              style={{ color: '#1890ff', textDecoration: 'none' }}
            >
              {supplierNumber}
            </Link>
          );
        }
        findSupplierQuoteInfo(supplierNumber);
        return (
          <span style={{ color: '#1890ff', cursor: 'pointer' }}>
            {supplierNumber}
          </span>
        );
      },
    });

    // Quote Number 列（報價單編號，S單使用中時顯示）
    baseColumns.push({
      title: 'Quote Number',
      dataIndex: 'supplierNumber',
      key: 'quoteNumber',
      render: (supplierNumber, record) => {
        if (!supplierNumber || record.status !== 'in_use') {
          return '-';
        }
        const info = supplierQuoteMap[supplierNumber];
        if (isSupplierQuoteCacheComplete(info)) {
          return info.invoiceNumber || '-';
        }
        findSupplierQuoteInfo(supplierNumber);
        return '-';
      },
    });

    baseColumns.push({
      title: '簽收單送貨地址',
      dataIndex: 'supplierNumber',
      key: 'receiverAddress',
      width: 220,
      ellipsis: true,
      render: (supplierNumber, record) => {
        if (!supplierNumber || record.status !== 'in_use') {
          return '-';
        }
        const info = supplierQuoteMap[supplierNumber];
        if (isSupplierQuoteCacheComplete(info)) {
          const t = info.receiver;
          return t && String(t).trim() ? String(t) : '-';
        }
        findSupplierQuoteInfo(supplierNumber);
        return '-';
      },
    });

    // 裝拆日期（來自目前綁定之 S 單）
    baseColumns.push({
      title: '安裝日期',
      dataIndex: 'supplierNumber',
      key: 'installationDate',
      width: 120,
      render: (supplierNumber, record) => {
        if (!supplierNumber || record.status !== 'in_use') return '-';
        const info = supplierQuoteMap[supplierNumber];
        if (isSupplierQuoteCacheComplete(info)) {
          const d = info.installationDate;
          return d ? dayjs(d).format(dateFormat) : '-';
        }
        findSupplierQuoteInfo(supplierNumber);
        return '-';
      },
    });
    baseColumns.push({
      title: '拆卸日期',
      dataIndex: 'supplierNumber',
      key: 'dismantlingDate',
      width: 120,
      render: (supplierNumber, record) => {
        if (!supplierNumber || record.status !== 'in_use') return '-';
        const info = supplierQuoteMap[supplierNumber];
        if (isSupplierQuoteCacheComplete(info)) {
          const d = info.dismantlingDate;
          return d ? dayjs(d).format(dateFormat) : '-';
        }
        findSupplierQuoteInfo(supplierNumber);
        return '-';
      },
    });

    // Expired Date列（到期日）：一個月內到期或已過期變色
    baseColumns.push({
      title: translate('expired Date') || '到期日',
      dataIndex: 'expiredDate',
      key: 'expiredDate',
      render: (date) => {
        if (!date) return '-';
        const d = dayjs(date);
        const today = dayjs().startOf('day');
        const diffDays = d.diff(today, 'day');
        const withinOneMonth = diffDays >= -31 && diffDays <= 31;
        const isPast = diffDays < 0;
        let style = {};
        if (withinOneMonth) {
          style = { color: isPast ? '#cf1322' : '#fa8c16', fontWeight: 500 };
        }
        return <span style={style}>{d.format(dateFormat)}</span>;
      },
    });

    // 修改人（最後更新者）
    baseColumns.push({
      title: translate('modified_by') || '修改人',
      dataIndex: 'updatedBy',
      key: 'updatedBy',
      render: (val) => (val && val.name ? val.name : '-'),
    });

    // Project Address列（對應 Supplier Quote 的 address，放最後）
    baseColumns.push({
      title: translate('Project Address') || 'Project Address',
      dataIndex: 'supplierNumber',
      key: 'projectAddress',
      width: 200,
      ellipsis: true,
      render: (supplierNumber, record) => {
        if (!supplierNumber || record.status !== 'in_use') {
          return '-';
        }
        const info = supplierQuoteMap[supplierNumber];
        if (isSupplierQuoteCacheComplete(info)) {
          return info.address || '-';
        }
        findSupplierQuoteInfo(supplierNumber);
        return '-';
      },
    });

    return baseColumns;
  };

  const dataTableColumns = getBaseColumns();

  const Labels = {
    PANEL_TITLE: translate('winch') || '爬纜器管理',
    DATATABLE_TITLE: translate('winch_list') || '爬纜器列表',
    ADD_NEW_ENTITY: translate('add_new_winch') || '添加新爬纜器',
    ENTITY_NAME: translate('winch') || '爬纜器',
  };
  const configPage = {
    entity,
    ...Labels,
  };
  const config = {
    ...configPage,
    dataTableColumns, // 使用自定義列
    searchConfig,
    deleteModalLabels,
    listSummary: <AssetStatusSummary entity={entity} />,
  };
  return (
    <>
      <CrudModule
        createForm={<WinchForm isUpdateForm={false} />}
        updateForm={<WinchForm isUpdateForm={true} />}
        config={config}
      />

      <Modal
        title="S單綁定歷史"
        open={bindingModalOpen}
        onCancel={() => setBindingModalOpen(false)}
        footer={null}
        width={880}
      >
        <Table
          size="small"
          rowKey={(row) => row.bindingId || `${row.supplierQuoteId || 'na'}-${row.created || ''}`}
          loading={bindingLoading}
          pagination={false}
          scroll={{ x: 820 }}
          columns={[
            {
              title: 'Supplier Quote Number',
              dataIndex: 'supplierQuoteNumber',
              key: 'supplierQuoteNumber',
              width: 130,
              render: (val, row) =>
                row?.supplierQuoteId ? (
                  <Link to={`/supplierquote/read/${row.supplierQuoteId}`}>{val}</Link>
                ) : (
                  val || '-'
                ),
            },
            { title: 'Quote Number', dataIndex: 'quoteNumber', key: 'quoteNumber', width: 120, ellipsis: true, render: (v) => v || '-' },
            {
              title: '簽收單送貨地址',
              dataIndex: 'receiverAddress',
              key: 'receiverAddress',
              width: 220,
              ellipsis: true,
              render: (v) => (v && String(v).trim() ? String(v) : '-'),
            },
            {
              title: 'Created',
              dataIndex: 'created',
              key: 'created',
              width: 100,
              render: (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '-'),
            },
            {
              title: '回廠日期',
              dataIndex: 'returnDate',
              key: 'returnDate',
              width: 100,
              render: (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '-'),
            },
            {
              title: '專案地址',
              dataIndex: 'projectAddress',
              key: 'projectAddress',
              width: 180,
              ellipsis: true,
              render: (v) => (v && String(v).trim() ? String(v) : '-'),
            },
          ]}
          dataSource={bindingRows}
        />
      </Modal>
    </>
  );
}





