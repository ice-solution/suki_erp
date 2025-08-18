// 測試選單功能
console.log('=== 選單功能測試 ===');

// 檢查新增的選單項目
const menuItems = [
  {
    name: '承辦商管理',
    path: '/contractor',
    children: [
      { name: '承辦商列表', path: '/contractor' },
      { name: '承辦商員工', path: '/contractor-employee' }
    ]
  },
  {
    name: '項目管理',
    path: '/project'
  },
  {
    name: '工程項目',
    path: '/project-items'
  }
];

console.log('新增的選單項目:');
menuItems.forEach(item => {
  console.log(`- ${item.name}: ${item.path}`);
  if (item.children) {
    item.children.forEach(child => {
      console.log(`  └─ ${child.name}: ${child.path}`);
    });
  }
});

console.log('\n=== 選單測試完成 ===');
console.log('請在瀏覽器中訪問以下頁面來測試:');
console.log('- http://localhost:3000/contractor');
console.log('- http://localhost:3000/contractor-employee');
console.log('- http://localhost:3000/project');
console.log('- http://localhost:3000/project-items'); 