import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Progress, Timeline, Button, Divider, Row, Col, Statistic, Modal, Form, Input, InputNumber, Upload, message, Table, Space } from 'antd';
import { ArrowLeftOutlined, EditOutlined, PlusOutlined, UploadOutlined, DeleteOutlined, EditOutlined as EditIcon } from '@ant-design/icons';
import { PageHeader } from '@ant-design/pro-layout';
import dayjs from 'dayjs';

import { ErpLayout } from '@/layout';
import useLanguage from '@/locale/useLanguage';
import { useMoney, useDate } from '@/settings';
import { request } from '@/request';
import { BASE_URL } from '@/config/serverApiConfig';

export default function WorkProgressRead() {
  const { id } = useParams();
  const navigate = useNavigate();
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const { dateFormat } = useDate();

  const [workProgress, setWorkProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [editingHistory, setEditingHistory] = useState(null);
  const [historyForm] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [submittingHistory, setSubmittingHistory] = useState(false);

  useEffect(() => {
    fetchWorkProgress();
  }, [id]);

  const fetchWorkProgress = async () => {
    try {
      setLoading(true);
      const response = await request.read({ entity: 'workprogress', id });
      
      if (response.success) {
        setWorkProgress(response.result);
      } else {
        console.error('Failed to fetch WorkProgress:', response.message);
      }
    } catch (error) {
      console.error('Error fetching WorkProgress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ErpLayout>
        <div style={{ padding: '50px', textAlign: 'center' }}>載入中...</div>
      </ErpLayout>
    );
  }

  if (!workProgress) {
    return (
      <ErpLayout>
        <div style={{ padding: '50px', textAlign: 'center' }}>WorkProgress not found</div>
      </ErpLayout>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'default',
      in_progress: 'processing',
      completed: 'success',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: '待開始',
      in_progress: '進行中', 
      completed: '已完成',
      cancelled: '已取消'
    };
    return texts[status] || status;
  };

  // 計算歷史記錄的總進度
  const calculateTotalProgress = (historyRecords = []) => {
    return historyRecords.reduce((total, record) => total + (record.percentage || 0), 0);
  };

  // 打開添加/編輯歷史記錄對話框
  const openHistoryModal = (record = null) => {
    setEditingHistory(record);
    setHistoryModalVisible(true);
    setFileList([]);
    
    if (record) {
      historyForm.setFieldsValue({
        description: record.description,
        percentage: record.percentage,
      });
      // 如果有圖片，設置文件列表
      if (record.image) {
        setFileList([{
          uid: '-1',
          name: 'current-image',
          status: 'done',
          url: getImageUrl(record.image), // 使用完整的URL
        }]);
      }
    } else {
      historyForm.resetFields();
    }
  };

  // 提交歷史記錄
  const handleHistorySubmit = async (values) => {
    try {
      setSubmittingHistory(true);
      
      const currentHistory = workProgress.history || [];
      const newPercentage = values.percentage;
      
      // 計算除了當前編輯記錄外的總進度
      const otherRecordsProgress = editingHistory 
        ? currentHistory
            .filter(h => h !== editingHistory)
            .reduce((total, record) => total + (record.percentage || 0), 0)
        : calculateTotalProgress(currentHistory);
      
      // 檢查是否超過100%
      if (otherRecordsProgress + newPercentage > 100) {
        message.error(`總進度不能超過100%！當前其他記錄總進度：${otherRecordsProgress}%，新增進度：${newPercentage}%`);
        return;
      }

      // 準備提交的數據
      const historyData = {
        description: values.description,
        percentage: newPercentage,
        date: new Date().toISOString(),
        recordedBy: null, // 後端會自動設置為req.admin._id
      };

      // 處理圖片上傳
      if (fileList.length > 0 && fileList[0].originFileObj) {
        // 實際上傳圖片
        try {
          const formData = new FormData();
          formData.append('image', fileList[0].originFileObj);
          
          console.log('📤 Uploading image...');
          const uploadResponse = await request.uploadWorkProgressImage(formData);
          
          if (uploadResponse.success) {
            historyData.image = uploadResponse.result.path;
            console.log('✅ Image uploaded:', uploadResponse.result.path);
          } else {
            message.error('圖片上傳失敗：' + uploadResponse.message);
            return;
          }
        } catch (uploadError) {
          console.error('❌ Image upload error:', uploadError);
          message.error('圖片上傳失敗');
          return;
        }
      } else if (fileList.length > 0 && fileList[0].url) {
        // 保持現有圖片 - 如果是完整URL，提取相對路徑
        const currentUrl = fileList[0].url;
        if (currentUrl.includes('/uploads/')) {
          // 提取相對路徑部分
          historyData.image = currentUrl.substring(currentUrl.indexOf('/uploads/'));
        } else {
          historyData.image = currentUrl;
        }
      }

      // 更新歷史記錄
      let updatedHistory;
      if (editingHistory) {
        // 編輯現有記錄 - 找到對應的記錄並更新
        updatedHistory = currentHistory.map(h => {
          // 使用 _id 精準匹配，避免 date/description 相同導致更新錯列
          const hId = h?._id ? String(h._id) : null;
          const eId = editingHistory?._id ? String(editingHistory._id) : null;
          if (hId && eId && hId === eId) {
            return { ...h, ...historyData };
          }
          return h;
        });
      } else {
        // 添加新記錄
        updatedHistory = [...currentHistory, historyData];
      }

      console.log('📋 Updated history array:', updatedHistory);

      // 計算新的總進度
      const newTotalProgress = calculateTotalProgress(updatedHistory);

      // 更新WorkProgress
      const response = await request.update({
        entity: 'workprogress',
        id,
        jsonData: {
          history: updatedHistory,
          progress: newTotalProgress, // 自動更新總進度
        }
      });

      if (response.success) {
        message.success(editingHistory ? '歷史記錄更新成功！' : '歷史記錄添加成功！');
        setHistoryModalVisible(false);
        fetchWorkProgress(); // 重新載入數據
      } else {
        message.error('操作失敗：' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      console.error('提交歷史記錄錯誤:', error);
      message.error('提交過程中發生錯誤');
    } finally {
      setSubmittingHistory(false);
    }
  };

  // 刪除歷史記錄
  const handleDeleteHistory = async (record) => {
    try {
      const updatedHistory = (workProgress.history || []).filter(h => h !== record);
      const newTotalProgress = calculateTotalProgress(updatedHistory);

      const response = await request.update({
        entity: 'workprogress',
        id,
        jsonData: {
          history: updatedHistory,
          progress: newTotalProgress,
        }
      });

      if (response.success) {
        message.success('歷史記錄刪除成功！');
        fetchWorkProgress();
      } else {
        message.error('刪除失敗：' + (response.message || '未知錯誤'));
      }
    } catch (error) {
      console.error('刪除歷史記錄錯誤:', error);
      message.error('刪除過程中發生錯誤');
    }
  };

  // 構建完整的圖片URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    
    // 移除BASE_URL結尾的斜線，並確保imagePath以斜線開頭
    const baseUrl = BASE_URL.replace('/api/', '').replace(/\/$/, ''); // 移除結尾斜線
    const cleanImagePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
    
    const fullUrl = `${baseUrl}${cleanImagePath}`;
    console.log('🖼️ Image URL constructed:', { imagePath, baseUrl, cleanImagePath, fullUrl });
    
    return fullUrl;
  };

  // 文件上傳配置
  const uploadProps = {
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上傳圖片文件！');
        return false;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('圖片大小不能超過5MB！');
        return false;
      }
      return false; // 阻止自動上傳
    },
    fileList,
    onChange: ({ fileList }) => setFileList(fileList.slice(-1)), // 只保留最新的一個文件
  };

  return (
    <ErpLayout>
      <PageHeader
        onBack={() => {
          // 返回到相關的Project頁面
          if (workProgress?.project?._id) {
            navigate(`/project/read/${workProgress.project._id}`);
          } else {
            navigate(-1);
          }
        }}
        title={`WorkProgress: ${workProgress.item?.itemName || 'Unknown'}`}
        ghost={false}
        tags={[
          <Tag key="status" color={getStatusColor(workProgress.status)}>
            {getStatusText(workProgress.status)}
          </Tag>
        ]}
        extra={[
          <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => {
            // 返回到相關的Project頁面
            if (workProgress?.project?._id) {
              navigate(`/project/read/${workProgress.project._id}`);
            } else {
              navigate(-1);
            }
          }}>
            返回項目
          </Button>,
          <Button key="edit" type="primary" icon={<EditOutlined />} onClick={() => navigate(`/workprogress/update/${id}`)}>
            編輯
          </Button>
        ]}
      >
        <Row gutter={[32, 0]}>
          <Col>
            <Statistic 
              title="進度" 
              value={workProgress.progress} 
              suffix="%" 
              valueStyle={{ 
                color: workProgress.progress >= 100 ? '#3f8600' : workProgress.progress >= 50 ? '#1890ff' : '#faad14' 
              }}
            />
          </Col>
          <Col>
            <Statistic title="工作天數" value={workProgress.days} suffix="天" />
          </Col>
          <Col>
            <Statistic 
              title="項目總價" 
              value={moneyFormatter({ amount: workProgress.item?.total || 0 })} 
            />
          </Col>
        </Row>
      </PageHeader>

      <Divider dashed />

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="基本信息" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="所屬項目">
                {workProgress.project ? (
                  <Button 
                    type="link" 
                    style={{ padding: 0 }}
                    onClick={() => navigate(`/project/read/${workProgress.project._id}`)}
                  >
                    {workProgress.project.name || `Project ${workProgress.project._id}`}
                  </Button>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Invoice Number">{workProgress.invoiceNumber}</Descriptions.Item>
              <Descriptions.Item label={translate('P.O Number')}>{workProgress.poNumber || '-'}</Descriptions.Item>
              <Descriptions.Item label="負責員工">
                {workProgress.contractorEmployee ? (
                  <div>
                    <Tag color="blue">{workProgress.contractorEmployee.name}</Tag>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {workProgress.contractorEmployee.contractor?.name || ''}
                    </div>
                  </div>
                ) : (
                  <Tag color="default">未分配</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="開始日期">
                {workProgress.startDate ? dayjs(workProgress.startDate).format(dateFormat) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="預期結束日期">
                {workProgress.expectedEndDate ? dayjs(workProgress.expectedEndDate).format(dateFormat) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="完工日期">
                {workProgress.completionDate ? (
                  (() => {
                    const completionDate = dayjs(workProgress.completionDate);
                    const today = dayjs();
                    const diffDays = completionDate.diff(today, 'days');
                    const isUrgent = diffDays >= 0 && diffDays <= 3;
                    
                    return (
                      <span style={{ color: isUrgent ? '#ff4d4f' : 'inherit' }}>
                        {completionDate.format(dateFormat)}
                        {isUrgent && (
                          <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                            ⚠️ {diffDays}天內到期
                          </span>
                        )}
                      </span>
                    );
                  })()
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="實際結束日期">
                {workProgress.actualEndDate ? dayjs(workProgress.actualEndDate).format(dateFormat) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="備註">
                {workProgress.notes || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="工作項目詳情" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="項目名稱">{workProgress.item?.itemName}</Descriptions.Item>
              <Descriptions.Item label="描述">{workProgress.item?.description || '-'}</Descriptions.Item>
              <Descriptions.Item label="數量">{workProgress.item?.quantity}</Descriptions.Item>
              <Descriptions.Item label="單價">
                {moneyFormatter({ amount: workProgress.item?.price || 0 })}
              </Descriptions.Item>
              <Descriptions.Item label="總計">
                {moneyFormatter({ amount: workProgress.item?.total || 0 })}
              </Descriptions.Item>
              <Descriptions.Item label="來源Quote">{workProgress.item?.sourceQuote || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col span={24}>
          <Card 
            title="進度條" 
            size="small"
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                size="small"
                onClick={() => openHistoryModal()}
              >
                添加進度記錄
              </Button>
            }
          >
            <div style={{ marginBottom: '16px' }}>
              <Progress 
                percent={calculateTotalProgress(workProgress.history || [])} 
                status={calculateTotalProgress(workProgress.history || []) >= 100 ? 'success' : 'active'}
                strokeColor={calculateTotalProgress(workProgress.history || []) >= 100 ? '#52c41a' : calculateTotalProgress(workProgress.history || []) >= 50 ? '#1890ff' : '#faad14'}
                format={(percent) => `${percent}%`}
              />
              <div style={{ textAlign: 'center', marginTop: '8px', color: '#666', fontSize: '12px' }}>
                總進度：{calculateTotalProgress(workProgress.history || [])}% 
                {calculateTotalProgress(workProgress.history || []) > 100 && (
                  <span style={{ color: '#ff4d4f', marginLeft: '8px' }}>⚠️ 超過100%</span>
                )}
              </div>
            </div>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="進度歷史記錄" size="small">
            <Table
              dataSource={workProgress.history || []}
              // 用子document 的 _id 做 key，避免新增/刪除後列資料錯位
              rowKey={(record) => record._id || record.date}
              size="small"
              pagination={false}
              locale={{ emptyText: '暫無進度記錄' }}
              scroll={{ x: 600 }}
              columns={[
                {
                  title: '日期時間',
                  dataIndex: 'date',
                  key: 'date',
                  width: 130,
                  render: (date) => dayjs(date).format('MM-DD HH:mm'),
                  sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
                  defaultSortOrder: 'descend',
                },
                {
                  title: '進度',
                  dataIndex: 'percentage',
                  key: 'percentage',
                  width: 70,
                  render: (percentage) => (
                    <Tag color={percentage >= 50 ? 'green' : percentage >= 20 ? 'blue' : 'orange'}>
                      {percentage}%
                    </Tag>
                  ),
                },
                {
                  title: '描述',
                  dataIndex: 'description',
                  key: 'description',
                  ellipsis: true,
                },
                {
                  title: '圖片',
                  dataIndex: 'image',
                  key: 'image',
                  width: 80,
                  render: (image) => image ? (
                    <img 
                      src={getImageUrl(image)} 
                      alt="進度圖片" 
                      style={{ width: '50px', height: '35px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }}
                      onClick={() => window.open(getImageUrl(image), '_blank')}
                    />
                  ) : '-',
                },
                {
                  title: '操作',
                  key: 'action',
                  width: 80,
                  fixed: 'right',
                  render: (_, record) => (
                    <Space size="small">
                      <Button 
                        type="text" 
                        icon={<EditIcon />} 
                        size="small"
                        onClick={() => openHistoryModal(record)}
                        style={{ padding: '4px', minWidth: 'auto' }}
                        title="編輯"
                      />
                      <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />} 
                        size="small"
                        onClick={() => {
                          Modal.confirm({
                            title: '確認刪除',
                            content: '確定要刪除這條進度記錄嗎？',
                            onOk: () => handleDeleteHistory(record),
                          });
                        }}
                        style={{ padding: '4px', minWidth: 'auto' }}
                        title="刪除"
                      />
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* 添加/編輯歷史記錄的Modal */}
      <Modal
        title={editingHistory ? '編輯進度記錄' : '添加進度記錄'}
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={historyForm}
          layout="vertical"
          onFinish={handleHistorySubmit}
        >
          <Form.Item
            label="進度百分比"
            name="percentage"
            rules={[
              { required: true, message: '請輸入進度百分比' },
              { type: 'number', min: 0, max: 100, message: '進度必須在0-100之間' }
            ]}
          >
            <InputNumber
              min={0}
              max={100}
              formatter={value => `${value}%`}
              parser={value => value.replace('%', '')}
              style={{ width: '100%' }}
              placeholder="輸入本次進度百分比"
            />
          </Form.Item>

          <Form.Item
            label="工作描述"
            name="description"
            rules={[{ required: true, message: '請輸入工作描述' }]}
          >
            <Input.TextArea 
              rows={3} 
              placeholder="描述本次工作內容和進度情況..."
            />
          </Form.Item>

          <Form.Item label="上傳圖片">
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>選擇圖片</Button>
            </Upload>
            <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
              支持 JPG、PNG 格式，文件大小不超過 5MB
            </div>
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setHistoryModalVisible(false)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={submittingHistory}>
                {editingHistory ? '更新' : '添加'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </ErpLayout>
  );
}
