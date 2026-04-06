import { useState, useEffect } from 'react';
import { Divider, Card, Table, Typography, Modal, message, Form, Select, DatePicker, InputNumber, Input } from 'antd';
import dayjs from 'dayjs';

import { Button, Row, Col, Descriptions, Statistic, Tag, Space, Tooltip } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import {
  EditOutlined,
  DeleteOutlined,
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
import SalaryManagement from '@/components/SalaryManagement';
import calculate from '@/utils/calculate';

const { Title, Text } = Typography;

export default function ProjectReadItem({ config, selectedItem, projectIdFromUrl }) {
  const translate = useLanguage();
  const { entity, ENTITY_NAME } = config;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { dateFormat } = useDate();

  const { moneyFormatter } = useMoney();

  const { result: currentResult } = useSelector(selectCurrentItem);

  const resetProject = {
    invoiceNumber: '',
    poNumber: '',
    status: 'draft',
    costBy: '對方',
    quotations: [],
    supplierQuotations: [],
    shipQuotations: [],
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
  const [contractorFeesModalVisible, setContractorFeesModalVisible] = useState(false);
  const [editingUsedFeeIndex, setEditingUsedFeeIndex] = useState(null);
  const [contractorFeesForm] = Form.useForm();
  const [nextEoPreview, setNextEoPreview] = useState('');
  const [nextEoLoading, setNextEoLoading] = useState(false);
  
  // 從 contractorFees 中提取工程名選項
  const projectNameOptions = currentProject.contractorFees && Array.isArray(currentProject.contractorFees)
    ? currentProject.contractorFees
        .filter(fee => fee.projectName && fee.projectName.trim() !== '')
        .map(fee => ({
          value: fee.projectName,
          label: fee.projectName,
        }))
    : [];

  useEffect(() => {
    const controller = new AbortController();
    const projectId = projectIdFromUrl || currentResult?._id;
    if (currentResult && projectId) {
      setCurrentProject(currentResult);
      loadWorkProgress(projectId);
    }
    return () => controller.abort();
  }, [currentResult, projectIdFromUrl]);

  // 建立使用判頭費時預覽即將指派的 EO 編號（不佔用序號，與他人同時操作時實際號碼可能順延）
  useEffect(() => {
    if (!contractorFeesModalVisible || editingUsedFeeIndex !== null) {
      return undefined;
    }
    let cancelled = false;
    setNextEoLoading(true);
    setNextEoPreview('');
    (async () => {
      try {
        const res = await request.get({ entity: 'project/next-used-contractor-fee-eo' });
        if (cancelled) return;
        if (res?.success && res?.result?.nextEoNumber) {
          setNextEoPreview(res.result.nextEoNumber);
        } else {
          setNextEoPreview('');
        }
      } catch {
        if (!cancelled) setNextEoPreview('');
      } finally {
        if (!cancelled) setNextEoLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contractorFeesModalVisible, editingUsedFeeIndex]);

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

  const resetUsedFeeModal = () => {
    setContractorFeesModalVisible(false);
    setEditingUsedFeeIndex(null);
    contractorFeesForm.resetFields();
  };

  const handleEditUsedContractorFee = (record, index) => {
    setEditingUsedFeeIndex(index);
    contractorFeesForm.setFieldsValue({
      projectName: record.projectName || '',
      date: record.date ? dayjs(record.date) : null,
      invoiceNo: record.invoiceNo || '',
      eoNumber: record.eoNumber || '',
      remark: record.remark || '',
      amount: record.amount ?? 0,
    });
    setContractorFeesModalVisible(true);
  };

  // 處理新增/修改使用判頭費
  const handleAddContractorFee = async (values) => {
    try {
      // 獲取當前的 usedContractorFees 數組
      const currentUsedContractorFees = currentProject.usedContractorFees || [];
      const projectName = values.projectName;
      const newAmount = Number(values.amount) || 0;

      // 財務信息中該工程名的判頭費總額度（可有多行同工程名則加總）
      const allocated = (currentProject.contractorFees || [])
        .filter((f) => f && f.projectName === projectName)
        .reduce((sum, f) => calculate.add(sum, Number(f.amount) || 0), 0);

      // 同工程名下已使用金額（修改時排除正在編輯的那一筆）
      let usedSum = 0;
      currentUsedContractorFees.forEach((u, i) => {
        if (!u || u.projectName !== projectName) return;
        if (editingUsedFeeIndex !== null && i === editingUsedFeeIndex) return;
        usedSum = calculate.add(usedSum, Number(u.amount) || 0);
      });

      const remaining = calculate.sub(allocated, usedSum);
      if (calculate.sub(newAmount, remaining) > 0) {
        Modal.warning({
          title: '提示',
          content: `${projectName || '—'}，金額不足`,
          okText: '知道了',
        });
        return;
      }

      // 添加新的使用判頭費記錄
      const newUsedContractorFee = {
        projectName: values.projectName,
        date: values.date ? dayjs(values.date).toDate() : new Date(),
        eoNumber: values.eoNumber || '',
        invoiceNo: values.invoiceNo != null ? String(values.invoiceNo).trim() : '',
        remark: values.remark != null ? String(values.remark).trim() : '',
        amount: values.amount || 0,
      };
      
      let updatedUsedContractorFees = [];
      if (editingUsedFeeIndex !== null && editingUsedFeeIndex >= 0) {
        updatedUsedContractorFees = [...currentUsedContractorFees];
        updatedUsedContractorFees[editingUsedFeeIndex] = {
          ...updatedUsedContractorFees[editingUsedFeeIndex],
          ...newUsedContractorFee,
        };
      } else {
        updatedUsedContractorFees = [...currentUsedContractorFees, newUsedContractorFee];
      }
      
      // 更新項目
      const response = await request.update({
        entity: 'project',
        id: currentProject._id,
        jsonData: {
          usedContractorFees: updatedUsedContractorFees,
        },
      });
      
      if (response.success) {
        message.success(editingUsedFeeIndex !== null ? '使用判頭費記錄修改成功！' : '使用判頭費記錄添加成功！');
        resetUsedFeeModal();
        // 重新載入項目數據
        dispatch(erp.read({ entity: entity.toLowerCase(), id: currentProject._id }));
      } else {
        message.error((editingUsedFeeIndex !== null ? '修改失敗：' : '添加失敗：') + (response.message || '未知錯誤'));
      }
    } catch (error) {
      console.error('Error adding used contractor fee:', error);
      message.error('添加過程中發生錯誤');
    }
  };

  // 刪除單筆使用判頭費
  const handleDeleteUsedContractorFee = (index) => {
    const list = currentProject.usedContractorFees || [];
    const row = list[index];
    const label = row?.projectName || row?.eoNumber || `第 ${index + 1} 筆`;
    Modal.confirm({
      title: '刪除使用判頭費',
      content: `確定要刪除「${label}」這筆記錄嗎？此操作無法復原。`,
      okText: '刪除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        if (index < 0 || index >= list.length) return;
        const updatedUsedContractorFees = list.filter((_, i) => i !== index);
        try {
          const response = await request.update({
            entity: 'project',
            id: currentProject._id,
            jsonData: {
              usedContractorFees: updatedUsedContractorFees,
            },
          });
          if (response.success) {
            message.success('已刪除使用判頭費記錄');
            if (contractorFeesModalVisible) resetUsedFeeModal();
            dispatch(erp.read({ entity: entity.toLowerCase(), id: currentProject._id }));
          } else {
            message.error(response.message || '刪除失敗');
          }
        } catch (error) {
          console.error('Error deleting used contractor fee:', error);
          message.error('刪除過程中發生錯誤');
        }
      },
    });
  };

  // 處理同步功能
  const handleSync = () => {
    Modal.confirm({
      title: '同步項目數據',
      content: `確定要同步 Quote Number "${currentProject.invoiceNumber}" 的所有相關文檔嗎？這將查找所有相同 Quote Number 的 Quote、Supplier Quote 和 Invoice 並更新項目數據。`,
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
            message.success(`同步完成！新增了 ${result.syncSummary?.newQuotations || 0} 個Quote、${result.syncSummary?.newSupplierQuotations || 0} 個Supplier Quote、${result.syncSummary?.newShipQuotations || 0} 個吊船Quote、${result.syncSummary?.newInvoices || 0} 個Invoice`);
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
          navigate(`/workprogress/create?projectId=${currentProject._id}&invoiceNumber=${currentProject.invoiceNumber}`);
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
        navigate(`/workprogress/create?projectId=${currentProject._id}&invoiceNumber=${currentProject.invoiceNumber}&items=${itemsData}`);
      },
      onCancel: () => {
        // 創建空WorkProgress
        navigate(`/workprogress/create?projectId=${currentProject._id}&invoiceNumber=${currentProject.invoiceNumber}`);
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
          state={{ fromProject: currentProject._id }}
          style={{ color: '#1890ff', textDecoration: 'none' }}
        >
          {`${record.numberPrefix || 'QU'}-${number}`}
        </Link>
      ),
    },
    {
      title: '年月日',
      dataIndex: 'date',
      key: 'date',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: translate('Status'),
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Tag>{translate(status)}</Tag>,
    },
    {
      title: '成本價',
      dataIndex: 'costPrice',
      key: 'costPrice',
      render: (amount) => moneyFormatter({ amount: amount || 0 }),
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
          state={{ fromProject: currentProject._id }}
          style={{ color: '#1890ff', textDecoration: 'none' }}
        >
          {`${record.numberPrefix || 'QU'}-${number}`}
        </Link>
      ),
    },
    {
      title: '年月日',
      dataIndex: 'date',
      key: 'date',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
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

  // Ship Quotations表格列（格式和Quotations一樣）
  const shipQuotationColumns = [
    {
      title: translate('Number'),
      dataIndex: 'number',
      key: 'number',
      render: (number, record) => (
        <Link 
          to={`/shipquote/read/${record._id}`}
          state={{ fromProject: currentProject._id }}
          style={{ color: '#1890ff', textDecoration: 'none' }}
        >
          {`${record.numberPrefix || 'QU'}-${number}`}
        </Link>
      ),
    },
    {
      title: '年月日',
      dataIndex: 'date',
      key: 'date',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
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
          state={{ fromProject: currentProject._id }}
          style={{ color: '#1890ff', textDecoration: 'none' }}
        >
          {`${record.numberPrefix || 'SMI'}-${number}`}
        </Link>
      ),
    },
    {
      title: '年月日',
      dataIndex: 'date',
      key: 'date',
      render: (date) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
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
    {
      title: '部份付款',
      dataIndex: 'credit',
      key: 'credit',
      render: (credit, record) => moneyFormatter({ amount: credit != null ? credit : 0, currency_code: record.currency || 'HKD' }),
    },
    {
      title: '未付',
      key: 'unpaid',
      render: (_, record) => {
        const total = Number(record.total) || 0;
        const credit = Number(record.credit) || 0;
        const unpaid = total - credit;
        return moneyFormatter({ amount: unpaid, currency_code: record.currency || 'HKD' });
      },
    },
    {
      title: translate('project_percentage_short'),
      key: 'projectPercentage',
      width: 96,
      align: 'center',
      render: (_, record) => {
        const v = record.projectPercentage;
        if (v == null || v === '') return '-';
        return `${Number(v)}%`;
      },
    },
  ];

  // 使用判頭費表格列（固定欄寬 + 金額 nowrap；Remark 限高可捲動，避免撐爆版面）
  const contractorFeesColumns = [
    {
      title: '工程名',
      dataIndex: 'projectName',
      key: 'projectName',
      width: 120,
      ellipsis: true,
      onCell: () => ({
        style: { verticalAlign: 'top', maxWidth: 120 },
      }),
      render: (projectName) => {
        if (!projectName) return '-';
        return (
          <Tooltip title={projectName}>
            <Text strong style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
              {projectName}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: 'EO number',
      dataIndex: 'eoNumber',
      key: 'eoNumber',
      width: 128,
      ellipsis: true,
      render: (eoNumber) => eoNumber || '-',
    },
    {
      title: 'Remark',
      dataIndex: 'remark',
      key: 'remark',
      width: 200,
      onCell: () => ({
        style: { verticalAlign: 'top', maxWidth: 200 },
      }),
      render: (remark) =>
        remark ? (
          <Tooltip title={remark} placement="topLeft">
            <div
              style={{
                maxWidth: 200,
                maxHeight: 72,
                overflowY: 'auto',
                fontSize: 12,
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {remark}
            </div>
          </Tooltip>
        ) : (
          '-'
        ),
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 108,
      render: (date) => {
        if (!date) return '-';
        return dayjs(date).format(dateFormat);
      },
    },
    {
      title: 'Invoice No',
      dataIndex: 'invoiceNo',
      key: 'invoiceNo',
      width: 140,
      ellipsis: true,
      render: (invoiceNo) => invoiceNo || '-',
    },
    {
      title: '金額',
      dataIndex: 'amount',
      key: 'amount',
      width: 132,
      align: 'right',
      onCell: () => ({
        style: {
          whiteSpace: 'nowrap',
          minWidth: 120,
        },
      }),
      render: (amount) => {
        return <Text strong>{moneyFormatter({ amount: amount || 0 })}</Text>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 152,
      align: 'center',
      render: (_, record, index) => (
        <Space size={16} wrap align="center">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditUsedContractorFee(record, index)}
            style={{ paddingInline: 4 }}
          >
            Edit
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteUsedContractorFee(index)}
            style={{ paddingInline: 4 }}
          >
            刪除
          </Button>
        </Space>
      ),
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
        title={`${ENTITY_NAME} - ${currentProject.invoiceNumber}`}
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
            value={moneyFormatter({ 
              amount: currentProject.contractorFees && Array.isArray(currentProject.contractorFees) 
                ? currentProject.contractorFees.reduce((sum, fee) => sum + (fee.amount || 0), 0)
                : (currentProject.contractorFee || 0)
            })}
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
        <Descriptions.Item label="Quote Number">{currentProject.invoiceNumber}</Descriptions.Item>
        <Descriptions.Item label={translate('P.O Number')}>{currentProject.poNumber || '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Description')}>{currentProject.description || '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Address')}>{currentProject.address || '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Start Date')}>
          {currentProject.startDate ? dayjs(currentProject.startDate).format(dateFormat) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={translate('End Date')}>
          {currentProject.endDate ? dayjs(currentProject.endDate).format(dateFormat) : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={translate('Cost By')}>{currentProject.costBy}</Descriptions.Item>
        <Descriptions.Item label="修改時間">{currentProject.modified_at ? dayjs(currentProject.modified_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
        <Descriptions.Item label="修改人">{currentProject.updatedBy ? (currentProject.updatedBy.name + (currentProject.updatedBy.surname ? ' ' + currentProject.updatedBy.surname : '') || currentProject.updatedBy.email || '-') : '-'}</Descriptions.Item>
        <Descriptions.Item label="判頭費總計" span={3}>
          {currentProject.contractorFees && Array.isArray(currentProject.contractorFees) && currentProject.contractorFees.length > 0 ? (
            <div>
              {currentProject.contractorFees.map((fee, index) => {
                const usedForThis = (currentProject.usedContractorFees || []).filter(
                  u => (u.projectName || '').trim() === (fee.projectName || '').trim()
                );
                const usedAmount = usedForThis.reduce((sum, u) => sum + (u.amount || 0), 0);
                const originalAmount = fee.amount || 0;
                const remaining = originalAmount - usedAmount;
                return (
                  <div key={index} style={{ marginBottom: 8 }}>
                    <Text strong>{fee.projectName || '判頭費'}: </Text>
                    <Text>{moneyFormatter({ amount: originalAmount })}</Text>
                    {usedAmount > 0 && (
                      <>
                        <Text type="secondary"> 已用 </Text>
                        <Text type="secondary" style={{ color: '#ff4d4f' }}>-{moneyFormatter({ amount: usedAmount })}</Text>
                        <Text strong> 剩餘 </Text>
                        <Text strong>{moneyFormatter({ amount: remaining })}</Text>
                      </>
                    )}
                  </div>
                );
              })}
              <Divider style={{ margin: '8px 0' }} />
              <Text strong>總計: </Text>
              <Text strong>
                {moneyFormatter({ 
                  amount: currentProject.contractorFees.reduce((sum, fee) => sum + (fee.amount || 0), 0)
                })}
              </Text>
              {(currentProject.usedContractorFees && currentProject.usedContractorFees.length > 0) && (() => {
                const usedTotal = currentProject.usedContractorFees.reduce((sum, u) => sum + (u.amount || 0), 0);
                const feeTotal = currentProject.contractorFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
                const remainingTotal = feeTotal - usedTotal;
                return (
                  <>
                    <Text type="secondary"> 已用 </Text>
                    <Text type="secondary" style={{ color: '#ff4d4f' }}>-{moneyFormatter({ amount: usedTotal })}</Text>
                    <Text strong> 剩餘 </Text>
                    <Text strong>{moneyFormatter({ amount: remainingTotal })}</Text>
                  </>
                );
              })()}
            </div>
          ) : currentProject.contractorFee !== undefined && currentProject.contractorFee !== null ? (
            <div>
              <Text>{moneyFormatter({ amount: currentProject.contractorFee || 0 })}</Text>
              {(currentProject.usedContractorFees && currentProject.usedContractorFees.length > 0) && (() => {
                const usedTotal = currentProject.usedContractorFees.reduce((sum, u) => sum + (u.amount || 0), 0);
                const feeTotal = currentProject.contractorFee || 0;
                const remaining = feeTotal - usedTotal;
                return (
                  <>
                    <Text type="secondary"> 已用 </Text>
                    <Text type="secondary" style={{ color: '#ff4d4f' }}>-{moneyFormatter({ amount: usedTotal })}</Text>
                    <Text strong> 剩餘 </Text>
                    <Text strong>{moneyFormatter({ amount: remaining })}</Text>
                  </>
                );
              })()}
            </div>
          ) : (
            <Text>-</Text>
          )}
        </Descriptions.Item>
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
          <Card title={`吊船Quotations (${currentProject.shipQuotations?.length || 0})`} size="small">
            <Table
              dataSource={currentProject.shipQuotations || []}
              columns={shipQuotationColumns}
              pagination={false}
              size="small"
              rowKey="_id"
              locale={{ emptyText: 'No ship quotations linked' }}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card
            title={`Invoices (${currentProject.invoices?.length || 0})`}
            size="small"
            extra={
              (() => {
                const unpaidTotal = (currentProject.invoices || []).reduce(
                  (sum, inv) => sum + Math.max(0, (Number(inv.total) || 0) - (Number(inv.credit) || 0)),
                  0
                );
                if (unpaidTotal <= 0) return null;
                return (
                  <Text type="danger" strong>
                    {translate('unpaid')} {translate('total')}: {moneyFormatter({ amount: unpaidTotal })}
                  </Text>
                );
              })()
            }
          >
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
            title={`使用判頭費 (${currentProject.usedContractorFees?.length || 0})`} 
            size="small"
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingUsedFeeIndex(null);
                  contractorFeesForm.resetFields();
                  setContractorFeesModalVisible(true);
                }}
                size="small"
              >
                建立資料
              </Button>
            }
          >
            <Table
              dataSource={currentProject.usedContractorFees || []}
              columns={contractorFeesColumns}
              pagination={false}
              size="small"
              tableLayout="fixed"
              scroll={{ x: 1100 }}
              rowKey={(record, index) => record._id || index}
              locale={{ emptyText: '沒有判頭費記錄' }}
              summary={(pageData) => {
                const total = (pageData || []).reduce((sum, record) => {
                  return sum + (record.amount || 0);
                }, 0);
                const amountColIndex = Math.max(
                  0,
                  contractorFeesColumns.findIndex((col) => col.key === 'amount')
                );
                const labelColSpan = amountColIndex; // 其餘欄位合併顯示
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={labelColSpan}>
                        <Text strong>總計</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={amountColIndex} align="right">
                        <Text strong>{moneyFormatter({ amount: total })}</Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
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

        <Col span={24}>
          <SalaryManagement 
            projectId={projectIdFromUrl || currentProject._id}
            workProgressList={workProgressList}
          />
        </Col>
      </Row>

      {/* 使用判頭費 建立資料 模态框 */}
      <Modal
        title={editingUsedFeeIndex !== null ? '修改使用判頭費資料' : '建立使用判頭費資料'}
        open={contractorFeesModalVisible}
        onCancel={resetUsedFeeModal}
        footer={null}
        width={560}
      >
        <Form
          form={contractorFeesForm}
          layout="vertical"
          onFinish={handleAddContractorFee}
        >
          <Form.Item
            label="工程名"
            name="projectName"
            rules={[{ required: true, message: '請選擇工程名' }]}
          >
            <Select
              placeholder="選擇工程名"
              showSearch
              filterOption={(input, option) =>
                option?.label?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
              options={projectNameOptions}
              notFoundContent={projectNameOptions.length === 0 ? '請先在財務信息中添加判頭費工程名' : '無匹配的工程名'}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="日期"
                name="date"
                rules={[{ required: true, message: '請選擇日期' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format={dateFormat}
                  placeholder="選擇日期"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Invoice No" name="invoiceNo">
                <Input allowClear placeholder="選填" />
              </Form.Item>
            </Col>
          </Row>

          {editingUsedFeeIndex !== null ? (
            <Form.Item label="EO number" name="eoNumber">
              <Input disabled placeholder="—" />
            </Form.Item>
          ) : (
            <Form.Item
              label="EO number"
              extra="儲存時會使用此編號（全站唯一）。若期間其他人已新增紀錄，實際編號可能為下一號。"
            >
              <Input
                disabled
                value={
                  nextEoLoading
                    ? '載入中…'
                    : nextEoPreview || '無法預覽，儲存後將自動指派'
                }
              />
            </Form.Item>
          )}

          <Form.Item label="Remark" name="remark">
            <Input.TextArea
              allowClear
              placeholder="選填"
              rows={3}
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            label="金額"
            name="amount"
            rules={[{ required: true, message: '請輸入金額' }]}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              addonBefore="$"
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button 
              style={{ marginRight: 8 }} 
              onClick={resetUsedFeeModal}
            >
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              {editingUsedFeeIndex !== null ? '儲存修改' : '建立資料'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
