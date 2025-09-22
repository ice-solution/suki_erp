import { ErpLayout } from '@/layout';
import ErpPanel from '@/modules/ErpPanelModule';

export default function ProjectItemPage() {
  const entity = 'projectitem';
  const searchConfig = {
    displayLabels: ['itemName'],
    searchFields: 'itemName,description',
    outputValue: '_id',
  };

  const entityDisplayLabels = ['itemName'];

  const dataTableColumns = [
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
      title: '價格',
      dataIndex: 'price',
      key: 'price',
      render: (price) => `$${price}`,
    },
    {
      title: '單位',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: '分類',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: '常用',
      dataIndex: 'isFrequent',
      key: 'isFrequent',
      render: (isFrequent) => isFrequent ? '✅' : '❌',
    },
  ];

  const ADD_NEW_ENTITY = 'Add new project item';
  const DATATABLE_TITLE = 'Project Items List';
  const ENTITY_NAME = 'Project Item';
  const CREATE_ENTITY = 'Create Project Item';
  const UPDATE_ENTITY = 'Update Project Item';

  const config = {
    entity,
    ENTITY_NAME,
    CREATE_ENTITY,
    ADD_NEW_ENTITY,
    UPDATE_ENTITY,
    DATATABLE_TITLE,
    dataTableColumns,
    searchConfig,
    entityDisplayLabels,
  };

  return (
    <ErpLayout>
      <ErpPanel config={config} />
    </ErpLayout>
  );
}
