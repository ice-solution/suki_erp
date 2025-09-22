import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, Button, Select, Divider, Row, Col, Switch, Table, AutoComplete, Modal, message, Upload } from 'antd';

import { PlusOutlined, DeleteOutlined, LinkOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { DatePicker } from 'antd';

import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import MoneyInputFormItem from '@/components/MoneyInputFormItem';
import { selectFinanceSettings } from '@/redux/settings/selectors';
import { useDate, useMoney } from '@/settings';
import useLanguage from '@/locale/useLanguage';

import calculate from '@/utils/calculate';
import { useSelector } from 'react-redux';
import { request } from '@/request';

export default function SupplierQuoteTableForm({ subTotal = 0, current = null }) {
  const { last_supplier_quote_number } = useSelector(selectFinanceSettings);

  // 即使沒有設置也允許顯示表單，使用默認值
  return <LoadSupplierQuoteTableForm subTotal={subTotal} current={current} />;
}

function LoadSupplierQuoteTableForm({ subTotal: propSubTotal = 0, current = null }) {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const { moneyFormatter } = useMoney();
  const financeSettings = useSelector(selectFinanceSettings);
  const { last_supplier_quote_number } = financeSettings || {};
  const [lastNumber, setLastNumber] = useState(() => (last_supplier_quote_number || 0) + 1);
  const navigate = useNavigate();

  const [subTotal, setSubTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountTotal, setDiscountTotal] = useState(0);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [selectedType, setSelectedType] = useState('服務');
  
  // Item form states
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    itemName: '',
    description: '',
    quantity: 1,
    price: 0,
    total: 0
  });
  const [projectItems, setProjectItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // File upload states
  const [dmFileList, setDmFileList] = useState([]);
  const [invoiceFileList, setInvoiceFileList] = useState([]);
  
  const form = Form.useFormInstance();
  
  const handleDiscountChange = (value) => {
    setDiscount(value || 0);
  };

  // File upload handlers
  const handleDmFileChange = ({ fileList }) => {
    setDmFileList(fileList);
  };

  const handleInvoiceFileChange = ({ fileList }) => {
    setInvoiceFileList(fileList);
  };

  const beforeUpload = (file) => {
    // Don't upload automatically, just add to list
    return false;
  };

  const validateInvoiceFile = (file) => {
    const isValidType = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type);
    if (!isValidType) {
      message.error('只能上傳 PDF 或 JPG/PNG 格式的文件！');
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超過 10MB！');
    }
    return isValidType && isLt10M;
  };

  // 檢查P.O Number是否對應現有項目
  const checkExistingProject = async (poNumber) => {
    if (!poNumber || poNumber.trim() === '') return;
    
    try {
      const result = await request.checkProject({ poNumber: poNumber.trim() });
      if (result.success && result.result) {
        const project = result.result;
        Modal.confirm({
          title: '發現相同P.O Number的項目',
          content: (
            <div>
              <p>發現已存在相同P.O Number的項目：</p>
              <ul>
                <li><strong>P.O Number:</strong> {project.poNumber}</li>
                <li><strong>描述:</strong> {project.description || '無描述'}</li>
                <li><strong>狀態:</strong> {project.status}</li>
                <li><strong>成本承擔方:</strong> {project.costBy}</li>
              </ul>
              <p>是否要在創建Supplier Quote後自動關聯到此項目？</p>
            </div>
          ),
          okText: '是，創建後關聯',
          cancelText: '否，僅創建Supplier Quote',
          icon: <LinkOutlined />,
          onOk: () => {
            message.info('Supplier Quote創建後將自動關聯到項目');
            form.setFieldsValue({ shouldLinkToProject: project._id });
          },
          onCancel: () => {
            message.info('將僅創建Supplier Quote，不關聯到項目');
          },
        });
      }
    } catch (error) {
      console.log('檢查項目時出錯:', error);
      // 靜默處理錯誤，不影響用戶體驗
    }
  };

  // 獲取工程項目列表和客戶列表
  useEffect(() => {
    fetchProjectItems();
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await request.listAll({ entity: 'client' });
      console.log('客戶API響應:', response);
      
      // 確保result是數組
      const clientData = response?.result;
      if (Array.isArray(clientData)) {
        const clientOptions = clientData.map(client => ({
          value: client._id,
          label: client.name,
        }));
        setClients(clientOptions);
        console.log('客戶選項:', clientOptions);
      } else {
        console.warn('客戶數據不是數組格式:', clientData);
        setClients([]);
      }
    } catch (error) {
      console.error('獲取客戶列表失敗:', error);
      setClients([]);
    }
  };

  const fetchProjectItems = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching ProjectItems from API...');
      
      // 使用真實的ProjectItem API
      const response = await request.list({ 
        entity: 'projectitem',
        options: { 
          items: 100 // 獲取更多項目
        }
      });
      
      console.log('📋 ProjectItem API response:', response);
      
      if (response.success && response.result?.items) {
        // 轉換API數據格式為組件期望的格式
        const apiProjectItems = response.result.items.map(item => ({
          item_name: item.itemName,
          price: item.price,
          description: item.description,
          category: item.category,
          unit: item.unit,
          _id: item._id
        }));
        setProjectItems(apiProjectItems);
        console.log(`✅ Loaded ${apiProjectItems.length} ProjectItems from API`);
      } else {
        console.warn('❌ ProjectItem API failed, using fallback mock data');
        // 如果API失敗，使用備用的模擬數據
        const fallbackItems = [
          { item_name: '水泥', price: 500, description: '高級水泥', category: '建材' },
          { item_name: '鋼筋', price: 800, description: '建築用鋼筋', category: '建材' },
          { item_name: '磚塊', price: 200, description: '紅磚', category: '建材' },
          { item_name: '玻璃', price: 300, description: '建築玻璃', category: '建材' },
          { item_name: '木材', price: 600, description: '建築木材', category: '建材' },
          { item_name: '油漆', price: 150, description: '內牆油漆', category: '建材' },
          { item_name: '電線', price: 100, description: '電力線材', category: '設備' },
          { item_name: '管道', price: 250, description: '水管', category: '設備' },
        ];
        setProjectItems(fallbackItems);
      }
    } catch (error) {
      console.error('❌ Error fetching ProjectItems:', error);
      // 使用備用的模擬數據
      const fallbackItems = [
        { item_name: '水泥', price: 500, description: '高級水泥', category: '建材' },
        { item_name: '鋼筋', price: 800, description: '建築用鋼筋', category: '建材' },
        { item_name: '磚塊', price: 200, description: '紅磚', category: '建材' },
        { item_name: '玻璃', price: 300, description: '建築玻璃', category: '建材' },
        { item_name: '木材', price: 600, description: '建築木材', category: '建材' },
        { item_name: '油漆', price: 150, description: '內牆油漆', category: '建材' },
        { item_name: '電線', price: 100, description: '電力線材', category: '設備' },
        { item_name: '管道', price: 250, description: '水管', category: '設備' },
      ];
      setProjectItems(fallbackItems);
    } finally {
      setLoading(false);
    }
  };

  // 單獨處理current客戶數據，確保客戶選項正確顯示
  useEffect(() => {
    if (current) {
      const { 
        clients: currentClients = [], 
      } = current;
      
      // 處理客戶數據（新舊格式兼容）
      let clientsToAdd = [];
      
      if (currentClients && Array.isArray(currentClients) && currentClients.length > 0) {
        // 新格式：clients數組
        currentClients.forEach(client => {
          if (client && client._id && client.name) {
            clientsToAdd.push({
              value: client._id,
              label: client.name
            });
          }
        });
      } else if (current.client) {
        // 舊格式：單個client字段
        if (current.client && current.client._id && current.client.name) {
          clientsToAdd.push({
            value: current.client._id,
            label: current.client.name
          });
        }
      }
      
      // 如果有需要添加的客戶選項，合併到現有選項中
      if (clientsToAdd.length > 0) {
        setClients(prevClients => {
          const existingIds = prevClients.map(c => c.value);
          const newClients = clientsToAdd.filter(c => !existingIds.includes(c.value));
          return [...prevClients, ...newClients];
        });
      }
    }
  }, [current]);

  // 延遲設置表單值，確保clients選項已經載入
  useEffect(() => {
    if (current && clients.length > 0) {
      const { 
        discount = 0, 
        year, 
        number, 
        type = '服務',
        items: currentItems = [], 
        clients: currentClients = [], 
        subTotal: currentSubTotal = 0,
        shipType,
        subcontractorCount,
        costPrice,
        warehouse 
      } = current;
      
      setDiscount(discount);
      setCurrentYear(year);
      setLastNumber(number);
      setSelectedType(type);
      setItems(currentItems.map((item, index) => ({ ...item, key: index })));
      
      // 計算subTotal或使用現有的subTotal
      let calculatedSubTotal = 0;
      if (currentItems && currentItems.length > 0) {
        currentItems.forEach((item) => {
          if (item && item.quantity && item.price) {
            let itemTotal = calculate.multiply(item.quantity, item.price);
            calculatedSubTotal = calculate.add(calculatedSubTotal, itemTotal);
          }
        });
      }
      setSubTotal(calculatedSubTotal || currentSubTotal);
      
      // 處理客戶數據（新舊格式兼容）
      let clientIds = [];
      
      if (currentClients && Array.isArray(currentClients) && currentClients.length > 0) {
        // 新格式：clients數組
        clientIds = currentClients.map(client => client._id || client);
      } else if (current.client) {
        // 舊格式：單個client字段
        clientIds = [current.client._id || current.client];
      }
      
      // 使用setTimeout確保在下一個事件循環中設置表單值
      setTimeout(() => {
        form.setFieldsValue({ 
          items: currentItems,
          clients: clientIds,
          type: type,
          shipType: shipType,
          subcontractorCount: subcontractorCount,
          costPrice: costPrice,
          warehouse: warehouse
        });
      }, 100);
    }
  }, [current, form, clients]);

  // 計算subTotal當items改變時
  useEffect(() => {
    let newSubTotal = 0;
    if (items && items.length > 0) {
      items.forEach((item) => {
        if (item && item.quantity && item.price) {
          let itemTotal = calculate.multiply(item.quantity, item.price);
          newSubTotal = calculate.add(newSubTotal, itemTotal);
        }
      });
    }
    setSubTotal(newSubTotal);
    
    // 更新表單的items字段
    form.setFieldsValue({ items: items });
  }, [items, form]);

  useEffect(() => {
    const discountAmount = calculate.multiply(subTotal, discount / 100);
    const currentTotal = calculate.sub(subTotal, discountAmount);
    setDiscountTotal(Number.parseFloat(discountAmount));
    setTotal(Number.parseFloat(currentTotal));
  }, [subTotal, discount]);

  // 同步文件列表到表單
  useEffect(() => {
    form.setFieldsValue({
      dmFiles: dmFileList,
      invoiceFiles: invoiceFileList
    });
  }, [dmFileList, invoiceFileList, form]);

  // 處理項目選擇
  const handleItemSelect = (value, option) => {
    const selectedItem = projectItems.find(item => item.item_name === value);
    if (selectedItem) {
      setCurrentItem({
        ...currentItem,
        itemName: selectedItem.item_name,
        price: selectedItem.price || 0,
        total: calculate.multiply(currentItem.quantity, selectedItem.price || 0)
      });
    }
  };

  // 搜索工程項目
  const handleSearch = (searchText) => {
    if (!searchText) {
      return projectItems.map(item => ({
        value: item.item_name,
        label: `${item.item_name} - ${item.price ? `$${item.price}` : '無價格'}`
      }));
    }
    
    return projectItems
      .filter(item => 
        item.item_name.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchText.toLowerCase()))
      )
      .map(item => ({
        value: item.item_name,
        label: `${item.item_name} - ${item.price ? `$${item.price}` : '無價格'}`
      }));
  };

  // 更新當前項目
  const updateCurrentItem = (field, value) => {
    const updatedItem = { ...currentItem, [field]: value };
    
    if (field === 'quantity' || field === 'price') {
      updatedItem.total = calculate.multiply(updatedItem.quantity, updatedItem.price);
    }
    
    setCurrentItem(updatedItem);
  };

  // 添加項目到列表
  const addItemToList = () => {
    if (!currentItem.itemName || currentItem.quantity <= 0 || currentItem.price < 0) {
      return;
    }

    const newItem = {
      ...currentItem,
      key: Date.now(), // 用作唯一標識
      total: calculate.multiply(currentItem.quantity, currentItem.price)
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    form.setFieldsValue({ items: updatedItems });

    // 重置當前項目
    setCurrentItem({
      itemName: '',
      description: '',
      quantity: 1,
      price: 0,
      total: 0
    });
  };

  // 刪除項目
  const removeItem = (key) => {
    const updatedItems = items.filter(item => item.key !== key);
    setItems(updatedItems);
    form.setFieldsValue({ items: updatedItems });
  };

  // Table columns
  const columns = [
    {
      title: translate('Item'),
      dataIndex: 'itemName',
      key: 'itemName',
      width: '25%',
    },
    {
      title: translate('Description'),
      dataIndex: 'description',
      key: 'description',
      width: '30%',
    },
    {
      title: translate('Quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: '15%',
    },
    {
      title: translate('Price'),
      dataIndex: 'price',
      key: 'price',
      width: '15%',
      render: (price) => moneyFormatter({ amount: price }),
    },
    {
      title: translate('Total'),
      dataIndex: 'total',
      key: 'total',
      width: '10%',
      render: (total) => moneyFormatter({ amount: total }),
    },
    {
      title: '',
      key: 'action',
      width: '5%',
      render: (_, record) => (
        <DeleteOutlined 
          onClick={() => removeItem(record.key)} 
          style={{ color: 'red', cursor: 'pointer' }}
        />
      ),
    },
  ];

  return (
    <>
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={8}>
          <Form.Item
            name="clients"
            label={translate('Clients')}
            rules={[
              {
                required: true,
                message: 'Please select at least one client',
              },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Select clients"
              showSearch
              filterOption={(input, option) =>
                option?.label?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
              options={clients}
              style={{ width: '100%' }}
              loading={loading}
              notFoundContent="No clients found"
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={3}>
          <Form.Item
            label={translate('Type')}
            name="numberPrefix"
            initialValue="QU"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Select
              options={[
                { value: 'SML', label: 'SML' },
                { value: 'QU', label: 'QU' },
                { value: 'XX', label: 'XX' },
              ]}
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={4}>
          <Form.Item
            label={translate('number')}
            name="number"
            initialValue={lastNumber.toString()}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={4}>
          <Form.Item
            label={translate('year')}
            name="year"
            initialValue={currentYear}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
        </Col>

        <Col className="gutter-row" span={5}>
          <Form.Item
            label={translate('Type')}
            name="type"
            rules={[
              {
                required: true,
              },
            ]}
            initialValue={'服務'}
          >
            <Select
              onChange={(value) => setSelectedType(value)}
              options={[
                { value: '人工', label: '人工' },
                { value: '服務', label: '服務' },
                { value: '材料', label: '材料' },
                { value: '服務&材料', label: '服務&材料' },
                { value: '吊船', label: '吊船' },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={6}>
          <Form.Item
            label={translate('status')}
            name="status"
            rules={[
              {
                required: false,
              },
            ]}
            initialValue={'draft'}
          >
            <Select
              options={[
                { value: 'draft', label: translate('Draft') },
                { value: 'pending', label: translate('Pending') },
                { value: 'sent', label: translate('Sent') },
                { value: 'accepted', label: translate('Accepted') },
                { value: 'declined', label: translate('Declined') },
              ]}
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={6}>
          <Form.Item
            name="date"
            label={translate('Date')}
            rules={[
              {
                required: true,
                type: 'object',
              },
            ]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: '100%' }} format={dateFormat} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={6}>
          <Form.Item
            name="expiredDate"
            label={translate('Expire Date')}
            rules={[
              {
                required: false,
                type: 'object',
              },
            ]}
            initialValue={dayjs().add(30, 'days')}
          >
            <DatePicker style={{ width: '100%' }} format={dateFormat} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={6}>
          {selectedType === '吊船' ? (
            <Form.Item 
              label={translate('Ship Type')} 
              name="shipType"
              rules={[{ required: selectedType === '吊船', message: 'Please select ship type' }]}
            >
              <Select
                placeholder="選擇類型"
                options={[
                  { value: '續租', label: '續租' },
                  { value: '租貨', label: '租貨' },
                ]}
              />
            </Form.Item>
          ) : (
            <Form.Item label={translate('Note')} name="notes">
              <Input />
            </Form.Item>
          )}
        </Col>
      </Row>
      
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={6}>
          <Form.Item
            label={translate('Completed')}
            name="isCompleted"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={6}>
          <Form.Item label={translate('P.O Number')} name="poNumber">
            <Input onBlur={(e) => checkExistingProject(e.target.value)} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={6}>
          <Form.Item label={translate('Contact Person')} name="contactPerson">
            <Input />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={6}>
          <Form.Item 
            label={translate('Subcontractor Count')} 
            name="subcontractorCount"
          >
            <InputNumber 
              min={0}
              placeholder="代工數"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={6}>
          <Form.Item 
            label={translate('Cost Price')} 
            name="costPrice"
          >
            <InputNumber 
              min={0}
              precision={2}
              placeholder="成本價"
              style={{ width: '100%' }}
              addonBefore="$"
            />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={12}>
          <Form.Item label={translate('Project Address')} name="address">
            <Input />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={6}>
          <Form.Item label={translate('Warehouse')} name="warehouse">
            <Select
              placeholder="選擇倉庫"
              options={[
                { value: 'A', label: '倉A' },
                { value: 'B', label: '倉B' },
                { value: 'C', label: '倉C' },
                { value: 'D', label: '倉D' },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left">文件上傳</Divider>
      
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={12}>
          <Form.Item label="DM文件" name="dmFiles">
            <Upload
              multiple
              beforeUpload={beforeUpload}
              onChange={handleDmFileChange}
              fileList={dmFileList}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            >
              <Button icon={<UploadOutlined />}>選擇DM文件</Button>
            </Upload>
            <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
              支持 PDF、DOC、XLS、JPG、PNG 格式
            </div>
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={12}>
          <Form.Item label="Invoice文件" name="invoiceFiles">
            <Upload
              multiple
              beforeUpload={(file) => {
                if (validateInvoiceFile(file)) {
                  return false; // Don't upload automatically
                }
                return Upload.LIST_IGNORE; // Ignore invalid files
              }}
              onChange={handleInvoiceFileChange}
              fileList={invoiceFileList}
              accept=".pdf,.jpg,.jpeg,.png"
            >
              <Button icon={<UploadOutlined />}>選擇Invoice文件</Button>
            </Upload>
            <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
              只支持 PDF 或 JPG/PNG 格式，最大 10MB
            </div>
          </Form.Item>
        </Col>
      </Row>

      <Divider dashed />

      {/* Item Input Form */}
      <Row gutter={[12, 12]} style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '6px', marginBottom: '16px' }}>
        <Col span={24}>
          <h4>{translate('Add Item')}</h4>
        </Col>
        <Col span={5}>
          <AutoComplete
            placeholder="輸入項目名稱搜索..."
            onSearch={handleSearch}
            onSelect={handleItemSelect}
            value={currentItem.itemName}
            onChange={(value) => updateCurrentItem('itemName', value)}
            loading={loading}
            showSearch
            filterOption={false}
            options={handleSearch('')}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={7}>
          <Input 
            placeholder="描述"
            value={currentItem.description}
            onChange={(e) => updateCurrentItem('description', e.target.value)}
          />
        </Col>
        <Col span={3}>
          <InputNumber 
            placeholder="數量"
            min={1}
            value={currentItem.quantity}
            onChange={(value) => updateCurrentItem('quantity', value)}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={4}>
          <InputNumber
            placeholder="價格"
            min={0}
            value={currentItem.price}
            onChange={(value) => updateCurrentItem('price', value)}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={4}>
          <InputNumber
            placeholder="總計"
            value={currentItem.total}
            readOnly
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={1}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={addItemToList}
            disabled={!currentItem.itemName || currentItem.quantity <= 0}
          />
        </Col>
      </Row>

      {/* Items Table */}
      <Table
        dataSource={items}
        columns={columns}
        pagination={false}
        size="small"
        rowKey={(record, index) => record.key || index}
        locale={{ emptyText: translate('No items added') }}
      />

      {/* Hidden Form Items for submission */}
      <Form.Item name="items" style={{ display: 'none' }}>
        <Input />
      </Form.Item>
      <Form.Item name="shouldLinkToProject" style={{ display: 'none' }}>
        <Input />
      </Form.Item>
      <Form.Item name="dmFiles" style={{ display: 'none' }}>
        <Input />
      </Form.Item>
      <Form.Item name="invoiceFiles" style={{ display: 'none' }}>
        <Input />
      </Form.Item>

      <Divider dashed />
      
      <div style={{ position: 'relative', width: ' 100%', float: 'right' }}>
        <Row gutter={[12, -5]}>
          <Col className="gutter-row" span={5}>
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />} block>
                {translate('Save')}
              </Button>
            </Form.Item>
          </Col>
          <Col className="gutter-row" span={4} offset={10}>
            <p
              style={{
                paddingLeft: '12px',
                paddingTop: '5px',
                margin: 0,
                textAlign: 'right',
              }}
            >
              {translate('Sub Total')} :
            </p>
          </Col>
          <Col className="gutter-row" span={5}>
            <MoneyInputFormItem readOnly value={subTotal} />
          </Col>
        </Row>
        <Row gutter={[12, -5]}>
          <Col className="gutter-row" span={4} offset={15}>
            <p
              style={{
                paddingLeft: '12px',
                paddingTop: '5px',
                margin: 0,
                textAlign: 'right',
              }}
            >
              {translate('Discount')} (%) :
            </p>
          </Col>
          <Col className="gutter-row" span={5}>
            <Form.Item
              name="discount"
              rules={[
                {
                  required: false,
                },
              ]}
            >
              <InputNumber
                min={0}
                max={100}
                precision={0}
                style={{ width: '100%' }}
                onChange={handleDiscountChange}
                placeholder="0"
                formatter={(value) => `${value}`}
                parser={(value) => value.replace('%', '')}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={[12, -5]}>
          <Col className="gutter-row" span={4} offset={15}>
            <p
              style={{
                paddingLeft: '12px',
                paddingTop: '5px',
                margin: 0,
                textAlign: 'right',
              }}
            >
              {translate('Discount Amount')} :
            </p>
          </Col>
          <Col className="gutter-row" span={5}>
            <MoneyInputFormItem readOnly value={discountTotal} />
          </Col>
        </Row>
        <Row gutter={[12, -5]}>
          <Col className="gutter-row" span={4} offset={15}>
            <p
              style={{
                paddingLeft: '12px',
                paddingTop: '5px',
                margin: 0,
                textAlign: 'right',
              }}
            >
              {translate('Total')} :
            </p>
          </Col>
          <Col className="gutter-row" span={5}>
            <MoneyInputFormItem readOnly value={total} />
          </Col>
        </Row>
      </div>
    </>
  );
}
