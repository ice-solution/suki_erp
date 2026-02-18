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
      { value: 'normal', label: '正常', color: 'green' },
      { value: 'returned_warehouse_hk', label: '回倉(表衣)', color: 'orange' },
      { value: 'returned_warehouse_cn', label: '回倉(內地)', color: 'orange' },
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







