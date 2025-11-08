import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Form, Input, InputNumber, Button, Select, Divider, Row, Col, Card, Table, message, Tag, DatePicker, Modal } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { PageHeader } from '@ant-design/pro-layout';
import { ErpLayout } from '@/layout';
import { useDispatch } from 'react-redux';
import { erp } from '@/redux/erp/actions';
import useLanguage from '@/locale/useLanguage';
import { useMoney } from '@/settings';
import { request } from '@/request';

export default function WorkProgressCreate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();

  const [form] = Form.useForm();
  const [items, setItems] = useState([]);
  const [contractorEmployees, setContractorEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [manualItems, setManualItems] = useState([]);
  const [projectInfo, setProjectInfo] = useState(null);
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [addItemForm] = Form.useForm();

  // 從URL參數獲取數據
  const projectId = searchParams.get('projectId');
  const invoiceNumber = searchParams.get('invoiceNumber');
  const itemsParam = searchParams.get('items');

  useEffect(() => {
    console.log('🚀 WorkProgressCreate initialized with params:', {
      projectId,
      invoiceNumber,
      itemsParam: itemsParam ? 'present' : 'missing'
    });

    // 解析items參數
    if (itemsParam) {
      try {
        const decodedItems = JSON.parse(decodeURIComponent(itemsParam));
        setItems(decodedItems);
        // 初始化selectedItems，每個item都沒有分配承包商員工
        setSelectedItems(decodedItems.map(item => ({ ...item, contractorEmployee: null })));
        console.log('📝 Parsed items:', decodedItems.length, 'items');
      } catch (error) {
        console.error('❌ Error parsing items:', error);
        message.error('解析Quote items時出錯');
      }
    }

    // 設置基本表單值
    form.setFieldsValue({
      projectId,
      invoiceNumber,
      poNumber: '',
      completionDate: dayjs().add(7, 'days'), // 默認7天後完工
    });

    // 載入項目的承包商員工列表 (只有當projectId存在時)
    if (projectId) {
      fetchProjectContractorEmployees();
    } else {
      console.log('❌ No projectId provided, skipping contractor employee fetch');
    }
  }, [projectId, invoiceNumber, itemsParam, form]);

  const fetchProjectContractorEmployees = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching project contractor employees for projectId:', projectId);
      
      // 從項目獲取承包商列表
      const projectResponse = await request.read({ entity: 'project', id: projectId });
      
      console.log('📋 Project API response:', projectResponse);
      console.log('👥 Project contractors:', projectResponse.result?.contractors);
      
      if (projectResponse.success && projectResponse.result?.contractors) {
        setProjectInfo(projectResponse.result);
        form.setFieldsValue({
          poNumber: projectResponse.result.poNumber || '',
          invoiceNumber: projectResponse.result.invoiceNumber || invoiceNumber,
        });
        const contractorIds = projectResponse.result.contractors.map(c => c._id);
        console.log('🆔 Contractor IDs from Project:', contractorIds);
        console.log('👥 Full Project contractors data:', projectResponse.result.contractors);
        
        // 先嘗試獲取所有ContractorEmployee，然後在前端過濾
        try {
          const allEmployeesResponse = await request.list({ 
            entity: 'contractoremployee',
            options: { 
              items: 100  // 獲取所有員工
            }
          });
          
          console.log('🔍 All ContractorEmployee response:', allEmployeesResponse);
          
          if (allEmployeesResponse.success && allEmployeesResponse.result) {
            const allEmployees = Array.isArray(allEmployeesResponse.result) 
              ? allEmployeesResponse.result 
              : allEmployeesResponse.result.items || [];
            
            console.log('👨‍💼 All employees before filtering:', allEmployees);
            
            // 在前端過濾出屬於項目承包商的員工
            const projectEmployees = allEmployees.filter(employee => {
              const employeeContractorId = employee.contractor?._id || employee.contractor;
              const isMatch = contractorIds.includes(employeeContractorId);
              console.log(`🔍 Employee ${employee.name}: contractor=${employeeContractorId}, match=${isMatch}`);
              return isMatch;
            });
            
            console.log('✅ Filtered project employees:', projectEmployees);
            
            if (projectEmployees.length > 0) {
              setContractorEmployees(projectEmployees);
              console.log('✅ Set contractor employees:', projectEmployees);
            } else {
              setContractorEmployees([]);
              console.log('❌ No matching contractor employees found');
            }
          } else {
            setContractorEmployees([]);
            console.log('❌ Failed to fetch all employees');
          }
        } catch (error) {
          console.error('❌ Error fetching all employees:', error);
          setContractorEmployees([]);
        }
      } else {
        setContractorEmployees([]);
        console.log('❌ No contractors found in project');
      }
    } catch (error) {
      console.error('❌ Error fetching contractor employees:', error);
      message.error('載入承包商員工列表失敗: ' + error.message);
      setContractorEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (values) => {
    // 合併來自Quote的items和手動添加的items
    const allItems = [...selectedItems, ...manualItems];
    const itemsWithEmployees = allItems.filter(item => item.contractorEmployee);
    
    if (itemsWithEmployees.length === 0) {
      message.error('請為至少一個工作項目分配承包商員工');
      return;
    }

    const submitData = {
      projectId: values.projectId,
      invoiceNumber: values.invoiceNumber,
      poNumber: values.poNumber,
      completionDate: values.completionDate ? values.completionDate.format('YYYY-MM-DDTHH:mm:ss.SSSZ') : null,
      notes: values.notes,
      items: itemsWithEmployees, // 只提交已分配承包商員工的items
    };

    console.log('Submitting WorkProgress:', submitData);
    
    dispatch(erp.create({ 
      entity: 'workprogress', 
      jsonData: submitData 
    }));
  };

  // 處理item承包商員工分配
  const handleContractorEmployeeAssign = (itemId, employeeId, isManual = false) => {
    if (isManual) {
      const updatedItems = manualItems.map(item => 
        item._id === itemId ? { ...item, contractorEmployee: employeeId } : item
      );
      setManualItems(updatedItems);
    } else {
      const updatedItems = selectedItems.map(item => 
        item._id === itemId ? { ...item, contractorEmployee: employeeId } : item
      );
      setSelectedItems(updatedItems);
    }
  };

  // 添加手動工作項目
  const handleAddManualItem = (values) => {
    const newItem = {
      _id: `manual_${Date.now()}`, // 生成臨時ID
      itemName: values.itemName,
      description: values.description || '',
      quantity: values.quantity || 1,
      price: values.price || 0,
      total: (values.quantity || 1) * (values.price || 0),
      sourceQuote: '手動添加',
      sourceQuoteId: null,
      contractorEmployee: null,
      isManual: true
    };
    
    setManualItems([...manualItems, newItem]);
    setAddItemModalVisible(false);
    addItemForm.resetFields();
    message.success('工作項目添加成功');
  };

  // 刪除手動工作項目
  const handleDeleteManualItem = (itemId) => {
    setManualItems(manualItems.filter(item => item._id !== itemId));
  };

  // Items表格列
  const itemColumns = [
    {
      title: '項目名稱',
      dataIndex: 'itemName',
      key: 'itemName',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '數量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
    },
    {
      title: '單價',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price) => moneyFormatter({ amount: price }),
    },
    {
      title: '總計',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      render: (total) => moneyFormatter({ amount: total }),
    },
    {
      title: '來源Quote',
      dataIndex: 'sourceQuote',
      key: 'sourceQuote',
      width: 100,
    },
    {
      title: '分配承包商員工',
      key: 'contractorEmployee',
      width: 200,
      render: (_, record) => (
        <Select
          placeholder="選擇承包商員工"
          style={{ width: '100%' }}
          onChange={(value) => handleContractorEmployeeAssign(record._id, value, record.isManual)}
          value={record.contractorEmployee}
          options={contractorEmployees.map(employee => ({
            value: employee._id,
            label: `${employee.name} (${employee.contractor?.name || '未知承包商'})`
          }))}
          showSearch
          filterOption={(input, option) =>
            option?.label?.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => {
        if (record.isManual) {
          return (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteManualItem(record._id)}
              size="small"
            />
          );
        }
        return null;
      },
    },
  ];

  return (
    <ErpLayout>
      <PageHeader
        onBack={() => navigate(-1)}
        backIcon={<ArrowLeftOutlined />}
        title="創建WorkProgress"
        subTitle={`項目: ${(projectInfo?.invoiceNumber || invoiceNumber || '-')}`}
        ghost={false}
      />
      
      <Divider dashed />
      
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Row gutter={[12, 0]}>
          <Col span={8}>
            <Form.Item label="項目ID" name="projectId">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Invoice Number" name="invoiceNumber">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label={translate('P.O Number')} name="poNumber">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item 
              label="完工日期" 
              name="completionDate"
              rules={[{ required: true, message: '請選擇完工日期' }]}
            >
              <DatePicker 
                style={{ width: '100%' }}
                placeholder="選擇完工日期"
                onChange={(date) => {
                  if (date) {
                    const today = dayjs();
                    const diffDays = date.diff(today, 'days');
                    
                    if (diffDays >= 0 && diffDays <= 3) {
                      message.warning(`⚠️ 完工日期距離今天只有${diffDays}天，請注意時間安排！`);
                    }
                  }
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[12, 0]}>
          <Col span={24}>
            <div style={{ marginBottom: 16 }}>
              <p><strong>可選擇的承包商員工：</strong></p>
              <div>
                {contractorEmployees.length > 0 ? (
                  contractorEmployees.map(employee => (
                    <Tag key={employee._id} style={{ marginBottom: 4, marginRight: 4 }}>
                      {employee.name} ({employee.contractor?.name})
                    </Tag>
                  ))
                ) : (
                  <span style={{ color: '#999' }}>
                    {loading ? '載入中...' : '此項目的承包商沒有員工資料'}
                  </span>
                )}
              </div>
            </div>
          </Col>
        </Row>

        <Row gutter={[12, 0]}>
          <Col span={24}>
            <Form.Item label="備註" name="notes">
              <Input.TextArea rows={3} placeholder="工作備註..." />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">工作項目分配</Divider>
        <Card size="small">
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, color: '#666' }}>
              請為每個工作項目分配負責的承包商員工。只有分配了員工的項目才會創建WorkProgress。
            </p>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => setAddItemModalVisible(true)}
            >
              添加工作項目
            </Button>
          </div>
          
          <Table
            dataSource={[...selectedItems, ...manualItems]}
            columns={itemColumns}
            pagination={false}
            size="small"
            rowKey="_id"
            scroll={{ x: 800 }}
            locale={{ emptyText: '沒有工作項目，請點擊上方按鈕添加' }}
          />
        </Card>

        <Divider />
        
        <Row>
          <Col span={24} style={{ textAlign: 'right' }}>
            <Button style={{ marginRight: 8 }} onClick={() => navigate(-1)}>
              取消
            </Button>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
              創建WorkProgress
            </Button>
          </Col>
        </Row>
      </Form>

      {/* 添加工作項目Modal */}
      <Modal
        title="添加工作項目"
        open={addItemModalVisible}
        onCancel={() => {
          setAddItemModalVisible(false);
          addItemForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={addItemForm}
          layout="vertical"
          onFinish={handleAddManualItem}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="項目名稱"
                name="itemName"
                rules={[{ required: true, message: '請輸入項目名稱' }]}
              >
                <Input placeholder="例如：水泥、鋼筋等" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="數量"
                name="quantity"
                rules={[{ required: true, message: '請輸入數量' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="1" />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="單價"
                name="price"
                rules={[{ required: true, message: '請輸入單價' }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="描述" name="description">
                <Input placeholder="項目描述（可選）" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button style={{ marginRight: 8 }} onClick={() => {
              setAddItemModalVisible(false);
              addItemForm.resetFields();
            }}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              添加項目
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </ErpLayout>
  );
}
