import { createSelector } from 'reselect';

const selectCrud = (state) => state.crud;

export const selectCurrentItem = createSelector([selectCrud], (crud) => crud.current);

export const selectListItems = createSelector(
  [selectCrud],
  (crud) => {
    // 為了向後兼容，如果 list 是舊格式（直接是對象），返回它
    if (crud.list && crud.list.result) {
      return crud.list;
    }
    // 如果是新格式（按 entity 分離），返回一個默認值或空對象
    // 實際使用時應該使用 selectListItemsByEntity
    return {
      result: {
        items: [],
        pagination: { current: 1, pageSize: 10, total: 0, showSizeChanger: false },
      },
      isLoading: false,
      isSuccess: false,
    };
  }
);

// 新的 selector，按 entity 選擇 list state
export const selectListItemsByEntity = (entity) =>
  createSelector([selectCrud], (crud) => {
    if (crud.list && crud.list[entity]) {
      return crud.list[entity];
    }
    // 返回初始狀態
    return {
      result: {
        items: [],
        pagination: { current: 1, pageSize: 10, total: 0, showSizeChanger: false },
      },
      isLoading: false,
      isSuccess: false,
    };
  });
export const selectItemById = (itemId) =>
  createSelector(selectListItems, (list) => list.result.items.find((item) => item._id === itemId));

export const selectCreatedItem = createSelector([selectCrud], (crud) => crud.create);

export const selectUpdatedItem = createSelector([selectCrud], (crud) => crud.update);

export const selectReadItem = createSelector([selectCrud], (crud) => crud.read);

export const selectDeletedItem = createSelector([selectCrud], (crud) => crud.delete);

export const selectSearchedItems = createSelector([selectCrud], (crud) => crud.search);
