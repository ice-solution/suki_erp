import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, message, Popconfirm, Table, Tabs } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ErpLayout } from '@/layout';
import { request } from '@/request';
import { useMoney, useDate } from '@/settings';
import { useFollowUpDisplayName } from '@/hooks/useFollowUpDisplayName';
import { adminDisplayName } from '@/utils/adminDisplayName';
import { useCanRestoreDeletedRecords } from '@/hooks/useCanRestoreDeletedRecords';

const TAB_ITEMS = [
  { key: 'quote', label: '報價單' },
  { key: 'shipquote', label: '吊船報價' },
  { key: 'supplierquote', label: 'S 單' },
  { key: 'invoice', label: '發票' },
];

function resolveClientNames(record) {
  let clientsToShow = [];
  if (record.clients && Array.isArray(record.clients) && record.clients.length > 0) {
    clientsToShow = record.clients;
  } else if (record.client && record.client.name) {
    clientsToShow = [record.client];
  } else if (record.clients && record.clients.name) {
    clientsToShow = [record.clients];
  }
  if (clientsToShow.length === 0 && record.supplier?.name) {
    return record.supplier.name;
  }
  const names = clientsToShow.map((c) => c.name).filter(Boolean);
  if (names.length === 0) return '-';
  if (names.length === 1) return names[0];
  return `${names.slice(0, 3).join('、')}${names.length > 3 ? ` +${names.length - 3}` : ''}`;
}

function resolveDocNumber(record, entity) {
  const prefix =
    record.numberPrefix ||
    (entity === 'invoice' ? 'SMI' : entity === 'shipquote' ? 'SML' : entity === 'supplierquote' ? 'S' : 'QU');
  return `${prefix}-${record.number || ''}`;
}

function DeletedRecordsTable({ entity, followUpDisplayName }) {
  const { dateFormat } = useDate();
  const { moneyFormatter } = useMoney();
  const canRestore = useCanRestoreDeletedRecords();
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchValue, setSearchValue] = useState('');

  const fetchList = useCallback(
    async (page = 1, pageSize = 10, q = '') => {
      setLoading(true);
      try {
        const data = await request.get({
          entity: 'deleted-records/list',
          params: { entity, page, items: pageSize, q: q.trim() || undefined },
        });
        setRows(Array.isArray(data?.result) ? data.result : []);
        const p = data?.pagination || {};
        setPagination({
          current: Number(p.page) || page,
          pageSize,
          total: Number(p.count) || 0,
        });
      } finally {
        setLoading(false);
      }
    },
    [entity]
  );

  useEffect(() => {
    fetchList(1, pagination.pageSize, searchValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  const handleRestore = async (record) => {
    if (!record?._id) return;
    setRestoringId(record._id);
    try {
      const data = await request.post({
        entity: 'deleted-records/restore',
        jsonData: { entity, id: record._id },
      });
      if (data?.success) {
        message.success(data.message || '還原成功');
        fetchList(pagination.current, pagination.pageSize, searchValue);
      } else {
        message.error(data?.message || '還原失敗');
      }
    } catch (err) {
      message.error(err?.response?.data?.message || err?.message || '還原失敗');
    } finally {
      setRestoringId(null);
    }
  };

  const columns = [
    {
      title: '單號',
      key: 'number',
      width: 130,
      render: (_, record) => resolveDocNumber(record, entity),
    },
    {
      title: '報價編號',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 140,
      render: (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : '-'),
    },
    {
      title: entity === 'supplierquote' ? '供應商' : '客戶',
      key: 'clients',
      width: 200,
      ellipsis: true,
      render: (_, record) => resolveClientNames(record),
    },
    {
      title: '修改人',
      key: 'updatedBy',
      width: 120,
      render: (_, record) => adminDisplayName(record.updatedBy) || '-',
    },
    {
      title: '跟單人',
      key: 'followUpBy',
      width: 120,
      render: (_, record) => followUpDisplayName(record),
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      render: (date) => (date ? dayjs(date).format(dateFormat) : '-'),
    },
    {
      title: '總額',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right',
      render: (total, record) =>
        total != null ? moneyFormatter({ amount: total, currency_code: record.currency }) : '-',
    },
    {
      title: '刪除時間',
      key: 'deletedAt',
      width: 130,
      render: (_, record) => {
        const t = record.modified_at || record.updated;
        return t ? dayjs(t).format(`${dateFormat} HH:mm`) : '-';
      },
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      render: (address) => address || '-',
    },
    ...(canRestore
      ? [
          {
            title: '操作',
            key: 'action',
            width: 100,
            fixed: 'right',
            render: (_, record) => (
              <Popconfirm
                title="確定還原此單？"
                description={`${resolveDocNumber(record, entity)} 將重新出現在列表中`}
                okText="還原"
                cancelText="取消"
                onConfirm={() => handleRestore(record)}
              >
                <Button
                  type="link"
                  size="small"
                  icon={<UndoOutlined />}
                  loading={restoringId === record._id}
                >
                  還原
                </Button>
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Input.Search
          placeholder="搜尋單號、報價編號、地址"
          allowClear
          style={{ width: 320 }}
          onSearch={(value) => {
            setSearchValue(value);
            fetchList(1, pagination.pageSize, value);
          }}
        />
      </div>
      <Table
        rowKey="_id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: canRestore ? 1350 : 1250 }}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        onChange={(pag) => {
          fetchList(pag.current, pag.pageSize, searchValue);
        }}
      />
    </>
  );
}

export default function DeletedRecords() {
  const { followUpDisplayName } = useFollowUpDisplayName();
  const [activeTab, setActiveTab] = useState('quote');

  return (
    <ErpLayout>
      <Card title="已刪除記錄" style={{ margin: 24 }}>
        <p style={{ marginBottom: 16, color: '#666', fontSize: 13 }}>
          列出已刪除（removed = true）的報價單、吊船報價、S 單及發票，按刪除時間由新到舊排序。
        </p>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={TAB_ITEMS.map((tab) => ({
            key: tab.key,
            label: tab.label,
            children: (
              <DeletedRecordsTable entity={tab.key} followUpDisplayName={followUpDisplayName} />
            ),
          }))}
        />
      </Card>
    </ErpLayout>
  );
}
