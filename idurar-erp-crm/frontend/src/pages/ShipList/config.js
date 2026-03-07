export const fields = {
  registrationNumber: {
    type: 'string',
    required: true,
    show: true,
    label: '登記號碼',
  },
  status: {
    type: 'select',
    required: false,
    show: true,
    renderAsTag: true,
    options: [
      { value: 'pending_maintenance', label: '待保養', color: 'orange' },
      { value: 'normal', label: '正常', color: 'green' },
      { value: 'returned_warehouse_cn', label: '待回廠', color: 'orange' },
      { value: 'returned_warehouse_hk', label: '香港倉', color: 'orange' },
      { value: 'in_use', label: '使用中', color: 'blue' },
    ],
  },
  supplierNumber: {
    type: 'string',
    required: false,
    show: true,
    label: 'Supplier Quote Number',
    conditionalShow: {
      field: 'status',
      value: 'in_use',
    },
  },
  description: {
    type: 'string',
    show: true,
  },
};







