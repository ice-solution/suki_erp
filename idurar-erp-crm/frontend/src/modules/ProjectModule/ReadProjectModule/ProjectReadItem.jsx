import { useState, useEffect } from 'react';
import { Divider, Card, Table, Typography, Modal, message } from 'antd';
import dayjs from 'dayjs';

import { Button, Row, Col, Descriptions, Statistic, Tag } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import {
  EditOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';

import { useSelector, useDispatch } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { erp } from '@/redux/erp/actions';

import { generate as uniqueId } from 'shortid';

import { selectCurrentItem } from '@/redux/erp/selectors';

import { useMoney, useDate } from '@/settings';
import { useNavigate } from 'react-router-dom';
import { request } from '@/request';

const { Title, Text } = Typography;

export default function ProjectReadItem({ config, selectedItem }) {
  const translate = useLanguage();
  const { entity, ENTITY_NAME } = config;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { dateFormat } = useDate();

  const { moneyFormatter } = useMoney();

  const { result: currentResult } = useSelector(selectCurrentItem);

  const resetProject = {
    poNumber: '',
    status: 'draft',
    costBy: '對方',
    quotations: [],
    supplierQuotations: [],
    invoices: [],
    suppliers: [],
    costPrice: 0,
    sPrice: 0,
    contractorFee: 0,
    grossProfit: 0,
  };

  const [currentProject, setCurrentProject] = useState(selectedItem ?? resetProject);
  const [syncLoading, setSyncLoading] = useState(false);
  const [workProgressLoading, setWorkProgressLoading] = useState(false);
  const [workProgressList, setWorkProgressList] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    if (currentResult) {
      setCurrentProject(currentResult);
      // 載入WorkProgress列表
      loadWorkProgress(currentResult._id);
    }
    return () => controller.abort();
  }, [currentResult]);

  // 載入WorkProgress列表
  const loadWorkProgress = async (projectId) => {
    try {
      const response = await request.list({ 
        entity: 'workprogress',
        options: { projectId }
      });
      
      if (response.success) {
        setWorkProgressList(response.result?.items || []);
      }
    } catch (error) {
      console.error('Error loading WorkProgress:', error);
    }
  };

  // 處理同步功能
  const handleSync = () => {
    Modal.confirm({
      title: '同步項目數據',
      content: `確定要同步P.O Number "${currentProject.poNumber}" 的所有相關文檔嗎？這將查找所有相同P.O Number的Quote、Supplier Quote和Invoice並更新項目數據。`,
      okText: '同步',
      cancelText: '取消',
      onOk: async () => {
        setSyncLoading(true);
        try {
          const result = await dispatch(erp.sync({ 
            entity: entity.toLowerCase(), 
            id: currentProject._id 
          }));
          
          if (result) {
            message.success(`同步完成！新增了 ${result.syncSummary?.newQuotations || 0} 個Quote、${result.syncSummary?.newSupplierQuotations || 0} 個Supplier Quote、${result.syncSummary?.newInvoices || 0} 個Invoice`);
            // 重新載入項目數據
            dispatch(erp.read({ entity: entity.toLowerCase(), id: currentProject._id }));
          }
        } catch (error) {
          message.error('同步失敗：' + error.message);
        } finally {
          setSyncLoading(false);
        }
      }
    });
  };

  // 處理創建WorkProgress
  const handleCreateWorkProgress = () => {
    // 收集所有Quote的items
    const allQuoteItems = [];
    if (currentProject.quotations && currentProject.quotations.length > 0) {
      currentProject.quotations.forEach(quote => {
        if (quote.items && quote.items.length > 0) {
          quote.items.forEach(item => {
            allQuoteItems.push({
              ...item,
              sourceQuote: `${quote.numberPrefix || 'QU'}-${quote.number}`,
              sourceQuoteId: quote._id
            });
          });
        }
      });
    }

    if (allQuoteItems.length === 0) {
      Modal.confirm({
        title: '創建WorkProgress',
        content: '此項目沒有Quote items。是否要創建空的WorkProgress？',
        okText: '創建空WorkProgress',
        cancelText: '取消',
        onOk: () => {
          navigate(`/workprogress/create?projectId=${currentProject._id}&poNumber=${currentProject.poNumber}`);
        }
      });
      return;
    }

    Modal.confirm({
      title: '創建WorkProgress',
      content: (
        <div>
          <p>發現此項目有 {allQuoteItems.length} 個Quote items：</p>
          <ul style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {allQuoteItems.slice(0, 5).map((item, index) => (
              <li key={index}>
                <strong>{item.itemName}</strong> - 數量: {item.quantity} - 來源: {item.sourceQuote}
              </li>
            ))}
            {allQuoteItems.length > 5 && <li>... 還有 {allQuoteItems.length - 5} 個項目</li>}
          </ul>
          <p>是否要使用這些Quote items來創建WorkProgress？</p>
        </div>
      ),
      okText: '是，使用Quote Items',
      cancelText: '否，創建空WorkProgress',
      onOk: () => {
        // 使用Quote items創建
        const itemsData = encodeURIComponent(JSON.stringify(allQuoteItems));
        navigate(`/workprogress/create?projectId=${currentProject._id}&poNumber=${currentProject.poNumber}&items=${itemsData}`);
      },
      onCancel: () => {
        // 創建空WorkProgress
        navigate(`/workprogress/create?projectId=${currentProject._id}&poNumber=${currentProject.poNumber}`);
      }
    });
  };

  // Quotations表格列
  const quotationColumns = [
    {
      title: translate('Number'),
      dataIndex: 'number',
      key: 'number',
      render: (number, record) => (
        <Link 
          to={`/quote/read/${record._id}`}
          style={{ color: '#1890ff', textDecoration: 'none' }}
        >
          {`${record.numberPrefix || 'QU'}-${number}`}
        </Link>
      ),
    },
    {
      title: translate('Year'),
      dataIndex: 'year',
      key: 'year',
    },
    {
      title: translate('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag>{translate(status)}</Tag>,
    },
    {
      title: translate('Total'),
      dataIndex: 'total',
      key: 'total',
      render: (amount) => moneyFormatter({ amount: amount || 0 }),
    },
  ];

  // Supplier Quotations表格列
  const supplierQuotationColumns = [
    {
      title: translate('Number'),
      dataIndex: 'number', 
      key: 'number',
      render: (number, record) => (
        <Link 
          to={`/supplierquote/read/${record._id}`}
          style={{ color: '#1890ff', textDecoration: 'none' }}
        >
          {`${record.numberPrefix || 'QU'}-${number}`}
        </Link>
      ),
    },
    {
      title: translate('Year'),
      dataIndex: 'year',
      key: 'year',
    },
    {
      title: translate('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag>{translate(status)}</Tag>,
    },
    {
      title: translate('Total'),
      dataIndex: 'total',
      key: 'total',
      render: (amount) => moneyFormatter({ amount: amount || 0 }),
    },
  ];

  // Invoices表格列
  const invoiceColumns = [
    {
      title: translate('Number'),
      dataIndex: 'number',
      key: 'number',
      render: (number, record) => (
        <Link 
          to={`/invoice/read/${record._id}`}
          style={{ color: '#1890ff', textDecoration: 'none' }}
        >
          {`${record.numberPrefix || 'INV'}-${number}`}
        </Link>
      ),
    },
    {
      title: translate('Year'),
      dataIndex: 'year',
      key: 'year',
    },
    {
      title: translate('Status'),
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      render: (status) => <Tag>{translate(status)}</Tag>,
    },
    {
      title: translate('Total'),
      dataIndex: 'total',
      key: 'total',
      render: (amount) => moneyFormatter({ amount: amount || 0 }),
    },
  ];

  // WorkProgress表格列
  const workProgressColumns = [
    {
      title: '工作項目',
      dataIndex: 'item',
      key: 'item',
      render: (item) => {
        if (!item) return '-';
        return (
          <div>
            <strong>{item.itemName}</strong>
            {item.description && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                {item.description}
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#999' }}>
              數量: {item.quantity} | 來源: {item.sourceQuote}
            </div>
          </div>
        );
      },
    },
    {
      title: '負責員工',
      dataIndex: 'contractorEmployee',
      key: 'contractorEmployee',
      render: (employee) => {
        if (!employee) return <Tag color="default">未分配</Tag>;
        return (
          <div>
            <Tag color="blue">{employee.name}</Tag>
            <div style={{ fontSize: '11px', color: '#999' }}>
              {employee.contractor?.name || ''}
            </div>
          </div>
        );
      },
    },
    {
      title: '進度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress) => (
        <div>
          <div style={{ 
            width: '100%', 
            backgroundColor: '#f0f0f0', 
            borderRadius: '4px',
            height: '8px',
            marginBottom: '4px'
          }}>
            <div style={{
              width: `${progress}%`,
              backgroundColor: progress >= 100 ? '#52c41a' : progress >= 50 ? '#1890ff' : '#faad14',
              height: '100%',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <span style={{ fontSize: '12px' }}>{progress}%</span>
        </div>
      ),
    },
    {
      title: '狀態',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusColors = {
          'pending': 'default',
          'in_progress': 'processing',
          'completed': 'success',
          'cancelled': 'error'
        };
        const statusTexts = {
          'pending': '待開始',
          'in_progress': '進行中',
          'completed': '已完成',
          'cancelled': '已取消'
        };
        return <Tag color={statusColors[status]}>{statusTexts[status]}</Tag>;
      },
    },
    {
      title: '完工日期',
      dataIndex: 'completionDate',
      key: 'completionDate',
      width: 100,
      render: (date) => {
        if (!date) return '-';
        const completionDate = dayjs(date);
        const today = dayjs();
        const diffDays = completionDate.diff(today, 'days');
        
        // 如果距離完工日期3天內，顯示紅色警告
        const isUrgent = diffDays >= 0 && diffDays <= 3;
        
        return (
          <div style={{ color: isUrgent ? '#ff4d4f' : 'inherit' }}>
            {completionDate.format('YYYY-MM-DD')}
            {isUrgent && (
              <div style={{ fontSize: '10px', color: '#ff4d4f' }}>
                ⚠️ {diffDays}天內
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => navigate(`/workprogress/read/${record._id}`)}
        >
          查看詳情
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        onBack={() => {
          navigate(`/${entity.toLowerCase()}`);
        }}
        title={`${ENTITY_NAME} - ${currentProject.poNumber}`}
        ghost={false}
        tags={[
          <Tag key="status" color={currentProject.status === 'completed' ? 'success' : 'processing'}>
            {currentProject.status && translate(currentProject.status)}
          </Tag>,
          <Tag key="costBy" color={currentProject.costBy === '我方' ? 'blue' : 'green'}>
            {currentProject.costBy}
          </Tag>,
        ]}
        extra={[
          <Button
            key={`${uniqueId()}`}
            onClick={() => {
              navigate(`/${entity.toLowerCase()}`);
            }}
            icon={<CloseCircleOutlined />}
          >
            {translate('Close')}
          </Button>,
          <Button
            key={`${uniqueId()}`}
            onClick={handleSync}
            loading={syncLoading}
            icon={<SyncOutlined />}
          >
            同步 P.O Number
          </Button>,
          <Button
            key={`${uniqueId()}`}
            onClick={() => {
              dispatch(
                erp.currentAction({
                  actionType: 'update',
                  data: currentProject,
                })
              );
              navigate(`/${entity.toLowerCase()}/update/${currentProject._id}`);
            }}
            type="primary"
            icon={<EditOutlined />}
          >
            {translate('Edit')}
          </Button>,
        ]}
        style={{
          padding: '20px 0px',
        }}
      >
        <Row gutter={[32, 0]}>
          <Statistic 
            title="成本價" 
            value={moneyFormatter({ amount: currentProject.costPrice || 0 })}
          />
          <Statistic 
            title="S_price" 
            value={moneyFormatter({ amount: currentProject.sPrice || 0 })}
            style={{ margin: '0 32px' }}
          />
          <Statistic 
            title="判頭費" 
            value={moneyFormatter({ amount: currentProject.contractorFee || 0 })}
            style={{ margin: '0 32px' }}
          />
          <Statistic 
            title="毛利" 
            value={moneyFormatter({ amount: currentProject.grossProfit || 0 })}
            valueStyle={{ color: currentProject.grossProfit >= 0 ? '#3f8600' : '#cf1322' }}
            style={{ margin: '0 32px' }}
          />
        </Row>
      </PageHeader>
      
      <Divider dashed />
      
      <Descriptions title={translate('Project Information')}>
        <Descriptions.Item label={translate('P.O Number')}>{currentProject.poNumber}</Descriptions.Item>
        <Descriptions.Item label={translate('Description')}>{currentProject.description || '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Address')}>{currentProject.address || '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Start Date')}>
          {currentProject.startDate ? dayjs(currentProject.startDate).format(dateFormat) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={translate('End Date')}>
          {currentProject.endDate ? dayjs(currentProject.endDate).format(dateFormat) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={translate('Cost By')}>{currentProject.costBy}</Descriptions.Item>
        <Descriptions.Item label={translate('Contractors')} span={3}>
          {currentProject.contractors && currentProject.contractors.length > 0 ? (
            <div>
              {currentProject.contractors.map((contractor, index) => (
                <Tag key={contractor._id || index} style={{ marginBottom: 4, marginRight: 4 }}>
                  {contractor.name}
                </Tag>
              ))}
            </div>
          ) : (
            '-'
          )}
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title={`Quotations (${currentProject.quotations?.length || 0})`} size="small">
            <Table
              dataSource={currentProject.quotations || []}
              columns={quotationColumns}
              pagination={false}
              size="small"
              rowKey="_id"
              locale={{ emptyText: 'No quotations linked' }}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card title={`Supplier Quotations (${currentProject.supplierQuotations?.length || 0})`} size="small">
            <Table
              dataSource={currentProject.supplierQuotations || []}
              columns={supplierQuotationColumns}
              pagination={false}
              size="small"
              rowKey="_id"
              locale={{ emptyText: 'No supplier quotations linked' }}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card title={`Invoices (${currentProject.invoices?.length || 0})`} size="small">
            <Table
              dataSource={currentProject.invoices || []}
              columns={invoiceColumns}
              pagination={false}
              size="small"
              rowKey="_id"
              locale={{ emptyText: 'No invoices linked' }}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card 
            title={`WorkProgress (${workProgressList.length})`}
            size="small"
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleCreateWorkProgress}
                loading={workProgressLoading}
                size="small"
              >
                建立WorkProgress
              </Button>
            }
          >
            <Table
              dataSource={workProgressList}
              columns={workProgressColumns}
              pagination={false}
              size="small"
              rowKey="_id"
              locale={{ emptyText: '沒有WorkProgress記錄' }}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
