import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, Button, Select, Divider, Row, Col, Switch, Table, AutoComplete, Modal, message } from 'antd';

import { PlusOutlined, DeleteOutlined, LinkOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { DatePicker } from 'antd';

import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import MoneyInputFormItem from '@/components/MoneyInputFormItem';
import { selectFinanceSettings } from '@/redux/settings/selectors';
import { useDate, useMoney } from '@/settings';
import useLanguage from '@/locale/useLanguage';

import calculate from '@/utils/calculate';
import { SERVICE_TYPE_OPTIONS } from '@/utils/serviceTypeAccountCode';
import { useSelector } from 'react-redux';
import { request } from '@/request';
import ContactPersonAutoComplete from '@/components/ContactPersonAutoComplete';

export default function InvoiceTableForm({ subTotal = 0, current = null }) {
  const { last_invoice_number } = useSelector(selectFinanceSettings);

  if (last_invoice_number === undefined) {
    return <></>;
  }

  return <LoadInvoiceTableForm subTotal={subTotal} current={current} />;
}

function LoadInvoiceTableForm({ subTotal: propSubTotal = 0, current = null }) {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const { moneyFormatter } = useMoney();
  const { last_invoice_number } = useSelector(selectFinanceSettings);
  const [lastNumber, setLastNumber] = useState(() => last_invoice_number + 1);
  const navigate = useNavigate();

  const [subTotal, setSubTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountTotal, setDiscountTotal] = useState(0);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [selectedType, setSelectedType] = useState('服務');
  
  // Item form states
  const [items, setItems] = useState([]);
  const [editingItemKey, setEditingItemKey] = useState(null);
  const [currentItem, setCurrentItem] = useState({
    itemName: '',
    description: '',
    quantity: 1,
    price: 0,
    total: 0
  });
  const [projectItems, setProjectItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientRecords, setClientRecords] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const form = Form.useFormInstance();
  const watchedClients = Form.useWatch('clients', form) || [];
  const quoteTypeValue = Form.useWatch('numberPrefix', form);
  const numberValue = Form.useWatch('number', form);
  const [quoteOptions, setQuoteOptions] = useState([]);
  const [quoteSearchLoading, setQuoteSearchLoading] = useState(false);

  // Payment due date = 所選日期 + Payment Terms 月數，該月最後一天
  const getPaymentDueDate = (dateVal, terms) => {
    if (!dateVal) return null;
    const d = dayjs.isDayjs(dateVal) ? dateVal : dayjs(dateVal);
    const monthsToAdd = { '即時付款': 0, '一個月': 1, '兩個月': 2, '三個月': 3 }[terms || '一個月'];
    return d.add(monthsToAdd, 'month').endOf('month');
  };
  const updatePaymentDueDateFromTerms = (termsValue) => {
    const dateVal = form.getFieldValue('date');
    const due = getPaymentDueDate(dateVal, termsValue);
    if (due) form.setFieldValue('paymentDueDate', due);
  };
  const onDateChange = () => {
    const terms = form.getFieldValue('paymentTerms');
    updatePaymentDueDateFromTerms(terms);
  };
  // 新增發票時依預設 date + paymentTerms 自動帶出 Payment due date
  useEffect(() => {
    if (current) return;
    const timer = setTimeout(() => {
      const d = form.getFieldValue('date');
      const t = form.getFieldValue('paymentTerms') || '一個月';
      if (d && t) {
        const due = getPaymentDueDate(d, t);
        if (due) form.setFieldValue('paymentDueDate', due);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [current]);

  // 注意：invoiceNumber 字段是用來搜索和選擇 Quote 的，不是 Invoice 自己的編號
  // Invoice 自己的編號會從 Quote Type + Number 自動生成（在後端處理）

  // 搜索 Quote Number（從 Quote 中搜索）
  const searchQuoteNumbers = async (searchText) => {
    if (!searchText || searchText.length < 1) {
      setQuoteOptions([]);
      return;
    }

    setQuoteSearchLoading(true);
    try {
      // 從 Quote 中搜索
      const response = await request.search({
        entity: 'quote',
        options: { q: searchText, fields: 'numberPrefix,number' }
      });

      const options = (response?.result || [])
        .map(quote => {
          // 使用 Quote Type + number 格式
          if (quote.numberPrefix && quote.number) {
            const quoteNumber = `${quote.numberPrefix}-${quote.number}`;
            return { value: quoteNumber, label: quoteNumber };
          }
          // 向後兼容：如果沒有 numberPrefix 和 number，使用 invoiceNumber
          if (quote.invoiceNumber) {
            return { value: quote.invoiceNumber, label: quote.invoiceNumber };
          }
          return null;
        })
        .filter(opt => opt !== null);

      setQuoteOptions(options);
    } catch (error) {
      console.error('搜索 Quote Number 失敗:', error);
      setQuoteOptions([]);
    } finally {
      setQuoteSearchLoading(false);
    }
  };
  
  const handleDiscountChange = (value) => {
    setDiscount(value || 0);
  };

  // 檢查 Quote Number 是否對應現有項目
  const checkExistingProject = async (invoiceNumber) => {
    if (!invoiceNumber || invoiceNumber.trim() === '') return;
    
    try {
      const result = await request.checkProject({ invoiceNumber: invoiceNumber.trim() });
      if (result.success && result.result) {
        const project = result.result;
        Modal.confirm({
          title: '發現相同 Quote Number 的項目',
          content: (
            <div>
              <p>發現已存在相同 Quote Number 的項目：</p>
              <ul>
                <li><strong>Quote Number:</strong> {project.invoiceNumber}</li>
                <li><strong>P.O Number:</strong> {project.poNumber || '未設定'}</li>
                <li><strong>描述:</strong> {project.description || '無描述'}</li>
                <li><strong>狀態:</strong> {project.status}</li>
                <li><strong>成本承擔方:</strong> {project.costBy}</li>
              </ul>
              <p>是否要在創建Invoice後自動關聯到此項目？</p>
            </div>
          ),
          okText: '是，創建後關聯',
          cancelText: '否，僅創建Invoice',
          icon: <LinkOutlined />,
          onOk: () => {
            message.info('Invoice創建後將自動關聯到項目');
            form.setFieldsValue({ shouldLinkToProject: project._id });
          },
          onCancel: () => {
            message.info('將僅創建Invoice，不關聯到項目');
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
    fetchSuppliers();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await request.listAll({ entity: 'client' });
      
      const clientData = response?.result;
      if (Array.isArray(clientData)) {
        setClientRecords(clientData);
        const clientOptions = clientData.map(client => ({
          value: client._id,
          label: client.name,
        }));
        setClients(clientOptions);
      } else {
        setClients([]);
        setClientRecords([]);
      }
    } catch (error) {
      console.error('獲取客戶列表失敗:', error);
      setClients([]);
      setClientRecords([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await request.listAll({ entity: 'supplier' });
      const data = response?.result;
      if (Array.isArray(data)) {
        setSuppliers(data.map(s => ({ value: s._id, label: s.name })));
      } else {
        setSuppliers([]);
      }
    } catch (error) {
      console.error('獲取供應商列表失敗:', error);
      setSuppliers([]);
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
        costPrice 
      } = current;
      
      setDiscount(discount);
      setCurrentYear(year);
      setLastNumber(number);
      setSelectedType(type);
      
      // 按 itemName 中的數字排序
      const sortedItems = [...currentItems].sort((a, b) => {
        const getNumber = (str) => {
          if (!str) return 0;
          const match = str.toString().match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        };
        const numA = getNumber(a.itemName);
        const numB = getNumber(b.itemName);
        if (numA !== numB) {
          return numA - numB;
        }
        // 如果數字相同，按字符串排序
        return (a.itemName || '').localeCompare(b.itemName || '');
      });
      
      // 確保每個 item 都有一個穩定的唯一 key
      setItems(sortedItems.map((item, index) => ({ 
        ...item, 
        key: item.key || item._id || `item-${index}-${Date.now()}` 
      })));
      
      // 計算subTotal（允許負數影響總額）
      let calculatedSubTotal = 0;
      if (currentItems && currentItems.length > 0) {
        currentItems.forEach((item) => {
          if (item && item.quantity != null && item.price !== undefined && item.price !== null) {
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
      
      const supplierId = current.supplier?._id || current.supplier || undefined;
      // 使用setTimeout確保在下一個事件循環中設置表單值
      setTimeout(() => {
        form.setFieldsValue({ 
          items: currentItems,
          clients: clientIds,
          supplier: supplierId,
          type: type,
          shipType: shipType,
          subcontractorCount: subcontractorCount,
          costPrice: costPrice
        });
      }, 100);
    }
  }, [current, form, clients]);

  // 計算subTotal當items改變時（允許負數影響總額）
  useEffect(() => {
    let newSubTotal = 0;
    if (items && items.length > 0) {
      items.forEach((item) => {
        if (item && item.quantity != null && item.price !== undefined && item.price !== null) {
          let itemTotal = calculate.multiply(item.quantity, item.price);
          newSubTotal = calculate.add(newSubTotal, itemTotal);
        }
      });
    }
    setSubTotal(newSubTotal);
    
    // 同步更新表單的items字段
    form.setFieldsValue({ items: items });
  }, [items, form]);

  useEffect(() => {
    const discountAmount = calculate.multiply(subTotal, discount / 100);
    const currentTotal = calculate.sub(subTotal, discountAmount);
    setDiscountTotal(Number.parseFloat(discountAmount));
    setTotal(Number.parseFloat(currentTotal));
  }, [subTotal, discount]);

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

  // 編輯項目
  const editItem = (record) => {
    const itemKey = record.key;
    if (!itemKey) {
      console.error('Item key is missing:', record);
      return;
    }
    setCurrentItem({
      itemName: record.itemName || '',
      description: record.description || '',
      quantity: record.quantity || 1,
      price: record.price || 0,
      total: record.total || 0
    });
    setEditingItemKey(itemKey);
  };

  // 添加或更新項目到列表
  const addItemToList = () => {
    // 允許正數（加數）或負數（減數），但不允許 0
    if (!currentItem.itemName || currentItem.quantity === null || currentItem.quantity === undefined || currentItem.quantity === 0) {
      return;
    }

    const itemTotal = calculate.multiply(currentItem.quantity, currentItem.price);
    
    let updatedItems;
    if (editingItemKey) {
      // 編輯模式：更新現有項目
      updatedItems = items.map(item => 
        item.key === editingItemKey 
          ? { ...currentItem, key: editingItemKey, total: itemTotal }
          : item
      );
      setEditingItemKey(null);
    } else {
      // 添加模式：添加新項目
      const newItem = {
        ...currentItem,
        key: Date.now(), // 用作唯一標識
        total: itemTotal
      };
      updatedItems = [...items, newItem];
    }

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

  // 移除項目
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
      width: '5%',
    },
    {
      title: translate('Description'),
      dataIndex: 'description',
      key: 'description',
      width: '45%',
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
      render: (price) => {
        // 如果是負數價格，用紅色顯示
        if (price < 0) {
          return <span style={{ color: '#ff4d4f' }}>{moneyFormatter({ amount: price || 0 })}</span>;
        }
        return moneyFormatter({ amount: price || 0 });
      },
    },
    {
      title: translate('Total'),
      dataIndex: 'total',
      key: 'total',
      width: '15%',
      render: (total) => {
        // 如果是負數總計，用紅色顯示
        if (total < 0) {
          return <span style={{ color: '#ff4d4f' }}>{moneyFormatter({ amount: total || 0 })}</span>;
        }
        return moneyFormatter({ amount: total || 0 });
      },
    },
    {
      title: translate('Action'),
      key: 'action',
      width: '8%',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => editItem(record)}
            size="small"
            style={{ color: '#1890ff' }}
          />
          <Button 
            type="text" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => removeItem(record.key)}
            size="small"
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={6}>
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
        <Col className="gutter-row" span={6}>
          <Form.Item
            name="supplier"
            label={translate('suppliers')}
          >
            <Select
              placeholder={translate('suppliers')}
              showSearch
              allowClear
              filterOption={(input, option) =>
                option?.label?.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
              options={suppliers}
              style={{ width: '100%' }}
              loading={loading}
              notFoundContent="No suppliers found"
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={3}>
          <Form.Item
            label="Invoice Type"
            name="numberPrefix"
            initialValue={current?.numberPrefix || 'SMI'}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Select
              placeholder="選擇 Invoice Type"
              options={
                current
                  ? [
                      { value: 'SML', label: 'SML' },
                      { value: 'QU', label: 'QU' },
                      { value: 'XX', label: 'XX' },
                      { value: 'INV', label: 'INV' },
                      { value: 'SMI', label: 'SMI' },
                      { value: 'WSE', label: 'WSE' },
                      { value: 'SP', label: 'SP' },
                    ]
                  : [
                      { value: 'SMI', label: 'SMI' },
                      { value: 'WSE', label: 'WSE' },
                      { value: 'SP', label: 'SP' },
                    ]
              }
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
            label="Service Type"
            name="type"
            initialValue="服務"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Select
              onChange={(value) => setSelectedType(value)}
              options={SERVICE_TYPE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: `${opt.label} (${opt.accountCode})`,
              }))}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={4}>
          <Form.Item
            label={translate('Status')}
            name="status"
            initialValue="sent"
          >
            <Select
              options={[
                { value: 'sent', label: translate('Sent') },
                { value: 'paid', label: translate('Paid') },
              ]}
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={5}>
          <Form.Item
            label={translate('Date')}
            name="date"
            initialValue={dayjs()}
            rules={[
              {
                required: true,
              },
            ]}
          >
            <DatePicker style={{ width: '100%' }} format={dateFormat} onChange={onDateChange} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={5}>
          <Form.Item label={translate('Note')} name="notes" style={{ display: selectedType === '服務' ? 'block' : 'none' }}>
            <Input.TextArea rows={1} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={4}>
          <Form.Item
            label={translate('Completed')}
            name="isCompleted"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={5}>
          <Form.Item label="Quote Number" name="invoiceNumber">
            <AutoComplete
              placeholder="搜索 Quote Number (從 Quote 中搜索)"
              options={quoteOptions}
              onSearch={searchQuoteNumbers}
              onSelect={(value) => checkExistingProject(value)}
              onBlur={(e) => checkExistingProject(e.target.value)}
              allowClear
              notFoundContent={quoteSearchLoading ? '搜索中...' : '無匹配的 Quote Number'}
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={5}>
          <Form.Item label={translate('P.O Number')} name="poNumber">
            <Input placeholder="輸入P.O Number" />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={5}>
          <Form.Item label={translate('Contact Person')} name="contactPerson">
            <ContactPersonAutoComplete
              clientIds={watchedClients}
              clientRecords={clientRecords}
              placeholder={translate('contact_person')}
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={5}>
          <Form.Item
            label={translate('Subcontractor Count')}
            name="subcontractorCount"
          >
            <InputNumber 
              min={0} 
              style={{ width: '100%' }} 
              placeholder="代工數"
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={5}>
          <Form.Item
            label={translate('Cost Price')}
            name="costPrice"
          >
            <InputNumber 
              min={0} 
              precision={2}
              style={{ width: '100%' }} 
              addonBefore="$"
              placeholder="成本價"
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={6} style={{ display: selectedType === '吊船' ? 'block' : 'none' }}>
          <Form.Item
            label={translate('Ship Type')}
            name="shipType"
          >
            <Select
              placeholder="選擇船舶類型"
              options={[
                { value: '續租', label: '續租' },
                { value: '租賃', label: '租賃' },
              ]}
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={12}>
          <Form.Item label={translate('Project Address')} name="address">
            <Input />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={6}>
          <Form.Item
            label={translate('project_percentage')}
            name="projectPercentage"
            tooltip={translate('project_percentage_hint')}
          >
            <InputNumber
              min={0}
              max={100}
              precision={2}
              style={{ width: '100%' }}
              placeholder="0–100"
              addonAfter="%"
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Invoice特有字段 */}
      <Divider orientation="left">付款信息</Divider>
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={6}>
          <Form.Item
            label={translate('Payment Status')}
            name="paymentStatus"
            initialValue="unpaid"
          >
            <Select
              options={[
                { value: 'unpaid', label: translate('Unpaid') },
                { value: 'paid', label: translate('Paid') },
              ]}
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={6}>
          <Form.Item label={translate('Payment Due Date')} name="paymentDueDate">
            <DatePicker style={{ width: '100%' }} format={dateFormat} />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={6}>
          <Form.Item
            label={translate('Payment Terms')}
            name="paymentTerms"
            initialValue="一個月"
          >
            <Select
              options={[
                { value: '即時付款', label: '即時付款' },
                { value: '一個月', label: '一個月' },
                { value: '兩個月', label: '兩個月' },
                { value: '三個月', label: '三個月' },
              ]}
              onChange={(value) => updatePaymentDueDateFromTerms(value)}
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={6}>
          <Form.Item
            label="部份付款 (Partially paid)"
            name="credit"
            initialValue={0}
          >
            <InputNumber
              min={0}
              precision={2}
              style={{ width: '100%' }}
              placeholder="0"
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={6}>
          <Form.Item label={translate('paid_date')} name="paidDate">
            <DatePicker style={{ width: '100%' }} format={dateFormat} placeholder={translate('paid_date')} />
          </Form.Item>
        </Col>
      </Row>

      <Divider dashed />

      {/* Add Item Section */}
      <div style={{ marginBottom: 16, padding: '16px', backgroundColor: '#fafafa', borderRadius: '6px' }}>
        <h4 style={{ marginBottom: 12 }}>添加項目</h4>
        <Row gutter={[12, 8]}>
          <Col span={2}>
            <label>項目名稱</label>
            <AutoComplete
              placeholder="選擇項目"
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
          <Col span={11}>
            <label>描述</label>
            <Input.TextArea
              placeholder="描述（Shift+Enter 換行）"
              value={currentItem.description}
              onChange={(e) => updateCurrentItem('description', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) e.preventDefault();
              }}
              rows={2}
              autoSize={{ minRows: 2, maxRows: 6 }}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={3}>
            <label>數量</label>
            <InputNumber 
              placeholder="數量（正=加，負=減）"
              value={currentItem.quantity}
              onChange={(value) => updateCurrentItem('quantity', value)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={3}>
            <label>價格</label>
            <InputNumber
              placeholder="價格（可輸入負數）"
              value={currentItem.price}
              onChange={(value) => updateCurrentItem('price', value)}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={2} style={{ display: 'flex', alignItems: 'end' }}>
            <Button 
              type="primary" 
              icon={editingItemKey ? <EditOutlined /> : <PlusOutlined />} 
              onClick={addItemToList}
              disabled={!currentItem.itemName || currentItem.quantity === null || currentItem.quantity === undefined || currentItem.quantity === 0}
              style={{ marginTop: '22px', width: '100%' }}
              key={editingItemKey ? 'update-btn' : 'add-btn'}
            >
              {editingItemKey ? translate('Update') : ''}
            </Button>
          </Col>
        </Row>
      </div>

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
