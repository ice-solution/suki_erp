import { useState, useEffect } from 'react';
import { Select } from 'antd';
import { request } from '@/request';

/**
 * 通用的多選異步組件
 * 解決多選字段在編輯時不顯示名稱的問題
 */
export default function MultiSelectAsync({
  entity,
  value = [],
  onChange,
  placeholder = "請選擇",
  disabled = false,
  style = { width: '100%' },
  mode = "multiple",
  allowClear = true,
  showSearch = true,
  currentData = null, // 當前編輯的數據，包含已選項的完整信息
  fieldName = null,   // 在currentData中對應的字段名
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // 獲取選項列表
  const fetchOptions = async () => {
    try {
      setLoading(true);
      const response = await request.listAll({ entity });
      
      const data = response?.result;
      if (Array.isArray(data)) {
        const optionsList = data.map(item => ({
          value: item._id,
          label: item.name,
        }));
        setOptions(optionsList);
      } else {
        setOptions([]);
      }
    } catch (error) {
      console.error(`獲取${entity}列表失敗:`, error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  // 初始載入選項
  useEffect(() => {
    fetchOptions();
  }, [entity]);

  // 處理現有數據，確保已選項的名稱能正確顯示
  useEffect(() => {
    if (currentData && fieldName && currentData[fieldName] && Array.isArray(currentData[fieldName]) && options.length > 0) {
      const existingItems = currentData[fieldName];
      const itemsToAdd = [];
      
      existingItems.forEach(item => {
        if (item && item._id && item.name) {
          const exists = options.some(opt => opt.value === item._id);
          if (!exists) {
            itemsToAdd.push({
              value: item._id,
              label: item.name
            });
          }
        }
      });
      
      if (itemsToAdd.length > 0) {
        setOptions(prevOptions => {
          const existingIds = prevOptions.map(opt => opt.value);
          const newOptions = itemsToAdd.filter(item => !existingIds.includes(item.value));
          return [...prevOptions, ...newOptions];
        });
      }
    }
  }, [currentData, fieldName, options.length]);

  const filterOption = (input, option) => {
    return option?.label?.toLowerCase().indexOf(input.toLowerCase()) >= 0;
  };

  return (
    <Select
      mode={mode}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      options={options}
      loading={loading}
      disabled={disabled}
      style={style}
      allowClear={allowClear}
      showSearch={showSearch}
      filterOption={filterOption}
      notFoundContent={loading ? "載入中..." : `無${entity}資料`}
    />
  );
}
