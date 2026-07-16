import { useState, useEffect, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, Button, Select, Divider, Row, Col, Switch, Table, AutoComplete, Modal, message, Upload } from 'antd';

import { PlusOutlined, DeleteOutlined, LinkOutlined, UploadOutlined, InboxOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { DatePicker } from 'antd';

import AutoCompleteAsync from '@/components/AutoCompleteAsync';
import MoneyInputFormItem from '@/components/MoneyInputFormItem';
import { selectDefaultQuoteSupplierSettings, selectLastNumberSettings, selectWarehouseOptions, selectItemUnitOptions } from '@/redux/settings/selectors';
import { useDate, useMoney } from '@/settings';
import useLanguage from '@/locale/useLanguage';

import calculate from '@/utils/calculate';
import { SERVICE_TYPE_OPTIONS } from '@/utils/serviceTypeAccountCode';
import { useSelector } from 'react-redux';
import { request } from '@/request';
import ContactPersonAutoComplete from '@/components/ContactPersonAutoComplete';
import {
  DiscountAmountPdfCheckboxCol,
  DiscountPercentPdfCheckboxCol,
  discountPdfFieldsFromRecord,
} from '@/components/DiscountPdfCheckbox';
import { renderMultilineText } from '@/utils/renderMultilineText';
import { filterAssignableAssets, isAssignableAsset } from '@/utils/assignableAssetStatus';
import { calcRentalOverageLabel } from '@/utils/rentalOverageDays';
import {
  getMaxOutboundQuantityForLine,
  isRealWarehouseMaterial,
  validateSupplierQuoteMaterialsStock,
} from '@/utils/validateSupplierQuoteMaterialsStock';
import {
  XINGCHENG_FACTORY_WAREHOUSE,
  isVirtualMaterialWarehouse,
  formatMaterialWarehouseLabel,
} from '@/utils/supplierQuoteMaterialWarehouse';
import { applyDefaultQuoteSupplierOnCreate } from '@/utils/defaultQuoteSupplier';

function getLastSupplierQuoteSeqForPrefix(lastNumberSettings, prefix) {
  const k = `last_supplier_quote_number_${String(prefix || 'S').toLowerCase()}`;
  const v = lastNumberSettings?.[k];
  if (v !== undefined && v !== null && v !== '') {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

export default function SupplierQuoteTableForm({ subTotal = 0, current = null }) {
  // 即使沒有設置也允許顯示表單，使用默認值
  return <LoadSupplierQuoteTableForm subTotal={subTotal} current={current} />;
}

function LoadSupplierQuoteTableForm({ subTotal: propSubTotal = 0, current = null }) {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const { moneyFormatter, amountFormatter, currency_symbol, currency_position, cent_precision, currency_code } = useMoney();
  const defaultQuoteSupplierSettings = useSelector(selectDefaultQuoteSupplierSettings);
  const lastNumberSettings = useSelector(selectLastNumberSettings);
  const supplierQuoteSettings = useSelector((state) => state.settings?.result?.supplier_quote_settings ?? {});
  const warehouseOptions = useSelector(selectWarehouseOptions);
  const itemUnitOptions = useSelector(selectItemUnitOptions);
  const [lastNumber, setLastNumber] = useState(1);
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
    unit: 'JOB',
    price: 0,
    total: 0
  });
  const [projectItems, setProjectItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientRecords, setClientRecords] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Materials form states
  const [materials, setMaterials] = useState([]);
  const [editingMaterialKey, setEditingMaterialKey] = useState(null);
  const [currentMaterial, setCurrentMaterial] = useState({
    warehouse: '',
    warehouseInventory: undefined,
    itemName: '',
    quantity: 1,
    unitPrice: 0, // 單價
    price: 0, // 總價（quantity * unitPrice）
    stockOnHand: null, // 選中存倉貨品的可用庫存
  });
  const originalMaterialsRef = useRef([]);
  const [warehouseItems, setWarehouseItems] = useState([]);
  /** 存倉下拉目前顯示的選項（全量或搜尋結果） */
  const [warehouseSelectList, setWarehouseSelectList] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  
  // 多筆船隻／多筆爬纜器（各自獨立，非組別配對）
  const [shipRows, setShipRows] = useState([]);
  const [winchRows, setWinchRows] = useState([]);
  const [ships, setShips] = useState([]);
  const [winches, setWinches] = useState([]);
  const [shipsLoading, setShipsLoading] = useState(false);
  const [winchesLoading, setWinchesLoading] = useState(false);
  
  // File upload states
  const [dmFileList, setDmFileList] = useState([]);
  const [invoiceFileList, setInvoiceFileList] = useState([]);
  
  const form = Form.useFormInstance();
  const watchedClients = Form.useWatch('clients', form) || [];
  const watchedSupplierPrefix = Form.useWatch('numberPrefix', form) || 'S';
  const numberManuallyEditedRef = useRef(false);
  const prevPrefixRef = useRef(watchedSupplierPrefix);

  const syncAssetRowsToForm = (ships, winches) => {
    form.setFieldsValue({ shipAssignments: ships, winchAssignments: winches });
    const primaryShip = ships.find((row) => row.ship && !row.dismantlingDate);
    const primaryWinch = winches.find((row) => row.winch && !row.dismantlingDate);
    form.setFieldsValue({
      ship: primaryShip?.ship || null,
      winch: primaryWinch?.winch || null,
    });
  };

  const mapShipRowFromApi = (row, index) => ({
    key: `ship-${index}-${row.ship || index}`,
    ship: row.ship?._id || row.ship || null,
    installationDate: row.installationDate ? dayjs(row.installationDate) : null,
    expiredDate: row.expiredDate ? dayjs(row.expiredDate) : null,
    dismantlingDate: row.dismantlingDate ? dayjs(row.dismantlingDate) : null,
  });

  const mapWinchRowFromApi = (row, index) => ({
    key: `winch-${index}-${row.winch || index}`,
    winch: row.winch?._id || row.winch || null,
    installationDate: row.installationDate ? dayjs(row.installationDate) : null,
    expiredDate: row.expiredDate ? dayjs(row.expiredDate) : null,
    dismantlingDate: row.dismantlingDate ? dayjs(row.dismantlingDate) : null,
  });

  const buildAssetRowsFromCurrent = (record) => {
    if (record?.shipAssignments?.length || record?.winchAssignments?.length) {
      return {
        ships: (record.shipAssignments || []).map(mapShipRowFromApi),
        winches: (record.winchAssignments || []).map(mapWinchRowFromApi),
      };
    }
    if (record?.assetAssignments?.length) {
      const ships = [];
      const winches = [];
      record.assetAssignments.forEach((row, index) => {
        if (row.ship) {
          ships.push(
            mapShipRowFromApi(
              {
                ship: row.ship,
                installationDate: row.shipInstallationDate,
                expiredDate: row.shipExpiredDate,
                dismantlingDate: row.shipDismantlingDate,
              },
              index
            )
          );
        }
        if (row.winch) {
          winches.push(
            mapWinchRowFromApi(
              {
                winch: row.winch,
                installationDate: row.winchInstallationDate,
                expiredDate: row.winchExpiredDate,
                dismantlingDate: row.winchDismantlingDate,
              },
              index
            )
          );
        }
      });
      return { ships, winches };
    }
    const shipId = record?.ship?._id || record?.ship || null;
    const winchId = record?.winch?._id || record?.winch || null;
    const shipObj = typeof record?.ship === 'object' ? record.ship : null;
    const winchObj = typeof record?.winch === 'object' ? record.winch : null;
    return {
      ships: shipId
        ? [
            mapShipRowFromApi(
              {
                ship: shipId,
                installationDate: shipObj?.installationDate,
                expiredDate: shipObj?.expiredDate,
                dismantlingDate: shipObj?.dismantlingDate,
              },
              0
            ),
          ]
        : [],
      winches: winchId
        ? [
            mapWinchRowFromApi(
              {
                winch: winchId,
                installationDate: winchObj?.installationDate,
                expiredDate: winchObj?.expiredDate,
                dismantlingDate: winchObj?.dismantlingDate,
              },
              0
            ),
          ]
        : [],
    };
  };

  const updateShipRow = (rowKey, patch) => {
    setShipRows((prev) => {
      const next = prev.map((row) => (row.key === rowKey ? { ...row, ...patch } : row));
      syncAssetRowsToForm(next, winchRows);
      return next;
    });
  };

  const updateWinchRow = (rowKey, patch) => {
    setWinchRows((prev) => {
      const next = prev.map((row) => (row.key === rowKey ? { ...row, ...patch } : row));
      syncAssetRowsToForm(shipRows, next);
      return next;
    });
  };

  const addShipRow = () => {
    setShipRows((prev) => {
      const next = [
        ...prev,
        {
          key: `ship-${Date.now()}`,
          ship: null,
          installationDate: null,
          expiredDate: null,
          dismantlingDate: null,
        },
      ];
      syncAssetRowsToForm(next, winchRows);
      return next;
    });
  };

  const addWinchRow = () => {
    setWinchRows((prev) => {
      const next = [
        ...prev,
        {
          key: `winch-${Date.now()}`,
          winch: null,
          installationDate: null,
          expiredDate: null,
          dismantlingDate: null,
        },
      ];
      syncAssetRowsToForm(shipRows, next);
      return next;
    });
  };

  const removeShipRow = (rowKey) => {
    setShipRows((prev) => {
      const next = prev.filter((row) => row.key !== rowKey);
      syncAssetRowsToForm(next, winchRows);
      return next;
    });
  };

  const removeWinchRow = (rowKey) => {
    setWinchRows((prev) => {
      const next = prev.filter((row) => row.key !== rowKey);
      syncAssetRowsToForm(shipRows, next);
      return next;
    });
  };

  const collectAssignedShipIds = (rows = shipRows) =>
    rows.map((row) => row.ship).filter(Boolean);

  const collectAssignedWinchIds = (rows = winchRows) =>
    rows.map((row) => row.winch).filter(Boolean);

  /** 本 S 單下拉：已出現過的資產不可再選；新列僅可選香港倉 */
  const isShipOptionSelectableForRow = (opt, record, rows) => {
    if (String(opt.value) === String(record.ship)) return true;
    if (rows.some((row) => row.key !== record.key && row.ship && String(row.ship) === String(opt.value))) {
      return false;
    }
    return isAssignableAsset(opt);
  };

  const isWinchOptionSelectableForRow = (opt, record, rows) => {
    if (String(opt.value) === String(record.winch)) return true;
    if (rows.some((row) => row.key !== record.key && row.winch && String(row.winch) === String(opt.value))) {
      return false;
    }
    return isAssignableAsset(opt);
  };

  const applySuggestedNumber = (prefix = watchedSupplierPrefix || 'S') => {
    const next = getLastSupplierQuoteSeqForPrefix(lastNumberSettings, prefix) + 1;
    setLastNumber(next);
    form.setFieldsValue({ number: String(next) });
    numberManuallyEditedRef.current = false;
  };

  // 建立時預填建議編號；使用者手動改過後不再覆寫（避免設定載入時把輸入清掉）
  useEffect(() => {
    if (current) return;

    const prefix = watchedSupplierPrefix || 'S';
    if (prevPrefixRef.current !== prefix) {
      prevPrefixRef.current = prefix;
      numberManuallyEditedRef.current = false;
    }

    if (numberManuallyEditedRef.current) return;

    applySuggestedNumber(prefix);
  }, [lastNumberSettings, watchedSupplierPrefix, current, form]);
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
    fetchSuppliers();
    fetchWarehouseItems();
  }, []);

  useEffect(() => {
    if (!suppliers.length) return;
    const timer = setTimeout(() => {
      applyDefaultQuoteSupplierOnCreate(form, suppliers, { current, financeSettings: defaultQuoteSupplierSettings });
    }, 150);
    return () => clearTimeout(timer);
  }, [suppliers, current, defaultQuoteSupplierSettings, form]);

  useEffect(() => {
    const { ships, winches } = buildAssetRowsFromCurrent(current);
    setShipRows(ships);
    setWinchRows(winches);
    syncAssetRowsToForm(ships, winches);
    fetchShips(collectAssignedShipIds(ships));
    fetchWinches(collectAssignedWinchIds(winches));
  }, [current?._id]);

  const fetchClients = async () => {
    try {
      const response = await request.listAll({ entity: 'client' });
      console.log('客戶API響應:', response);
      
      // 確保result是數組
      const clientData = response?.result;
      if (Array.isArray(clientData)) {
        setClientRecords(clientData);
        const clientOptions = clientData.map(client => ({
          value: client._id,
          label: client.name,
        }));
        setClients(clientOptions);
        console.log('客戶選項:', clientOptions);
      } else {
        console.warn('客戶數據不是數組格式:', clientData);
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

  const mapWarehouseItemFromApi = (item) => ({
    itemName: item.itemName,
    sku: item.sku != null ? String(item.sku) : '',
    warehouse: item.warehouse,
    quantity: item.quantity,
    status: item.status,
    unitPrice: item.unitPrice,
    description: item.description,
    _id: item._id,
  });

  const filterStockableWarehouseRows = (rows) =>
    (rows || []).filter(
      (item) => Number(item.quantity) > 0 && item.status === 'available'
    );

  const getWarehouseItemOptionLabel = (item) => {
    const skuPart = item.sku ? `${item.sku} · ` : '';
    return `${skuPart}${item.itemName} — ${translate('Warehouse')} ${item.warehouse} — ${translate('Quantity')}: ${item.quantity}`;
  };

  const fetchWarehouseItems = async (selectedWarehouse = null) => {
    try {
      setMaterialsLoading(true);
      console.log('🔍 Fetching Warehouse Items from API...', selectedWarehouse ? `for warehouse ${selectedWarehouse}` : 'all warehouses');
      
      // 「與成廠房」「其他」不對應實體倉庫，不從 API 獲取
      if (isVirtualMaterialWarehouse(selectedWarehouse)) {
        setWarehouseItems([]);
        setWarehouseSelectList([]);
        setMaterialsLoading(false);
        return;
      }
      
      // 僅載入有庫存、非缺貨的貨品（S 單不可選數量為 0 的存倉）
      const stockParams = 'stockAvailable=1&limit=500';
      const entity = selectedWarehouse
        ? `warehouse?warehouse=${selectedWarehouse}&${stockParams}`
        : `warehouse?${stockParams}`;
      const response = await request.get({ entity });
      
      console.log('📦 Warehouse Items API response:', response);
      
      if (response.success && response.result) {
        const apiWarehouseItems = filterStockableWarehouseRows(response.result).map(mapWarehouseItemFromApi);
        setWarehouseItems(apiWarehouseItems);
        setWarehouseSelectList(apiWarehouseItems);
        console.log(`✅ Loaded ${apiWarehouseItems.length} Warehouse Items from API`);
      } else {
        console.warn('❌ Warehouse Items API failed');
        setWarehouseItems([]);
        setWarehouseSelectList([]);
        message.warning('無法載入存倉貨品，請稍後再試');
      }
    } catch (error) {
      console.error('❌ Error fetching Warehouse Items:', error);
      setWarehouseItems([]);
      setWarehouseSelectList([]);
      message.warning('無法載入存倉貨品，請稍後再試');
    } finally {
      setMaterialsLoading(false);
    }
  };

  /** 依貨品名稱或貨品編號（SKU）搜尋存倉（後端 search 已含 sku） */
  const searchWarehouseItemsForSelect = async (warehouse, searchText) => {
    if (!warehouse || isVirtualMaterialWarehouse(warehouse)) {
      return;
    }
    const q = (searchText || '').trim();
    if (!q) {
      setWarehouseSelectList(warehouseItems);
      return;
    }
    try {
      setMaterialsLoading(true);
      const entity = `warehouse?warehouse=${encodeURIComponent(warehouse)}&stockAvailable=1&limit=100&search=${encodeURIComponent(q)}`;
      const response = await request.get({ entity });
      if (response.success && response.result) {
        const rows = filterStockableWarehouseRows(response.result).map(mapWarehouseItemFromApi);
        setWarehouseSelectList(rows);
      }
    } catch (error) {
      console.error('搜尋存倉貨品失敗:', error);
    } finally {
      setMaterialsLoading(false);
    }
  };

  // 獲取狀態為「香港倉」的船隻列表（編輯時保留本單已指派船隻）
  const fetchShips = async (assignedShipIds = []) => {
    try {
      setShipsLoading(true);
      const response = await request.listAll({ entity: 'ship' });
      if (response.success && Array.isArray(response.result)) {
        const hkWarehouseShips = filterAssignableAssets(response.result, assignedShipIds);
        setShips(
          hkWarehouseShips.map((ship) => ({
            value: ship._id,
            label: ship.registrationNumber || '—',
            ...ship,
          }))
        );
      }
    } catch (error) {
      console.error('獲取船隻列表失敗:', error);
      setShips([]);
    } finally {
      setShipsLoading(false);
    }
  };

  // 獲取狀態為「香港倉」的爬纜器列表（編輯時保留本單已指派爬纜器）
  const fetchWinches = async (assignedWinchIds = []) => {
    try {
      setWinchesLoading(true);
      const response = await request.listAll({ entity: 'winch' });
      if (response.success && Array.isArray(response.result)) {
        const hkWarehouseWinches = filterAssignableAssets(response.result, assignedWinchIds);
        setWinches(
          hkWarehouseWinches.map((winch) => ({
            value: winch._id,
            label: winch.serialNumber || '—',
            ...winch,
          }))
        );
      }
    } catch (error) {
      console.error('獲取爬纜器列表失敗:', error);
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
        total: currentTotal,
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
      originalMaterialsRef.current = currentMaterials.map((m) => ({ ...m }));

      setMaterials(
        currentMaterials.map((material, index) => {
          const wid = material.warehouseInventory;
          const warehouseInventoryStr =
            wid != null && wid !== ''
              ? typeof wid === 'object' && wid._id
                ? String(wid._id)
                : String(wid)
              : undefined;
          return {
            ...material,
            key: material.key || material._id || index,
            warehouseInventory: warehouseInventoryStr,
          };
        })
      );
      
      // 計算subTotal或使用現有的subTotal（計算 materials 和 items）
      let calculatedSubTotal = 0;
      
      // 計算 materials 的總計（price 為總價，正=加數、負=減數）
      if (currentMaterials && currentMaterials.length > 0) {
        currentMaterials.forEach((material) => {
          if (material && material.price !== undefined && material.price !== null) {
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
      
      // 載入既有 S單時同步 total state（若有儲存過的 total 則使用，否則由 discount 的 useEffect 計算）
      if (currentTotal !== undefined && currentTotal !== null) {
        setTotal(Number(currentTotal));
      }
      
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
        const subVal = calculatedSubTotal || currentSubTotal;
        const totalVal = currentTotal !== undefined && currentTotal !== null
          ? Number(currentTotal)
          : Number.parseFloat((subVal - (subVal * (discount / 100))).toFixed(2));
        const supplierId = current.supplier?._id || current.supplier || undefined;
        const dateVal = current.date ? dayjs(current.date) : undefined;
        const openDateVal = current.openDate ? dayjs(current.openDate) : undefined;
        form.setFieldsValue({
          items: currentItems,
          materials: currentMaterials,
          clients: clientIds,
          supplier: supplierId,
          type: type,
          shipType: shipType,
          renewalQuoteNumber: current?.renewalQuoteNumber,
          date: dateVal,
          openDate: openDateVal,
          subTotal: subVal,
          total: totalVal,
          discount: discount != null && discount !== '' ? discount : 0,
          discountTotal:
            current.discountTotal != null && current.discountTotal !== ''
              ? Number(Number(current.discountTotal).toFixed(2))
              : undefined,
          ...discountPdfFieldsFromRecord(current),
        });
      }, 100);
    }
  }, [current, form, clients]);

  useEffect(() => {
    syncAssetRowsToForm(shipRows, winchRows);
  }, [shipRows, winchRows, form]);

  // 計算subTotal當materials或items改變時（計算 materials 和 items）
  useEffect(() => {
    let newSubTotal = 0;
    
    // 計算 materials 的總計（price 為總價，正=加數、負=減數）
    if (materials && materials.length > 0) {
      materials.forEach((material) => {
        if (material && material.price !== undefined && material.price !== null) {
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
    
    // 更新表單的 items、materials、subTotal；total 由下方 discount 的 useEffect 更新
    const currentDiscount = form.getFieldValue('discount');
    const discountVal = currentDiscount !== undefined && currentDiscount !== null ? Number(currentDiscount) : 0;
    const discountAmt = calculate.multiply(newSubTotal, discountVal / 100);
    const newTotal = calculate.sub(newSubTotal, discountAmt);
    form.setFieldsValue({ 
      items,
      materials,
      subTotal: newSubTotal,
      total: Number.parseFloat(newTotal.toFixed(2)),
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
    form.setFieldsValue({ subTotal, total: Number.parseFloat(currentTotal.toFixed(2)), discountTotal: Number.parseFloat(discountAmount.toFixed(2)) });
  }, [subTotal, discount, form]);

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
        const entity = `warehouse?search=${encodeURIComponent(value)}&limit=50&stockAvailable=1`;
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
        unit: selectedItem.unit || currentItem.unit,
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
      unit: record.unit || 'JOB',
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
      unit: 'JOB',
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

  // 處理材料選擇（僅「與成廠房」「其他」：從預設選項帶入名稱）
  const handleOtherMaterialSelect = (value) => {
    setCurrentMaterial((prev) => ({
      ...prev,
      itemName: value,
    }));
  };

  // 「其他」類別下的可選名稱（供輸入/選擇，加工費與會計計算有關）
  const OTHER_MATERIAL_OPTIONS = [
    { value: '加工費', label: '加工費' },
    { value: '運費', label: '運費' },
    { value: '雜項', label: '雜項' },
  ];

  // 搜索倉庫項目（僅「與成廠房」「其他」用 AutoComplete 選項）
  const handleMaterialSearch = (searchText) => {
    if (isVirtualMaterialWarehouse(currentMaterial.warehouse)) {
      if (!searchText) {
        return OTHER_MATERIAL_OPTIONS;
      }
      const lower = searchText.toLowerCase();
      return OTHER_MATERIAL_OPTIONS.filter(
        (opt) => opt.label.toLowerCase().includes(lower)
      );
    }
    return [];
  };

  // 更新當前材料
  const updateCurrentMaterial = (field, value) => {
    let updatedMaterial = {
      ...currentMaterial,
      [field]: value,
    };

    if (field === 'warehouse') {
      if (isVirtualMaterialWarehouse(value)) {
        updatedMaterial = {
          ...updatedMaterial,
          warehouseInventory: undefined,
          itemName: updatedMaterial.itemName || '',
          stockOnHand: null,
        };
        fetchWarehouseItems(value);
      } else if (value) {
        updatedMaterial = {
          ...updatedMaterial,
          warehouseInventory: undefined,
          itemName: '',
          unitPrice: 0,
          price: 0,
          stockOnHand: null,
        };
        fetchWarehouseItems(value);
      }
    }

    // 當 quantity 或 unitPrice 改變時，自動計算總價
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? (value || 0) : (updatedMaterial.quantity || 0);
      const unitPrice = field === 'unitPrice' ? (value || 0) : (updatedMaterial.unitPrice || 0);
      const totalPrice = calculate.multiply(quantity, unitPrice);
      updatedMaterial.price = Number.parseFloat(totalPrice.toFixed(2));
    }

    setCurrentMaterial(updatedMaterial);
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
    
    const wid = record.warehouseInventory;
    const warehouseInventoryStr =
      wid != null && wid !== ''
        ? typeof wid === 'object' && wid._id
          ? String(wid._id)
          : String(wid)
        : undefined;

    const materialData = {
      warehouse: record.warehouse || '',
      warehouseInventory: warehouseInventoryStr,
      itemName: record.itemName || '',
      quantity: quantity,
      unitPrice: Number.parseFloat(unitPrice.toFixed(2)),
      price: totalPrice,
      stockOnHand: null,
    };
    setCurrentMaterial(materialData);
    setEditingMaterialKey(materialKey);
    
    // 如果選擇了倉庫，動態加載該倉庫的項目
    if (materialData.warehouse) {
      fetchWarehouseItems(materialData.warehouse);
    }
  };

  const maxOutboundForCurrentMaterial = useMemo(() => {
    if (!isRealWarehouseMaterial(currentMaterial)) return null;
    if (!currentMaterial.warehouseInventory) return null;
    const stock =
      currentMaterial.stockOnHand ??
      warehouseItems.find((w) => String(w._id) === String(currentMaterial.warehouseInventory))
        ?.quantity ??
      warehouseSelectList.find((w) => String(w._id) === String(currentMaterial.warehouseInventory))
        ?.quantity;
    return getMaxOutboundQuantityForLine({
      warehouseInventoryId: currentMaterial.warehouseInventory,
      materials,
      editingMaterialKey,
      originalMaterials: originalMaterialsRef.current,
      stockOnHand: stock,
    });
  }, [currentMaterial, materials, editingMaterialKey, warehouseItems, warehouseSelectList]);

  // 添加或更新材料到列表
  const addMaterialToList = () => {
    const isVirtualWh = isVirtualMaterialWarehouse(currentMaterial.warehouse);

    if (
      !currentMaterial.warehouse ||
      currentMaterial.quantity === null ||
      currentMaterial.quantity === undefined ||
      currentMaterial.quantity === 0
    ) {
      return;
    }

    if (!isVirtualWh) {
      if (!currentMaterial.warehouseInventory || !currentMaterial.itemName) {
        message.warning('倉 A–D 請從下拉選單選擇存倉貨品（不可手動輸入名稱）');
        return;
      }
      const qty = Number(currentMaterial.quantity);
      if (qty > 0 && maxOutboundForCurrentMaterial != null && qty > maxOutboundForCurrentMaterial) {
        message.error(
          `庫存不足：「${currentMaterial.itemName}」最多可出庫 ${maxOutboundForCurrentMaterial}`
        );
        return;
      }
    } else if (!currentMaterial.itemName) {
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
          const accountingType =
            currentMaterial.warehouse === '其他' && currentMaterial.itemName === '加工費'
              ? 'processing_fee'
              : undefined;
          const updatedMaterial = {
            ...material,
            ...currentMaterial,
            warehouseInventory: isVirtualWh
              ? undefined
              : currentMaterial.warehouseInventory,
            key: material.key || editingMaterialKey,
            _id: material._id,
            accountingType,
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
        key: Date.now(),
        warehouseInventory: isVirtualWh ? undefined : currentMaterial.warehouseInventory,
        accountingType:
          currentMaterial.warehouse === '其他' && currentMaterial.itemName === '加工費'
            ? 'processing_fee'
            : undefined,
      };
      updatedMaterials = [...materials, newMaterial];
    }

    // 確保創建新的數組引用，強制 React 重新渲染
    setMaterials([...updatedMaterials]);
    form.setFieldsValue({ materials: updatedMaterials });

    // 重置當前材料
    setCurrentMaterial({
      warehouse: '',
      warehouseInventory: undefined,
      itemName: '',
      quantity: 1,
      unitPrice: 0,
      price: 0,
      stockOnHand: null,
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
      render: (text) => renderMultilineText(text),
    },
    {
      title: translate('Quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: '10%',
    },
    {
      title: '單位',
      dataIndex: 'unit',
      key: 'unit',
      width: '8%',
      render: (unit) => unit || 'JOB',
    },
    {
      title: '',
      key: 'action',
      width: '7%',
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
      render: (warehouse) => formatMaterialWarehouseLabel(warehouse, warehouseOptions),
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
      render: (price) => {
        const amount = price ?? 0;
        if (amount < 0) {
          return <span style={{ color: '#ff4d4f' }}>{moneyFormatter({ amount })}</span>;
        }
        return moneyFormatter({ amount });
      },
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
            rules={[{ required: true, message: '請選擇供應商' }]}
          >
            <Select
              placeholder={translate('suppliers')}
              showSearch
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
                { value: 'IP', label: 'IP' },
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
                message: '請輸入編號',
              },
            ]}
            extra={
              !current ? (
                <span>
                  預設為系統建議編號，可直接修改。
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, height: 'auto', marginLeft: 4 }}
                    onClick={() => applySuggestedNumber()}
                  >
                    使用建議編號
                  </Button>
                </span>
              ) : null
            }
          >
            <Input
              style={{ width: '100%' }}
              placeholder="可手動輸入編號"
              onChange={() => {
                if (!current) numberManuallyEditedRef.current = true;
              }}
            />
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
      </Row>

      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={8}>
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
              options={SERVICE_TYPE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: `${opt.label} (${opt.accountCode})`,
              }))}
            />
          </Form.Item>
        </Col>

        <Col className="gutter-row" span={8}>
          <Form.Item
            label={translate('status')}
            name="status"
            rules={[
              {
                required: false,
              },
            ]}
            initialValue="accepted"
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

        <Col className="gutter-row" span={8}>
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
                  { value: '租賃', label: '租賃' },
                ]}
              />
            </Form.Item>
          ) : null}
        </Col>
      </Row>

      <Row gutter={[12, 0]}>
        {selectedType === '吊船' ? (
          <>
            <Col className="gutter-row" span={6}>
              <Form.Item
                name="date"
                label="上單日期"
                rules={[
                  {
                    required: true,
                    type: 'object',
                  },
                ]}
                initialValue={current?.date ? dayjs(current.date) : dayjs()}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format={dateFormat}
                />
              </Form.Item>
            </Col>
            <Col className="gutter-row" span={6}>
              <Form.Item
                name="openDate"
                label="出貨日期"
                rules={[
                  { required: true, message: '請選擇出貨日期' },
                  { type: 'object', message: '請選擇出貨日期' },
                ]}
                initialValue={current?.openDate ? dayjs(current.openDate) : undefined}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format={dateFormat}
                  placeholder="請選擇出貨日期"
                />
              </Form.Item>
            </Col>
            <Col className="gutter-row" span={6}>
              <Form.Item name="renewalQuoteNumber" label="續租報價編號" rules={[{ required: false }]}>
                <Input placeholder="續租報價編號" />
              </Form.Item>
            </Col>
          </>
        ) : (
          <>
            <Col className="gutter-row" span={12}>
              <Form.Item
                name="date"
                label="上單日期"
                rules={[
                  {
                    required: true,
                    type: 'object',
                  },
                ]}
                initialValue={current?.date ? dayjs(current.date) : dayjs()}
              >
                <DatePicker style={{ width: '100%' }} format={dateFormat} />
              </Form.Item>
            </Col>
            <Col className="gutter-row" span={12}>
              <Form.Item
                name="openDate"
                label="出貨日期"
                rules={[
                  { required: true, message: '請選擇出貨日期' },
                  { type: 'object', message: '請選擇出貨日期' },
                ]}
                initialValue={current?.openDate ? dayjs(current.openDate) : undefined}
              >
                <DatePicker style={{ width: '100%' }} format={dateFormat} placeholder="請選擇出貨日期" />
              </Form.Item>
            </Col>
          </>
        )}
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
          <Form.Item label="供應商 Invoice Number" name="counterpartyInvoiceNumber">
            <Input placeholder="供應商 Invoice Number（選填）" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[12, 0]} align="top">
        <Col className="gutter-row" span={12}>
          <Form.Item label="簽收單聯絡人" name="contactPerson">
            <ContactPersonAutoComplete
              clientIds={watchedClients}
              clientRecords={clientRecords}
              placeholder="從已選客戶聯絡人選擇或手動輸入"
            />
          </Form.Item>
        </Col>
        <Col className="gutter-row" span={12}>
          <Form.Item label="簽收單顯示名稱" name="receiptDisplayName">
            <Input placeholder="簽收單 PDF 上顯示的收件人名稱（留空則使用客戶名稱）" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={24}>
          <Form.Item label="簽收單送貨地址" name="receiver">
            <Input.TextArea
              placeholder="顯示於 S 單 PDF「TO」下方之送貨地址（可多行）"
              rows={3}
              autoSize={{ minRows: 2, maxRows: 10 }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={24}>
          <Form.Item label="備註" name="notes">
            <Input.TextArea
              placeholder="簽收單備註（選填）"
              rows={3}
              autoSize={{ minRows: 2, maxRows: 10 }}
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={24}>
          <Form.Item label="裝箱方式" name="packingMethod">
            <Input placeholder="顯示於 S 單 PDF 簽收區「裝箱方式」（選填）" />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={24}>
          <Form.Item label={translate('Project Address')} name="address">
            <Input />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left">文件上傳</Divider>
      
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={12}>
          <Form.Item label="DN文件" name="dmFiles">
            <Upload
              multiple
              beforeUpload={beforeUpload}
              onChange={handleDmFileChange}
              fileList={dmFileList}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            >
              <Button icon={<UploadOutlined />}>選擇DN文件</Button>
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
        <Col span={12}>
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
          <InputNumber 
            placeholder="數量"
            min={1}
            value={currentItem.quantity}
            onChange={(value) => updateCurrentItem('quantity', value)}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={2}>
          <Select
            placeholder="單位"
            value={currentItem.unit}
            onChange={(value) => updateCurrentItem('unit', value)}
            showSearch
            allowClear
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={itemUnitOptions}
            style={{ width: '100%' }}
            notFoundContent="請到 Settings 新增單位"
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

      <Divider orientation="left">材料及費用管理</Divider>

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
              ...(warehouseOptions || []),
              { value: XINGCHENG_FACTORY_WAREHOUSE, label: XINGCHENG_FACTORY_WAREHOUSE },
              { value: '其他', label: '其他' },
            ]}
          />
        </Col>
        <Col span={8}>
          {isVirtualMaterialWarehouse(currentMaterial.warehouse) ? (
            <AutoComplete
              placeholder="輸入或選擇項目名稱..."
              onSearch={handleMaterialSearch}
              onSelect={handleOtherMaterialSelect}
              value={currentMaterial.itemName}
              onChange={(v) => updateCurrentMaterial('itemName', v)}
              loading={materialsLoading}
              showSearch
              filterOption={false}
              options={handleMaterialSearch('')}
              style={{ width: '100%' }}
            />
          ) : (
            <Select
              placeholder={
                currentMaterial.warehouse
                  ? '搜尋貨品名稱或貨品編號…'
                  : '請先選倉庫'
              }
              loading={materialsLoading}
              value={
                currentMaterial.warehouseInventory
                  ? String(currentMaterial.warehouseInventory)
                  : undefined
              }
              onChange={(invId) => {
                if (!invId) {
                  setCurrentMaterial((prev) => ({
                    ...prev,
                    warehouseInventory: undefined,
                    itemName: '',
                    unitPrice: 0,
                    price: 0,
                    stockOnHand: null,
                  }));
                  return;
                }
                const item =
                  warehouseItems.find((w) => String(w._id) === String(invId)) ||
                  warehouseSelectList.find((w) => String(w._id) === String(invId));
                if (!item) return;
                const quantity = currentMaterial.quantity || 1;
                const up = item.unitPrice || 0;
                const totalPrice = calculate.multiply(quantity, up);
                setCurrentMaterial((prev) => ({
                  ...prev,
                  warehouseInventory: String(item._id),
                  itemName: item.itemName,
                  warehouse: item.warehouse,
                  unitPrice: up,
                  price: Number.parseFloat(totalPrice.toFixed(2)),
                  stockOnHand: item.quantity,
                }));
              }}
              showSearch
              allowClear
              disabled={!currentMaterial.warehouse}
              filterOption={(input, option) => {
                const q = (input || '').trim().toLowerCase();
                if (!q) return true;
                const label = (option?.label ?? '').toLowerCase();
                const sku = (option?.sku ?? '').toLowerCase();
                const name = (option?.itemName ?? '').toLowerCase();
                return label.includes(q) || sku.includes(q) || name.includes(q);
              }}
              onSearch={(text) => searchWarehouseItemsForSelect(currentMaterial.warehouse, text)}
              onDropdownVisibleChange={(open) => {
                if (open) {
                  setWarehouseSelectList(warehouseItems);
                }
              }}
              options={warehouseSelectList.map((item) => ({
                value: String(item._id),
                label: getWarehouseItemOptionLabel(item),
                sku: item.sku || '',
                itemName: item.itemName || '',
              }))}
              style={{ width: '100%' }}
            />
          )}
        </Col>
        <Col span={3}>
          <InputNumber
            placeholder="數量（正=加，負=減）"
            step={0.01}
            precision={2}
            min={undefined}
            max={
              isRealWarehouseMaterial(currentMaterial) &&
              Number(currentMaterial.quantity) > 0 &&
              maxOutboundForCurrentMaterial != null
                ? maxOutboundForCurrentMaterial
                : undefined
            }
            value={currentMaterial.quantity}
            onChange={(value) => updateCurrentMaterial('quantity', value)}
            style={{ width: '100%' }}
          />
          {isRealWarehouseMaterial(currentMaterial) &&
            currentMaterial.warehouseInventory &&
            maxOutboundForCurrentMaterial != null && (
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                可用庫存：{maxOutboundForCurrentMaterial}
              </div>
            )}
        </Col>
        <Col span={3}>
          <InputNumber
            placeholder="總價（正=加，負=減）"
            step={0.01}
            precision={2}
            value={currentMaterial.price}
            onChange={(value) => {
              // 當用戶修改總價時，反向計算單價（支援負數）
              const quantity = currentMaterial.quantity;
              const unitPrice = (quantity && quantity !== 0) ? (value || 0) / quantity : (value || 0);
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
            disabled={!currentMaterial.itemName || !currentMaterial.warehouse || currentMaterial.quantity === null || currentMaterial.quantity === undefined || currentMaterial.quantity === 0}
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

      <Divider orientation="left">船隻管理</Divider>

      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col span={24}>
          <Button type="dashed" icon={<PlusOutlined />} onClick={addShipRow}>
            添加船隻
          </Button>
        </Col>
      </Row>

      <Table
        dataSource={shipRows}
        pagination={false}
        size="small"
        rowKey="key"
        locale={{ emptyText: '未添加船隻' }}
        style={{ marginBottom: 24 }}
        columns={[
          {
            title: '船隻',
            key: 'ship',
            width: '18%',
            render: (_, record) => (
              <Select
                placeholder="選擇船隻"
                value={record.ship || undefined}
                disabled={!!record.dismantlingDate}
                style={{ width: '100%' }}
                loading={shipsLoading}
                showSearch
                allowClear
                filterOption={(input, option) =>
                  (option?.label || '').toLowerCase().includes(input.toLowerCase())
                }
                options={ships.filter((opt) => isShipOptionSelectableForRow(opt, record, shipRows))}
                onChange={(value) => updateShipRow(record.key, { ship: value || null })}
              />
            ),
          },
          {
            title: '安裝日期',
            key: 'installationDate',
            width: '16%',
            render: (_, record) => (
              <DatePicker
                style={{ width: '100%' }}
                format={dateFormat}
                placeholder="安裝日期"
                value={record.installationDate}
                disabled={!record.ship}
                onChange={(value) => updateShipRow(record.key, { installationDate: value || null })}
              />
            ),
          },
          {
            title: '租賃到期日',
            key: 'expiredDate',
            width: '16%',
            render: (_, record) => (
              <DatePicker
                style={{ width: '100%' }}
                format={dateFormat}
                placeholder="租賃到期日"
                value={record.expiredDate}
                disabled={!record.ship}
                onChange={(value) => updateShipRow(record.key, { expiredDate: value || null })}
              />
            ),
          },
          {
            title: '拆卸日期',
            key: 'dismantlingDate',
            width: '16%',
            render: (_, record) => (
              <DatePicker
                style={{ width: '100%' }}
                format={dateFormat}
                placeholder="拆卸日期"
                value={record.dismantlingDate}
                disabled={!record.ship}
                onChange={(value) => updateShipRow(record.key, { dismantlingDate: value || null })}
              />
            ),
          },
          {
            title: '超租天數',
            key: 'overage',
            width: '12%',
            render: (_, record) =>
              record.ship
                ? calcRentalOverageLabel(record.expiredDate, record.dismantlingDate)
                : '—',
          },
          {
            title: '操作',
            key: 'action',
            width: '10%',
            render: (_, record) => (
              <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeShipRow(record.key)}>
                刪除
              </Button>
            ),
          },
        ]}
      />

      <Divider orientation="left">爬纜器管理</Divider>

      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col span={24}>
          <Button type="dashed" icon={<PlusOutlined />} onClick={addWinchRow}>
            添加爬纜器
          </Button>
        </Col>
      </Row>

      <Table
        dataSource={winchRows}
        pagination={false}
        size="small"
        rowKey="key"
        locale={{ emptyText: '未添加爬纜器' }}
        style={{ marginBottom: 12 }}
        columns={[
          {
            title: '爬纜器',
            key: 'winch',
            width: '18%',
            render: (_, record) => (
              <Select
                placeholder="選擇爬纜器"
                value={record.winch || undefined}
                disabled={!!record.dismantlingDate}
                style={{ width: '100%' }}
                loading={winchesLoading}
                showSearch
                allowClear
                filterOption={(input, option) =>
                  (option?.label || '').toLowerCase().includes(input.toLowerCase())
                }
                options={winches.filter((opt) => isWinchOptionSelectableForRow(opt, record, winchRows))}
                onChange={(value) => updateWinchRow(record.key, { winch: value || null })}
              />
            ),
          },
          {
            title: '安裝日期',
            key: 'installationDate',
            width: '16%',
            render: (_, record) => (
              <DatePicker
                style={{ width: '100%' }}
                format={dateFormat}
                placeholder="安裝日期"
                value={record.installationDate}
                disabled={!record.winch}
                onChange={(value) => updateWinchRow(record.key, { installationDate: value || null })}
              />
            ),
          },
          {
            title: '租賃到期日',
            key: 'expiredDate',
            width: '16%',
            render: (_, record) => (
              <DatePicker
                style={{ width: '100%' }}
                format={dateFormat}
                placeholder="租賃到期日"
                value={record.expiredDate}
                disabled={!record.winch}
                onChange={(value) => updateWinchRow(record.key, { expiredDate: value || null })}
              />
            ),
          },
          {
            title: '拆卸日期',
            key: 'dismantlingDate',
            width: '16%',
            render: (_, record) => (
              <DatePicker
                style={{ width: '100%' }}
                format={dateFormat}
                placeholder="拆卸日期"
                value={record.dismantlingDate}
                disabled={!record.winch}
                onChange={(value) => updateWinchRow(record.key, { dismantlingDate: value || null })}
              />
            ),
          },
          {
            title: '超租天數',
            key: 'overage',
            width: '12%',
            render: (_, record) =>
              record.winch
                ? calcRentalOverageLabel(record.expiredDate, record.dismantlingDate)
                : '—',
          },
          {
            title: '操作',
            key: 'action',
            width: '10%',
            render: (_, record) => (
              <Button type="link" danger icon={<DeleteOutlined />} onClick={() => removeWinchRow(record.key)}>
                刪除
              </Button>
            ),
          },
        ]}
      />

      {(shipRows.some((row) => row.dismantlingDate) || winchRows.some((row) => row.dismantlingDate)) && (
        <div style={{ marginBottom: 16, fontSize: 12, color: '#888' }}>
          填寫拆卸日期後，對應船隻／爬纜器將斷開連接並轉為「待回廠」，S 單仍保留此筆記錄；已拆卸的項目不可更換資產，但安裝／租賃到期／拆卸日期仍可修改。
        </div>
      )}

      {/* Hidden Form Items for submission */}
      <Form.Item name="items" style={{ display: 'none' }}>
        <Input />
      </Form.Item>
      <Form.Item
        name="materials"
        style={{ display: 'none' }}
        rules={[
          {
            validator: async () => {
              const check = await validateSupplierQuoteMaterialsStock({
                materials,
                originalMaterials: originalMaterialsRef.current,
              });
              if (!check.ok) {
                message.error(check.message);
                throw new Error(check.message);
              }
            },
          },
        ]}
      >
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
      <Form.Item name="shipAssignments" style={{ display: 'none' }}>
        <Input />
      </Form.Item>
      <Form.Item name="winchAssignments" style={{ display: 'none' }}>
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
            <Form.Item name="subTotal">
              <InputNumber
                className="moneyInput"
                precision={cent_precision ?? 2}
                controls={false}
                addonAfter={currency_position === 'after' ? currency_symbol : undefined}
                addonBefore={currency_position === 'before' ? currency_symbol : undefined}
                formatter={(value) => amountFormatter({ amount: value, currency_code })}
                style={{ width: '100%' }}
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
              {translate('Discount')} (%) :
            </p>
          </Col>
          <Col className="gutter-row" span={4}>
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
          <DiscountPercentPdfCheckboxCol />
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
          <Col className="gutter-row" span={4}>
            <Form.Item name="discountTotal" hidden>
              <InputNumber />
            </Form.Item>
            <MoneyInputFormItem readOnly value={discountTotal} />
          </Col>
          <DiscountAmountPdfCheckboxCol />
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
            <Form.Item name="total">
              <InputNumber
                className="moneyInput"
                precision={cent_precision ?? 2}
                controls={false}
                addonAfter={currency_position === 'after' ? currency_symbol : undefined}
                addonBefore={currency_position === 'before' ? currency_symbol : undefined}
                formatter={(value) => amountFormatter({ amount: value, currency_code })}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
      </div>
    </>
  );
}
