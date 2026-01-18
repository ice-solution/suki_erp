import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, Button, Select, Divider, Row, Col, Switch, Table, AutoComplete, Modal, message, Upload } from 'antd';

import { PlusOutlined, DeleteOutlined, LinkOutlined, UploadOutlined, InboxOutlined, EditOutlined } from '@ant-design/icons';
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
  const [loading, setLoading] = useState(false);
  
  // Materials form states
  const [materials, setMaterials] = useState([]);
  const [editingMaterialKey, setEditingMaterialKey] = useState(null);
  const [currentMaterial, setCurrentMaterial] = useState({
    warehouse: '',
    itemName: '',
    quantity: 1,
    unitPrice: 0, // 單價
    price: 0 // 總價（quantity * unitPrice）
  });
  const [warehouseItems, setWarehouseItems] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  
  // Ships and Winches form states
  const [selectedShip, setSelectedShip] = useState(null); // Stores the selected ship ID
  const [selectedShipName, setSelectedShipName] = useState(null); // Stores the selected ship name
  const [selectedWinch, setSelectedWinch] = useState(null); // Stores the selected winch ID
  const [selectedWinchName, setSelectedWinchName] = useState(null); // Stores the selected winch name
  const [ships, setShips] = useState([]);
  const [winches, setWinches] = useState([]);
  const [shipsLoading, setShipsLoading] = useState(false);
  const [winchesLoading, setWinchesLoading] = useState(false);
  
  // File upload states
  const [dmFileList, setDmFileList] = useState([]);
  const [invoiceFileList, setInvoiceFileList] = useState([]);
  
  const form = Form.useFormInstance();
  const [invoiceOptions, setInvoiceOptions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const searchInvoiceNumbers = async (searchText) => {
    if (!searchText || searchText.length < 1) {
      setInvoiceOptions([]);
      return;
    }

    setSearchLoading(true);
    try {
      // 只從 Quote 中搜索
      const response = await request.search({
        entity: 'quote',
        options: { q: searchText, fields: 'numberPrefix,number' }
      });

      const options = (response?.result || [])
        .map(quote => {
          // 優先使用 Quote Type + number 格式
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

      setInvoiceOptions(options);
    } catch (error) {
      console.error('搜索 Quote Number 失敗:', error);
      setInvoiceOptions([]);
    } finally {
      setSearchLoading(false);
    }
  };
  
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
    fetchWarehouseItems();
    fetchShips();
    fetchWinches();
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

  const fetchWarehouseItems = async (selectedWarehouse = null) => {
    try {
      setMaterialsLoading(true);
      console.log('🔍 Fetching Warehouse Items from API...', selectedWarehouse ? `for warehouse ${selectedWarehouse}` : 'all warehouses');
      
      // 如果選擇「其他」，不從 API 獲取數據
      if (selectedWarehouse === '其他') {
        setWarehouseItems([]);
        setMaterialsLoading(false);
        return;
      }
      
      // 使用正確的倉庫 API
      const entity = selectedWarehouse 
        ? `warehouse?warehouse=${selectedWarehouse}` 
        : 'warehouse';
      const response = await request.get({ entity });
      
      console.log('📦 Warehouse Items API response:', response);
      
      if (response.success && response.result) {
        // 轉換API數據格式為組件期望的格式
        const apiWarehouseItems = response.result.map(item => ({
          itemName: item.itemName,
          warehouse: item.warehouse,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          description: item.description,
          _id: item._id
        }));
        setWarehouseItems(apiWarehouseItems);
        console.log(`✅ Loaded ${apiWarehouseItems.length} Warehouse Items from API`);
      } else {
        console.warn('❌ Warehouse Items API failed, using fallback mock data');
        // 如果API失敗，使用備用的模擬數據
        const fallbackItems = [
          { itemName: '不鏽鋼板', warehouse: 'A', quantity: 50, unitPrice: 1000, description: '304不鏽鋼板' },
          { itemName: '鋁合金', warehouse: 'A', quantity: 30, unitPrice: 800, description: '6061鋁合金' },
          { itemName: '水泥', warehouse: 'B', quantity: 100, unitPrice: 500, description: '高級水泥' },
          { itemName: '鋼筋', warehouse: 'B', quantity: 80, unitPrice: 800, description: '建築用鋼筋' },
          { itemName: '磚塊', warehouse: 'C', quantity: 200, unitPrice: 200, description: '紅磚' },
          { itemName: '玻璃', warehouse: 'C', quantity: 40, unitPrice: 300, description: '建築玻璃' },
          { itemName: '木材', warehouse: 'D', quantity: 60, unitPrice: 600, description: '建築木材' },
          { itemName: '油漆', warehouse: 'D', quantity: 25, unitPrice: 150, description: '內牆油漆' },
        ];
        setWarehouseItems(fallbackItems);
      }
    } catch (error) {
      console.error('❌ Error fetching Warehouse Items:', error);
      // 使用備用的模擬數據
      const fallbackItems = [
        { itemName: '不鏽鋼板', warehouse: 'A', quantity: 50, unitPrice: 1000, description: '304不鏽鋼板' },
        { itemName: '鋁合金', warehouse: 'A', quantity: 30, unitPrice: 800, description: '6061鋁合金' },
        { itemName: '水泥', warehouse: 'B', quantity: 100, unitPrice: 500, description: '高級水泥' },
        { itemName: '鋼筋', warehouse: 'B', quantity: 80, unitPrice: 800, description: '建築用鋼筋' },
        { itemName: '磚塊', warehouse: 'C', quantity: 200, unitPrice: 200, description: '紅磚' },
        { itemName: '玻璃', warehouse: 'C', quantity: 40, unitPrice: 300, description: '建築玻璃' },
        { itemName: '木材', warehouse: 'D', quantity: 60, unitPrice: 600, description: '建築木材' },
        { itemName: '油漆', warehouse: 'D', quantity: 25, unitPrice: 150, description: '內牆油漆' },
      ];
      setWarehouseItems(fallbackItems);
    } finally {
      setMaterialsLoading(false);
    }
  };

  // 獲取狀態為「正常」的船隻列表
  const fetchShips = async () => {
    try {
      setShipsLoading(true);
      const response = await request.listAll({ entity: 'ship' });
      if (response.success && Array.isArray(response.result)) {
        // 只過濾 status = 'normal' 的船隻
        const normalShips = response.result.filter(ship => ship.status === 'normal');
        const shipOptions = normalShips.map(ship => ({
          value: ship._id,
          label: ship.name || ship.registrationNumber || '未命名船隻',
          ...ship
        }));
        setShips(shipOptions);
      }
    } catch (error) {
      console.error('獲取船隻列表失敗:', error);
      setShips([]);
    } finally {
      setShipsLoading(false);
    }
  };

  // 獲取狀態為「正常」的爬攬器列表
  const fetchWinches = async () => {
    try {
      setWinchesLoading(true);
      const response = await request.listAll({ entity: 'winch' });
      if (response.success && Array.isArray(response.result)) {
        // 只過濾 status = 'normal' 的爬攬器
        const normalWinches = response.result.filter(winch => winch.status === 'normal');
        const winchOptions = normalWinches.map(winch => ({
          value: winch._id,
          label: winch.name || winch.serialNumber || '未命名爬攬器',
          ...winch
        }));
        setWinches(winchOptions);
      }
    } catch (error) {
      console.error('獲取爬攬器列表失敗:', error);
      setWinches([]);
    } finally {
      setWinchesLoading(false);
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
        materials: currentMaterials = [],
        clients: currentClients = [], 
        subTotal: currentSubTotal = 0,
        shipType,
        ship: currentShip,
        winch: currentWinch
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
      setMaterials(currentMaterials.map((material, index) => ({ ...material, key: index })));
      
      // 計算subTotal或使用現有的subTotal（計算 materials 和 items）
      let calculatedSubTotal = 0;
      
      // 計算 materials 的總計
      if (currentMaterials && currentMaterials.length > 0) {
        currentMaterials.forEach((material) => {
          // price 現在已經是總價（quantity * unitPrice），直接使用
          if (material && material.price) {
            let materialTotal = material.price;
            // 保留小數點後2位
            materialTotal = Number.parseFloat(materialTotal.toFixed(2));
            calculatedSubTotal = calculate.add(calculatedSubTotal, materialTotal);
          }
        });
      }
      
      // 計算 items 的總計（負數會自動減去）
      if (currentItems && currentItems.length > 0) {
        currentItems.forEach((item) => {
          if (item && item.quantity && item.price !== undefined && item.price !== null) {
            // 允許負數價格，負數會自動從總數中減去
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
          materials: currentMaterials,
          clients: clientIds,
          type: type,
          shipType: shipType,
          ship: currentShip ? (currentShip._id || currentShip) : null,
          winch: currentWinch ? (currentWinch._id || currentWinch) : null
        });
      }, 100);
    }
  }, [current, form, clients]);

  // 處理船隻和爬攬器數據，確保在ships和winches加載完成後設置
  useEffect(() => {
    if (current && current._id) {
      // 只在current確實存在且有_id時才處理（表示這是一個已存在的記錄）
      const { ship: currentShip, winch: currentWinch } = current;
      
      // 處理船隻數據 - 如果current有ship，更新selectedShip
      if (currentShip) {
        const shipId = typeof currentShip === 'object' ? currentShip._id : currentShip;
        const shipName = typeof currentShip === 'object' ? currentShip.name : null;
        
        setSelectedShip(shipId);
        // 如果有名稱，直接使用；否則嘗試從ships數組中查找
        if (shipName) {
          setSelectedShipName(shipName);
        } else if (ships.length > 0) {
          const foundShip = ships.find(s => s.value === shipId);
          if (foundShip) {
            setSelectedShipName(foundShip.label);
          }
        }
      } else if (currentShip === null) {
        // 只有當current明確地將ship設置為null時，才清空
        setSelectedShip(null);
        setSelectedShipName(null);
      }
      
      // 處理爬攬器數據 - 如果current有winch，更新selectedWinch
      if (currentWinch) {
        const winchId = typeof currentWinch === 'object' ? currentWinch._id : currentWinch;
        const winchName = typeof currentWinch === 'object' ? currentWinch.name : null;
        
        setSelectedWinch(winchId);
        // 如果有名稱，直接使用；否則嘗試從winches數組中查找
        if (winchName) {
          setSelectedWinchName(winchName);
        } else if (winches.length > 0) {
          const foundWinch = winches.find(w => w.value === winchId);
          if (foundWinch) {
            setSelectedWinchName(foundWinch.label);
          }
        }
      } else if (currentWinch === null) {
        // 只有當current明確地將winch設置為null時，才清空
        setSelectedWinch(null);
        setSelectedWinchName(null);
      }
    }
  }, [current, ships, winches]);

  // 計算subTotal當materials或items改變時（計算 materials 和 items）
  useEffect(() => {
    let newSubTotal = 0;
    
    // 計算 materials 的總計
    if (materials && materials.length > 0) {
      materials.forEach((material) => {
        // price 現在已經是總價（quantity * unitPrice），直接使用
        if (material && material.price) {
          let materialTotal = material.price;
          // 保留小數點後2位
          materialTotal = Number.parseFloat(materialTotal.toFixed(2));
          newSubTotal = calculate.add(newSubTotal, materialTotal);
        }
      });
    }
    
    // 計算 items 的總計（負數會自動減去）
    if (items && items.length > 0) {
      items.forEach((item) => {
        if (item && item.quantity && item.price !== undefined && item.price !== null) {
          // 允許負數價格，負數會自動從總數中減去
          let itemTotal = calculate.multiply(item.quantity, item.price);
          newSubTotal = calculate.add(newSubTotal, itemTotal);
        }
      });
    }
    
    setSubTotal(newSubTotal);
    
    // 更新表單的items和materials字段
    form.setFieldsValue({ 
      items: items,
      materials: materials 
    });
  }, [materials, items, form]);

  // 同步materials到表單
  useEffect(() => {
    form.setFieldsValue({ materials: materials });
  }, [materials, form]);

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
  const handleItemSelect = async (value, option) => {
    const selectedItem = projectItems.find(item => item.item_name === value);
    if (selectedItem) {
      let price = selectedItem.price || 0;
      
      // 從存倉中查找相同名字的貨品，獲取其價格
      try {
        // 使用 request.get 來搜索 warehouse，支持 search 參數
        const entity = `warehouse?search=${encodeURIComponent(value)}&limit=50`;
        const warehouseResponse = await request.get({ entity });
        
        // warehouse API 返回格式: { success: true, result: [...], pagination: {...} }
        const warehouseItems = warehouseResponse?.result || [];
        
        if (warehouseItems.length > 0) {
          // 查找完全匹配的 itemName（不區分大小寫）
          const matchingWarehouseItem = warehouseItems.find(
            item => item.itemName && item.itemName.trim().toLowerCase() === value.trim().toLowerCase()
          );
          
          if (matchingWarehouseItem && matchingWarehouseItem.unitPrice && matchingWarehouseItem.unitPrice > 0) {
            // 使用存倉的價格
            price = matchingWarehouseItem.unitPrice;
            console.log(`✅ 從存倉獲取價格: ${value} = $${price}`);
          } else {
            console.log(`ℹ️ 存倉中找到 "${value}" 但沒有有效價格，使用項目價格`);
          }
        } else {
          console.log(`ℹ️ 存倉中未找到 "${value}"，使用項目價格`);
        }
      } catch (error) {
        console.warn('⚠️ 獲取存倉價格失敗，使用項目價格:', error);
        // 如果獲取存倉價格失敗，繼續使用項目價格
      }
      
      setCurrentItem({
        ...currentItem,
        itemName: selectedItem.item_name,
        price: price,
        total: calculate.multiply(currentItem.quantity, price)
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
    const itemKey = record.key || record._id || Date.now();
    if (!itemKey) {
      console.error('Item key is missing:', record);
      return;
    }
    console.log('Editing item:', { record, itemKey, allItems: items });
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
    // 允許負數價格，只檢查必要字段
    if (!currentItem.itemName || currentItem.quantity <= 0) {
      return;
    }

    const itemTotal = calculate.multiply(currentItem.quantity, currentItem.price);
    
    let updatedItems;
    if (editingItemKey) {
      // 編輯模式：更新現有項目
      let found = false;
      updatedItems = items.map(item => {
        const itemKey = item.key || item._id;
        // 檢查是否匹配編輯的項目（使用多種方式匹配）
        const matches = itemKey === editingItemKey || 
                       item._id === editingItemKey || 
                       String(itemKey) === String(editingItemKey) ||
                       (item.key && String(item.key) === String(editingItemKey));
        
        if (matches) {
          found = true;
          // 保留原有的所有字段，更新為新的值
          const updatedItem = { 
            ...item,  // 保留所有原有字段
            ...currentItem,  // 用新值覆蓋
            key: item.key || editingItemKey,  // 確保 key 不變
            total: itemTotal,  // 更新總計
            _id: item._id  // 保留 _id
          };
          console.log('Updating item:', { old: item, new: updatedItem });
          return updatedItem;
        }
        return item;
      });
      
      if (!found) {
        console.warn('Item not found for editing:', editingItemKey, 'Items:', items.map(i => ({ key: i.key, _id: i._id })));
      } else {
        console.log('Item updated successfully, new items:', updatedItems);
      }
      
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

    // 確保創建新的數組引用，強制 React 重新渲染
    setItems([...updatedItems]);
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

  // 處理材料選擇
  const handleMaterialSelect = async (value, option) => {
    const selectedMaterial = warehouseItems.find(item => item.itemName === value);
    if (selectedMaterial) {
      let price = selectedMaterial.unitPrice || 0;
      
      // 確保從存倉獲取最新的價格（即使已經在 warehouseItems 中）
      try {
        // 使用 request.get 來搜索 warehouse，支持 search 參數
        const entity = `warehouse?search=${encodeURIComponent(value)}&limit=50`;
        const warehouseResponse = await request.get({ entity });
        
        // warehouse API 返回格式: { success: true, result: [...], pagination: {...} }
        const warehouseItemsFromAPI = warehouseResponse?.result || [];
        
        if (warehouseItemsFromAPI.length > 0) {
          // 查找完全匹配的 itemName（不區分大小寫）
          const matchingWarehouseItem = warehouseItemsFromAPI.find(
            item => item.itemName && item.itemName.trim().toLowerCase() === value.trim().toLowerCase()
          );
          
          if (matchingWarehouseItem && matchingWarehouseItem.unitPrice && matchingWarehouseItem.unitPrice > 0) {
            // 使用存倉的價格
            price = matchingWarehouseItem.unitPrice;
            console.log(`✅ 從存倉獲取材料價格: ${value} = $${price}`);
          } else {
            console.log(`ℹ️ 存倉中找到 "${value}" 但沒有有效價格，使用已加載的價格`);
          }
        } else {
          console.log(`ℹ️ 存倉中未找到 "${value}"，使用已加載的價格`);
        }
      } catch (error) {
        console.warn('⚠️ 獲取存倉價格失敗，使用已加載的價格:', error);
        // 如果獲取存倉價格失敗，繼續使用已加載的價格
      }
      
      // 計算總價（quantity * unitPrice）
      const quantity = currentMaterial.quantity || 1;
      const totalPrice = calculate.multiply(quantity, price);
      
      setCurrentMaterial({
        ...currentMaterial,
        itemName: selectedMaterial.itemName,
        warehouse: selectedMaterial.warehouse,
        unitPrice: price, // 存儲單價
        price: Number.parseFloat(totalPrice.toFixed(2)) // 計算並存儲總價
      });
    }
  };

  // 搜索倉庫項目
  const handleMaterialSearch = (searchText) => {
    // 如果選擇了「其他」，不顯示任何項目（需要手動輸入）
    if (currentMaterial.warehouse === '其他') {
      return [];
    }
    
    // 如果選擇了倉庫，只顯示該倉庫的項目
    const filteredItems = currentMaterial.warehouse 
      ? warehouseItems.filter(item => item.warehouse === currentMaterial.warehouse)
      : warehouseItems;
    
    if (!searchText) {
      return filteredItems.map(item => ({
        value: item.itemName,
        label: `${item.itemName} (倉${item.warehouse}) - 庫存: ${item.quantity}`
      }));
    }
    
    return filteredItems
      .filter(item => 
        item.itemName.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchText.toLowerCase()))
      )
      .map(item => ({
        value: item.itemName,
        label: `${item.itemName} (倉${item.warehouse}) - 庫存: ${item.quantity}`
      }));
  };

  // 更新當前材料
  const updateCurrentMaterial = (field, value) => {
    const updatedMaterial = {
      ...currentMaterial,
      [field]: value
    };
    
    // 當 quantity 或 unitPrice 改變時，自動計算總價
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? (value || 0) : (updatedMaterial.quantity || 0);
      const unitPrice = field === 'unitPrice' ? (value || 0) : (updatedMaterial.unitPrice || 0);
      const totalPrice = calculate.multiply(quantity, unitPrice);
      updatedMaterial.price = Number.parseFloat(totalPrice.toFixed(2));
    }
    
    setCurrentMaterial(updatedMaterial);
    
    // 如果選擇了倉庫，動態加載該倉庫的項目
    if (field === 'warehouse' && value) {
      fetchWarehouseItems(value);
    }
  };

  // 編輯材料
  const editMaterial = (record) => {
    const materialKey = record.key || record._id || Date.now();
    if (!materialKey) {
      console.error('Material key is missing:', record);
      return;
    }
    console.log('Editing material:', { record, materialKey, allMaterials: materials });
    // 計算單價（如果沒有 unitPrice，則使用 price / quantity）
    const quantity = record.quantity || 1;
    const totalPrice = record.price || 0;
    const unitPrice = record.unitPrice || (quantity > 0 ? totalPrice / quantity : 0);
    
    const materialData = {
      warehouse: record.warehouse || '',
      itemName: record.itemName || '',
      quantity: quantity,
      unitPrice: Number.parseFloat(unitPrice.toFixed(2)),
      price: totalPrice
    };
    setCurrentMaterial(materialData);
    setEditingMaterialKey(materialKey);
    
    // 如果選擇了倉庫，動態加載該倉庫的項目
    if (materialData.warehouse) {
      fetchWarehouseItems(materialData.warehouse);
    }
  };

  // 添加或更新材料到列表
  const addMaterialToList = () => {
    if (!currentMaterial.itemName || !currentMaterial.warehouse || !currentMaterial.quantity || currentMaterial.quantity <= 0) {
      return;
    }

    let updatedMaterials;
    if (editingMaterialKey) {
      // 編輯模式：更新現有材料
      let found = false;
      updatedMaterials = materials.map(material => {
        const materialKey = material.key || material._id;
        // 檢查是否匹配編輯的材料（使用多種方式匹配）
        const matches = materialKey === editingMaterialKey || 
                       material._id === editingMaterialKey || 
                       String(materialKey) === String(editingMaterialKey) ||
                       (material.key && String(material.key) === String(editingMaterialKey));
        
        if (matches) {
          found = true;
          // 保留原有的所有字段，更新為新的值
          const updatedMaterial = { 
            ...material,  // 保留所有原有字段
            ...currentMaterial,  // 用新值覆蓋
            key: material.key || editingMaterialKey,  // 確保 key 不變
            _id: material._id  // 保留 _id
          };
          console.log('Updating material:', { old: material, new: updatedMaterial });
          return updatedMaterial;
        }
        return material;
      });
      
      if (!found) {
        console.warn('Material not found for editing:', editingMaterialKey, 'Materials:', materials.map(m => ({ key: m.key, _id: m._id })));
      } else {
        console.log('Material updated successfully, new materials:', updatedMaterials);
      }
      
      setEditingMaterialKey(null);
    } else {
      // 添加模式：添加新材料
      const newMaterial = {
        ...currentMaterial,
        key: Date.now(), // 用作唯一標識
      };
      updatedMaterials = [...materials, newMaterial];
    }

    // 確保創建新的數組引用，強制 React 重新渲染
    setMaterials([...updatedMaterials]);
    form.setFieldsValue({ materials: updatedMaterials });

    // 重置當前材料
    setCurrentMaterial({
      warehouse: '',
      itemName: '',
      quantity: 1,
      unitPrice: 0,
      price: 0
    });
  };

  // 刪除材料
  const removeMaterial = (key) => {
    const updatedMaterials = materials.filter(material => material.key !== key);
    setMaterials(updatedMaterials);
    form.setFieldsValue({ materials: updatedMaterials });
  };

  // Table columns
  const columns = [
    {
      title: translate('Item'),
      dataIndex: 'itemName',
      key: 'itemName',
      width: '15%',
    },
    {
      title: translate('Description'),
      dataIndex: 'description',
      key: 'description',
      width: '70%',
    },
    {
      title: translate('Quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: '10%',
    },
    {
      title: '',
      key: 'action',
      width: '5%',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <EditOutlined 
            onClick={() => editItem(record)} 
            style={{ color: '#1890ff', cursor: 'pointer', fontSize: '16px' }}
          />
          <DeleteOutlined 
            onClick={() => removeItem(record.key)} 
            style={{ color: 'red', cursor: 'pointer', fontSize: '16px' }}
          />
        </div>
      ),
    },
  ];

  // Materials table columns
  const materialColumns = [
    {
      title: translate('Warehouse'),
      dataIndex: 'warehouse',
      key: 'warehouse',
      width: '15%',
      render: (warehouse) => `倉${warehouse}`,
    },
    {
      title: translate('Item'),
      dataIndex: 'itemName',
      key: 'itemName',
      width: '35%',
    },
    {
      title: translate('Quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: '15%',
      render: (quantity) => quantity !== undefined && quantity !== null ? Number(quantity).toFixed(2) : '-',
    },
    {
      title: translate('Price'),
      dataIndex: 'price',
      key: 'price',
      width: '20%',
      render: (price) => moneyFormatter({ amount: price || 0 }),
    },
    {
      title: '',
      key: 'action',
      width: '15%',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <EditOutlined 
            onClick={() => editMaterial(record)} 
            style={{ color: '#1890ff', cursor: 'pointer', fontSize: '16px' }}
          />
          <DeleteOutlined 
            onClick={() => removeMaterial(record.key)} 
            style={{ color: 'red', cursor: 'pointer', fontSize: '16px' }}
          />
        </div>
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
            label="Supplier Type"
            name="numberPrefix"
            initialValue="S"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Select
              options={[
                { value: 'NO', label: 'NO' },
                { value: 'PO', label: 'PO' },
                { value: 'S', label: 'S' },
                { value: 'SWP', label: 'SWP' },
                { value: 'E', label: 'E' },
                { value: 'Y', label: 'Y' },
              ].filter(option => option.value !== 'XX')}
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
          ) : null}
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
          <Form.Item label="Quote Number" name="invoiceNumber">
            <AutoComplete
              placeholder="輸入或搜索 Quote Number (例如: QU-123, SML-456)"
              options={invoiceOptions}
              onSearch={searchInvoiceNumbers}
              onSelect={(value) => checkExistingProject(value)}
              onBlur={(e) => checkExistingProject(e.target.value)}
              allowClear
              notFoundContent={searchLoading ? '搜索中...' : '無匹配的 Quote Number'}
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={6}>
          <Form.Item label={translate('P.O Number')} name="poNumber">
            <Input placeholder="輸入P.O Number" />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={6}>
          <Form.Item label={translate('Contact Person')} name="contactPerson">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      
      
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={12}>
          <Form.Item label={translate('Project Address')} name="address">
            <Input />
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
        <Col span={6}>
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
        <Col span={14}>
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
        <Col span={1}>
          <Button 
            type="primary" 
            icon={editingItemKey ? <EditOutlined /> : <PlusOutlined />} 
            onClick={addItemToList}
            disabled={!currentItem.itemName || currentItem.quantity <= 0}
            key={editingItemKey ? 'update-btn' : 'add-btn'}
          >
            {editingItemKey ? translate('Update') : ''}
          </Button>
        </Col>
      </Row>

      {/* Items Table */}
      <Table
        dataSource={items}
        columns={columns}
        pagination={false}
        size="small"
        rowKey={(item) => item.key || item._id || Date.now()}
        locale={{ emptyText: translate('No items added') }}
      />

      <Divider orientation="left">材料管理</Divider>

      {/* Materials Input Form */}
      <Row gutter={[12, 12]} style={{ backgroundColor: '#f0f8ff', padding: '16px', borderRadius: '6px', marginBottom: '16px' }}>
        <Col span={24}>
          <h4>添加材料</h4>
        </Col>
        <Col span={6}>
          <Select
            placeholder="選擇倉庫"
            value={currentMaterial.warehouse}
            onChange={(value) => updateCurrentMaterial('warehouse', value)}
            style={{ width: '100%' }}
            options={[
              { value: 'A', label: '倉A' },
              { value: 'B', label: '倉B' },
              { value: 'C', label: '倉C' },
              { value: 'D', label: '倉D' },
              { value: '其他', label: '其他' },
            ]}
          />
        </Col>
        <Col span={8}>
          <AutoComplete
            placeholder="輸入材料名稱搜索..."
            onSearch={handleMaterialSearch}
            onSelect={handleMaterialSelect}
            value={currentMaterial.itemName}
            onChange={(value) => updateCurrentMaterial('itemName', value)}
            loading={materialsLoading}
            showSearch
            filterOption={false}
            options={handleMaterialSearch('')}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={3}>
          <InputNumber 
            placeholder="數量"
            min={0}
            step={0.01}
            precision={2}
            value={currentMaterial.quantity}
            onChange={(value) => updateCurrentMaterial('quantity', value)}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={3}>
          <InputNumber
            placeholder="總價"
            min={0}
            step={0.01}
            precision={2}
            value={currentMaterial.price}
            onChange={(value) => {
              // 當用戶修改總價時，反向計算單價
              const quantity = currentMaterial.quantity || 1;
              const unitPrice = quantity > 0 ? (value || 0) / quantity : 0;
              setCurrentMaterial({
                ...currentMaterial,
                unitPrice: Number.parseFloat(unitPrice.toFixed(2)),
                price: value || 0
              });
            }}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={4}>
          <Button 
            type="primary" 
            icon={editingMaterialKey ? <EditOutlined /> : <PlusOutlined />} 
            onClick={addMaterialToList}
            disabled={!currentMaterial.itemName || !currentMaterial.warehouse || !currentMaterial.quantity || currentMaterial.quantity <= 0}
            style={{ width: '100%' }}
            key={editingMaterialKey ? 'update-material-btn' : 'add-material-btn'}
          >
            {editingMaterialKey ? translate('Update') : translate('Add')}
          </Button>
        </Col>
      </Row>

      {/* Materials Table */}
      <Table
        dataSource={materials}
        columns={materialColumns}
        pagination={false}
        size="small"
        rowKey={(material) => material.key || material._id || Date.now()}
        locale={{ emptyText: '未添加材料' }}
      />

      <Divider orientation="left">船隻爬攬器管理</Divider>

      {/* Ships and Winches Selection */}
      <Row gutter={[12, 12]} style={{ backgroundColor: '#f0f8ff', padding: '16px', borderRadius: '6px', marginBottom: '16px' }}>
        <Col span={12}>
          <h4>選擇船隻</h4>
          <Select
            placeholder="選擇船隻（只顯示狀態為「正常」的）"
            value={selectedShip}
            onChange={(value, option) => {
              setSelectedShip(value);
              setSelectedShipName(option?.label || null);
              form.setFieldsValue({ ship: value });
            }}
            style={{ width: '100%' }}
            loading={shipsLoading}
            showSearch
            filterOption={(input, option) =>
              (option?.label || '').toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
            options={ships}
            allowClear
          />
        </Col>
        <Col span={12}>
          <h4>選擇爬攬器</h4>
          <Select
            placeholder="選擇爬攬器（只顯示狀態為「正常」的）"
            value={selectedWinch}
            onChange={(value, option) => {
              setSelectedWinch(value);
              setSelectedWinchName(option?.label || null);
              form.setFieldsValue({ winch: value });
            }}
            style={{ width: '100%' }}
            loading={winchesLoading}
            showSearch
            filterOption={(input, option) =>
              (option?.label || '').toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
            options={winches}
            allowClear
          />
        </Col>
      </Row>

      {/* Ships and Winches Display Table */}
      {(selectedShip || selectedWinch) && (
        <Table
          dataSource={[
            ...(selectedShip ? [{
              key: 'ship',
              type: '船隻',
              name: selectedShipName || ships.find(s => s.value === selectedShip)?.label || selectedShip,
              id: selectedShip
            }] : []),
            ...(selectedWinch ? [{
              key: 'winch',
              type: '爬攬器',
              name: selectedWinchName || winches.find(w => w.value === selectedWinch)?.label || selectedWinch,
              id: selectedWinch
            }] : [])
          ]}
          columns={[
            {
              title: '類型',
              dataIndex: 'type',
              key: 'type',
              width: '15%',
            },
            {
              title: '名稱',
              dataIndex: 'name',
              key: 'name',
              width: '70%',
            },
            {
              title: '操作',
              key: 'action',
              width: '15%',
              render: (_, record) => (
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    if (record.type === '船隻') {
                      setSelectedShip(null);
                      setSelectedShipName(null);
                      form.setFieldsValue({ ship: null });
                    } else if (record.type === '爬攬器') {
                      setSelectedWinch(null);
                      setSelectedWinchName(null);
                      form.setFieldsValue({ winch: null });
                    }
                  }}
                >
                  刪除
                </Button>
              ),
            },
          ]}
          pagination={false}
          size="small"
          locale={{ emptyText: '未選擇船隻或爬攬器' }}
        />
      )}

      {/* Hidden Form Items for submission */}
      <Form.Item name="items" style={{ display: 'none' }}>
        <Input />
      </Form.Item>
      <Form.Item name="materials" style={{ display: 'none' }}>
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
      <Form.Item name="ship" style={{ display: 'none' }}>
        <Input />
      </Form.Item>
      <Form.Item name="winch" style={{ display: 'none' }}>
        <Input />
      </Form.Item>
      <Form.Item name="ship" style={{ display: 'none' }}>
        <Input />
      </Form.Item>
      <Form.Item name="winch" style={{ display: 'none' }}>
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
